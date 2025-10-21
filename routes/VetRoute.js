// routes/vetRoute.js
import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import VetAppointment from "../models/VetAppointmentModel.js";
import authUser from "../middleware/authUser.js";
import { notifyStatusChange } from "../services/notify.js";
import imageKit from "../configs/imageKit.js";

const router = express.Router();

function getId(req) {
  return (req.params && req.params.id) || (req.query && req.query.id) || "";
}

/* ------------------------------- ID validator ------------------------------- */
const { isValidObjectId } = mongoose;
function assertObjectId(id) {
  if (!isValidObjectId(id)) {
    const err = new Error("Invalid appointment id");
    err.status = 400;
    throw err;
  }
}

/* ------------------------------- Multer setup ------------------------------- */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
  if (!ok) return cb(new Error("Only JPEG, JPG, or PNG is allowed"));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ---------------------- Accept JSON or multipart for PUT --------------------- */
const maybeUpload = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.single("medicalFile")(req, res, next);
  }
  next();
};

/* --------------------------------- Helpers --------------------------------- */
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

/* ------------------- GET /api/vet/appointments (calendar) ------------------- */
/** Returns items for the calendar (filters out rejected/cancelled), now with startMinutes for UI disabling */
router.get("/appointments", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.json([]);

    assertDateISO(date);

    const rows = await VetAppointment.find({ dateISO: date })
      .sort({ timeSlotMinutes: 1 })
      .lean();

    const filtered = rows.filter(
      (r) => !["rejected", "cancelled"].includes(String(r.status || r.state || "").toLowerCase())
    );

    const items = filtered.map((a) => ({
      id: String(a._id),
      date: a.dateISO,
      start: toHHMM(a.timeSlotMinutes),
      end: toHHMM((a.timeSlotMinutes || 0) + (a.durationMin || 30)),
      startMinutes: a.timeSlotMinutes, // <--- added for client to disable taken slots
      service: "vet",
      status: a.status || a.state || "pending",
    }));

    res.json(items);
  } catch (err) {
    next(err);
  }
});

/* ---------------------- POST /api/vet/appointments (create) ---------------------- */
router.post("/appointments", upload.single("medicalFile"), authUser, async (req, res, next) => {
  try {
    const { id } = req.user;
    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      petType,
      petSize,
      reason,
      dateISO,
      timeSlotMinutes,
      notes,
      selectedService,
      selectedPrice,
    } = req.body;

    if (
      !ownerName ||
      !ownerPhone ||
      !ownerEmail ||
      !petType ||
      !petSize ||
      !reason ||
      !dateISO ||
      timeSlotMinutes === undefined
    ) {
      const err = new Error("Missing required fields");
      err.status = 400;
      throw err;
    }

    assertDateISO(dateISO);
    const slot = Number(timeSlotMinutes);
    if (!Number.isFinite(slot)) {
      const err = new Error("Invalid timeSlotMinutes");
      err.status = 400;
      throw err;
    }

    // Conflict check
    const exists = await VetAppointment.findOne({ dateISO, timeSlotMinutes: slot }).lean();
    if (exists) {
      const err = new Error("This time slot is already booked. Please choose another.");
      err.status = 409;
      throw err;
    }

    // Upload to ImageKit (optional)
    let medicalFilePath = undefined;
    if (req.file) {
      try {
        const uploadResponse = await imageKit.upload({
          file: req.file.buffer,
          fileName: req.file.originalname,
          folder: "/medical",
        });

        medicalFilePath = imageKit.url({
          path: uploadResponse.filePath,
          transformation: [{ width: "1280" }, { quality: "80" }],
        });
      } catch (uploadError) {
        const err = new Error("Medical file upload failed");
        err.status = 500;
        throw err;
      }
    }

    // Coerce price if present
    let priceNum = undefined;
    if (typeof selectedPrice !== "undefined" && selectedPrice !== "") {
      priceNum = Number(String(selectedPrice).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(priceNum)) {
        const err = new Error("Invalid selectedPrice");
        err.status = 400;
        throw err;
      }
    }

    const doc = await VetAppointment.create({
      ownerName: ownerName.trim(),
      user: id,
      ownerPhone: ownerPhone.trim(),
      ownerEmail: ownerEmail.trim(),
      petType,
      petSize,
      reason: reason.trim(),
      dateISO,
      timeSlotMinutes: slot,
      selectedService,
      selectedPrice: priceNum,
      notes,
      medicalFilePath,
    });

    res.status(201).json({ ok: true, id: doc._id, message: "Appointment created" });
  } catch (error) {
    if (error?.code === 11000) {
      error.status = 409;
      error.message = "This time slot is already booked. Please choose another.";
    }
    next(error);
  }
});

