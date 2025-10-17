import express from "express";
import VetAppointment from "../models/VetAppointmentModel.js";
import GroomingAppointment from "../models/GroomingModel.js";
import DaycareAppointment from "../models/DayCareModel.js"; 

const router = express.Router();

// helper: minutes -> "hh:mm AM/PM"
function mmToLabel(m) {
  const h24 = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${mm} ${ampm}`;
}

// GET /api/schedule/mine?email=someone@example.com
router.get("/mine", async (req, res, next) => {
  try {
    const email = (req.query.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ error: "email is required" });

    // fetch in parallel
    const [vets, grooms, days] = await Promise.all([
      VetAppointment.find({ ownerEmail: email }).lean(),
      GroomingAppointment.find({ email }).lean(),          // grooming model uses `email`
      DaycareAppointment.find({ ownerEmail: email }).lean() // daycare model uses `ownerEmail`
    ]);

    // normalize to a single shape for the UI
    const items = [
      ...vets.map(a => ({
        _id: String(a._id),
        service: "vet",
        dateISO: a.dateISO,
        start: mmToLabel(a.timeSlotMinutes),
        end: mmToLabel((a.timeSlotMinutes || 0) + (a.durationMin || 30)),
        title: a.selectedService || "Vet appointment",
        status: a.status || "pending",
        paymentStatus: a.paymentStatus || "unpaid",
        createdAt: a.createdAt,
      })),
      ...grooms.map(a => ({
        _id: String(a._id),
        service: "grooming",
        dateISO: a.dateISO,
        start: mmToLabel(a.timeSlotMinutes),
        end: mmToLabel((a.timeSlotMinutes || 0) + 60),
        title: a.packageName || a.packageId || "Grooming",
        status: a.status || "pending",
        paymentStatus: a.paymentStatus || "unpaid",
        createdAt: a.createdAt,
      })),
      ...days.map(a => ({
        _id: String(a._id),
        service: "daycare",
        dateISO: a.dateISO,
        start: mmToLabel(a.dropOffMinutes),
        end: mmToLabel(a.pickUpMinutes),
        title: a.packageName || a.packageId || "Daycare",
        status: a.status || "pending",
        paymentStatus: a.paymentStatus || "unpaid",
        createdAt: a.createdAt,
      })),
    ]
    // newest first
    .sort((a, b) => new Date(b.createdAt || b.dateISO) - new Date(a.createdAt || a.dateISO));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
