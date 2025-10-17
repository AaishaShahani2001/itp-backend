import express from "express";
import mongoose from "mongoose";
import GroomingAppointment from "../models/GroomingModel.js";
import { notifyStatusChange } from "../services/notify.js";
import User from "../models/User.js";
import authUser from "../middleware/authUser.js";


const router = express.Router();

const ALLOWED = new Set(["pending", "accepted", "rejected", "cancelled"]);

function toHHMM(m) {
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
}

/* ---------- GET /api/grooming/appointments?date=YYYY-MM-DD ---------- */
/* Returns an array of {id,date,start,end,title,service} for the calendar */
// GET /api/grooming/appointments?date=YYYY-MM-DD
router.get("/appointments", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.json([]);

    //  `status` (preferred): pending | accepted | rejected | cancelled
    // Filter out rejected/cancelled at the DB level
    const rows = await GroomingAppointment.find({ dateISO: date })
  .sort({ timeSlotMinutes: 1 })
  .lean();

const filtered = rows.filter(
  (r) => !["rejected", "cancelled"].includes(String(r.status || r.state || "").toLowerCase())
);

const items = filtered.map((a) => ({
  id: String(a._id),
  String: a.dateISO,
  start: toHHMM(a.timeSlotMinutes),
  end: toHHMM((a.timeSlotMinutes || 0) + (a.durationMin || 60)),
  title: `${a.petType} • ${a.packageName || "Grooming"}`,
  service: "grooming",
  status: a.status || a.state || "pending",
}));

    res.json(items);
  } catch (err) {
    next(err);
  }
});


// POST -> Create appointment for Grooming
router.post("/appointments", authUser, async (req, res) => {
  try {
    const {id} = req.user;
    const { ownerName, phone, email, petType, packageId, dateISO, timeSlotMinutes, notes, } = req.body;

    if ( !ownerName || !phone || !email || !petType || !packageId || !dateISO || timeSlotMinutes === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // prevent double-booking the same slot
    const exists = await GroomingAppointment.findOne({
      dateISO,
      timeSlotMinutes: Number(timeSlotMinutes),
    });
    if (exists) {
      return res.status(409).json({ error: "That time slot is already booked." });
    }

    const doc = await GroomingAppointment.create({
      ownerName,
      user: id,
      phone,
      email,
      petType,
      packageId,
      dateISO,
      timeSlotMinutes: Number(timeSlotMinutes),
      notes: notes?.trim() || "",
    });
    await doc.save();

    res.status(201).json({ ok: true, id: String(doc._id), message: "Appointment created" });

  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "That time slot is already booked." });
    }
  }
});

// GET /api/grooming/ → all appointments (latest first)
router.get("/", authUser, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      console.log("User ID missing, req.user:", req.user);
      return res
        .status(400)
        .json({ success: false, message: "User ID is missing" });
    }

    const list = await GroomingAppointment.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/grooming/ → all appointments (latest first)
router.get("/all", async (req, res, next) => {
  try {
    const list = await GroomingAppointment.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/grooming/:id → single appointment
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await GroomingAppointment.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Appointment not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// PUT /api/grooming/:id → update
router.put("/:id", async (req, res, next) => {
  try {
    const updated = await GroomingAppointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Appointment not found" });
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});


// DELETE /api/grooming/:id → delete
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await GroomingAppointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Appointment not found" });
    res.json({ ok: true, message: "Appointment deleted" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/grooming/:id/status → accept / reject / pending / cancelled
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid appointment id" });
    }

    const { status, rejectionReason = "", caretakerName = "Caretaker" } = req.body || {};
    if (!ALLOWED.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // build minimal update
    const $set = {
      status,
      caretakerName,
      ...(status === "rejected" ? { rejectionReason: rejectionReason.trim() } : { rejectionReason: undefined }),
    };

    // IMPORTANT: avoid triggering required validators on legacy docs (missing user)
    const prev = await GroomingAppointment.findById(id, { status: 1 }).lean();
    if (!prev) return res.status(404).json({ error: "Appointment not found" });

    const updated = await GroomingAppointment.findByIdAndUpdate(
      id,
      { $set },
      { new: true, runValidators: false } // <- key change
    ).lean();

    res.json({ ok: true, data: updated });

    // Website notifications are now handled through the Notification model
    // No external SMS/email notifications needed
  } catch (e) {
    next(e);
  }
});




export default router