/* ---------------------------- GET /api/vet/ (my appointments) ---------------------------- */
router.get("/", authUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is missing" });
    }

    const appts = await VetAppointment.find({ user: userId })
      .sort({ dateISO: -1, timeSlotMinutes: -1, createdAt: -1 })
      .lean();
    res.status(200).json(appts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ---------------------------- GET /api/vet/all (all) ---------------------------- */
router.get("/all", async (req, res) => {
  try {
    const appts = await VetAppointment.find()
      .sort({ dateISO: -1, timeSlotMinutes: -1, createdAt: -1 })
      .lean();
    res.status(200).json(appts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/* ----------------------- GET /api/vet/:id (single doc) ----------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const id = getId(req);
    assertObjectId(id);
    const appt = await VetAppointment.findById(id).lean();
    if (!appt) return res.status(404).json({ error: "Appointment not found" });
    res.status(200).json({ ok: true, data: appt });
  } catch (err) {
    next(err);
  }
});

/* -------- PUT /api/vet/:id (multipart-friendly update with conflict check) -------- */
router.put("/:id", maybeUpload, async (req, res, next) => {
  try {
    const id = getId(req);
    assertObjectId(id);
    const existing = await VetAppointment.findById(id);
    if (!existing) return res.status(404).json({ error: "Appointment not found" });

    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      petType,
      petSize,
      reason, // locked
      dateISO,
      timeSlotMinutes,
      notes,
      selectedService,
      selectedPrice,
      status,
    } = req.body;

    // Enforce reason lock
    if (typeof reason === "string" && reason.trim() !== (existing.reason || "").trim()) {
      const err = new Error("Reason cannot be changed after booking. Please create a new booking.");
      err.status = 400;
      throw err;
    }

    const update = {};
    if (typeof ownerName === "string") update.ownerName = ownerName.trim();
    if (typeof ownerPhone === "string") update.ownerPhone = ownerPhone.trim();
    if (typeof ownerEmail === "string") update.ownerEmail = ownerEmail.trim();
    if (typeof petType === "string") update.petType = petType;
    if (typeof petSize === "string") update.petSize = petSize;

    if (typeof dateISO === "string" && dateISO !== "") {
      assertDateISO(dateISO);
      update.dateISO = dateISO;
    }

    if (typeof timeSlotMinutes !== "undefined" && timeSlotMinutes !== "") {
      const slotNum = Number(timeSlotMinutes);
      if (!Number.isFinite(slotNum)) {
        const err = new Error("Invalid timeSlotMinutes");
        err.status = 400;
        throw err;
      }
      update.timeSlotMinutes = slotNum;
    }

    if (typeof notes === "string") update.notes = notes;
    if (typeof selectedService === "string") update.selectedService = selectedService;

    if (typeof selectedPrice !== "undefined" && selectedPrice !== "") {
      const priceNum = Number(String(selectedPrice).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(priceNum)) {
        const err = new Error("Invalid selectedPrice");
        err.status = 400;
        throw err;
      }
      update.selectedPrice = priceNum;
    }

    if (typeof status === "string") {
      const allowed = ["accepted", "rejected", "cancelled", "pending"];
      if (!allowed.includes(status)) {
        const err = new Error("Invalid status");
        err.status = 400;
        throw err;
      }
      update.status = status;
    }

    // Conflict check if date/slot changed
    const wantDate = update.dateISO ?? existing.dateISO;
    const wantSlot =
      typeof update.timeSlotMinutes === "number" ? update.timeSlotMinutes : existing.timeSlotMinutes;

    if (wantDate && typeof wantSlot === "number") {
      const conflict = await VetAppointment.findOne({
        _id: { $ne: existing._id },
        dateISO: wantDate,
        timeSlotMinutes: wantSlot,
      }).lean();
      if (conflict) {
        const err = new Error("This time slot is already booked. Please choose another.");
        err.status = 409;
        throw err;
      }
    }

    // Optional file replace
    if (req.file) {
      try {
        const uploadResponse = await imageKit.upload({
          file: req.file.buffer,
          fileName: req.file.originalname,
          folder: "/medical",
        });

        const newMedicalFilePath = imageKit.url({
          path: uploadResponse.filePath,
          transformation: [{ width: "1280" }, { quality: "80" }],
        });

        update.medicalFilePath = newMedicalFilePath;
      } catch (uploadError) {
        const err = new Error("Medical file update failed");
        err.status = 500;
        throw err;
      }
    }

    const updated = await VetAppointment.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    return res.json({ ok: true, data: updated });
  } catch (err) {
    if (err?.code === 11000) {
      err.status = 409;
      err.message = "This time slot is already booked. Please choose another.";
    }
    next(err);
  }
});

/* --------------------- DELETE /api/vet/:id (hard delete) --------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    assertObjectId(req.params.id);
    const deleted = await VetAppointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Appointment not found" });
    res.status(200).json({ ok: true, message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/* ------------- PATCH /api/vet/:id/status  {status, doctorName?, rejectionReason?} ------------- */
router.patch("/:id/status", async (req, res, next) => {
  try {
    assertObjectId(req.params.id);

    const { status, doctorName, rejectionReason } = req.body || {};
    const allowed = ["accepted", "rejected", "cancelled", "pending"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const update = { status };
    if (status === "rejected") update.rejectionReason = (rejectionReason || "").trim();
    if (doctorName) update.doctorName = String(doctorName).trim();

    const updated = await VetAppointment.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });

    let notify = { ok: false, error: null, to: updated.ownerPhone || updated.phone || null };
    try {
      await notifyStatusChange({
        serviceType: "vet",
        appt: updated,
        newStatus: status,
        caretakerName: doctorName || "Doctor",
      });
      notify.ok = true;
    } catch (e) {
      notify.error = e?.message || String(e);
      console.error("[notifyStatusChange] failed:", notify.error);
    }

    return res.json({ ok: true, item: updated, notify });
  } catch (err) {
    next(err);
  }
});

export default router;
