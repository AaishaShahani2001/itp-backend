import express from "express";
import mongoose from "mongoose";
import DayCareAppointment from "../models/DayCareModel.js";
import { notifyStatusChange } from "../services/notify.js";
import authUser from "../middleware/authUser.js";

const router = express.Router();

/* ------------------------------- helpers ------------------------------- */
function toHHMM(m = 0) {
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
}
const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function assertDateISO(ymd) {
  if (!DATE_YYYY_MM_DD.test(String(ymd || ""))) {
    const err = new Error("Invalid date format. Use YYYY-MM-DD.");
    err.status = 400;
    throw err;
  }
}

/* -------- GET /api/daycare/appointments?date=YYYY-MM-DD (calendar feed) -------- */
router.get("/appointments", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.json([]);
    assertDateISO(date);

    const rows = await DayCareAppointment.find({
      dateISO: date,
      status: { $nin: ["rejected", "cancelled"] },
    })
      .sort({ dropOffMinutes: 1 })
      .select("dateISO dropOffMinutes pickUpMinutes petType packageName packageId status")
      .lean();

    const items = rows.map((a) => ({
      id: String(a._id),
      date: a.dateISO,
      start: toHHMM(a.dropOffMinutes),
      end: toHHMM(a.pickUpMinutes ?? (a.dropOffMinutes != null ? a.dropOffMinutes + 60 : 60)),
      title: `${a.petType || "Pet"} • ${a.packageName || a.packageId || "Daycare"}`,
      service: "daycare",
      status: a.status || "pending",
    }));

    res.json(items);
  } catch (err) {
    next(err);
  }
});

/* --------------------- POST /api/daycare/appointments (create) --------------------- */
router.post("/appointments", authUser, async (req, res, next) => {
  try {
    const {id} = req.user;
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      emergencyPhone,
      petType,
      petName,
      packageId,
      dateISO,
      dropOffMinutes,
      pickUpMinutes,
      notes,
    } = req.body;

    if (
      !ownerName ||
      !ownerEmail ||
      !ownerPhone ||
      !petType ||
      !petName ||
      !packageId ||
      !dateISO ||
      dropOffMinutes == null ||
      pickUpMinutes == null
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    //keep dateISO as plain string
    assertDateISO(dateISO);

    const drop = Number(dropOffMinutes);
    const pick = Number(pickUpMinutes);
    if (!Number.isFinite(drop) || !Number.isFinite(pick)) {
      return res.status(400).json({ message: "Invalid dropOffMinutes/pickUpMinutes" });
    }
    if (pick <= drop) {
      return res.status(400).json({ message: "pickUpMinutes must be after dropOffMinutes" });
    }

    // Overlap check: (existing.start < new.end) AND (existing.end > new.start)
    const conflict = await DayCareAppointment.findOne({
      dateISO,
      dropOffMinutes: { $lt: pick },
      pickUpMinutes: { $gt: drop },
    }).lean();
    if (conflict) {
      return res.status(409).json({ message: "Overlaps another booking." });
    }

    const doc = await DayCareAppointment.create({
      ownerName,
      user: id,
      ownerEmail,
      ownerPhone,
      emergencyPhone,
      petType,
      petName,
      packageId,
      dateISO,                // stored as literal "YYYY-MM-DD"
      dropOffMinutes: drop,
      pickUpMinutes: pick,
      notes,
    });

    res.status(201).json({ ok: true, id: doc._id, message: "Daycare booking created" });
  } catch (err) {
    next(err);
  }
});

/* ---------------------- GET /api/daycare (all bookings) ---------------------- */
router.get("/", authUser, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.log("User ID missing, req.user:", req.user);
      return res
        .status(400)
        .json({ success: false, message: "User ID is missing" });
    }

    const list = await DayCareAppointment.find({ user: userId }).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/* ---------------------- GET /api/daycare (all bookings) ---------------------- */
router.get("/all", async (req, res, next) => {
  try {
    const list = await DayCareAppointment.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/* ------------------- GET /api/daycare/:id (single appointment) ------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await DayCareAppointment.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Appointment not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

/* ---------------- PUT /api/daycare/:id (update with overlap check) ---------------- */
router.put("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const current = await DayCareAppointment.findById(id);
    if (!current) return res.status(404).json({ message: "Daycare booking not found" });

    const nextDateISO = req.body.dateISO ?? current.dateISO;
    assertDateISO(nextDateISO);

    const nextDrop =
      req.body.dropOffMinutes != null ? Number(req.body.dropOffMinutes) : current.dropOffMinutes;
    const nextPick =
      req.body.pickUpMinutes != null ? Number(req.body.pickUpMinutes) : current.pickUpMinutes;

    if (!Number.isFinite(nextDrop) || !Number.isFinite(nextPick)) {
      return res.status(400).json({ message: "Invalid dropOffMinutes/pickUpMinutes" });
    }
    if (nextPick <= nextDrop) {
      return res.status(400).json({ message: "pickUpMinutes must be after dropOffMinutes" });
    }

    // Overlap check against other bookings on same day
    const conflict = await DayCareAppointment.findOne({
      _id: { $ne: id },
      dateISO: nextDateISO,
      dropOffMinutes: { $lt: nextPick },
      pickUpMinutes: { $gt: nextDrop },
    }).lean();

    if (conflict) {
      return res.status(409).json({ message: "Overlaps another booking." });
    }

    const update = {
      ...req.body,
      dateISO: nextDateISO, 
      dropOffMinutes: nextDrop,
      pickUpMinutes: nextPick,
    };

    const updated = await DayCareAppointment.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    res.json({ ok: true, message: "Daycare booking updated", item: updated });
  } catch (err) {
    next(err);
  }
});

/* ----------------------- DELETE /api/daycare/:id (delete) ----------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const gone = await DayCareAppointment.findByIdAndDelete(req.params.id);
    if (!gone) return res.status(404).json({ message: "Daycare booking not found" });
    res.json({ ok: true, message: "Daycare booking deleted" });
  } catch (err) {
    next(err);
  }
});

/* ------------------- PATCH /api/daycare/:id/status (state + notify) ------------------- */
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid appointment id" });
    }

    const { status, rejectionReason = "", caretakerName = "Caretaker" } = req.body || {};
    const ALLOWED = new Set(["pending", "accepted", "rejected", "cancelled"]);
    if (!ALLOWED.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Get previous status without triggering validators
    const prev = await DayCareAppointment.findById(id, { status: 1 }).lean();
    if (!prev) return res.status(404).json({ message: "Not found" });

    const $set = {
      status,
      caretakerName,
      ...(status === "rejected"
        ? { rejectionReason: String(rejectionReason || "").trim() }
        : { rejectionReason: undefined }),
    };

    // IMPORTANT: avoid unrelated validation (legacy docs may miss `user`)
    const updated = await DayCareAppointment.findByIdAndUpdate(
      id,
      { $set },
      { new: true, runValidators: false }
    ).lean();

    res.json({ ok: true, item: updated });

    // Fire SMS asynchronously if status changed to accepted/rejected
    if ((status === "accepted" || status === "rejected") && prev.status !== status) {
      setImmediate(async () => {
        try {
          await notifyStatusChange({
            serviceType: "daycare",
            appt: updated,          // has ownerPhone/ownerName/dateISO/dropOffMinutes/pickUpMinutes
            newStatus: status,
            caretakerName,
          });
        } catch (e) {
          console.error("notifyStatusChange (daycare) error:", e?.message || e);
        }
      });
    }
  } catch (err) {
    next(err);
  }
});



export default router;
