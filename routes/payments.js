
import express from "express";
import fs from "node:fs";
import Payment from "../models/Payment.js";
import requireAuth from "../middleware/requireAuth.js";
import requireCaretaker from "../middleware/requireCaretaker.js";
import uploadSlip from "../lib/multerSlip.js";
import { setPaymentStatusForItems } from "../lib/appointments.js";

const router = express.Router();

/**
 * POST /api/payments/upload-slip
 * - Accepts a multipart form with:
 *   - field "slip": the image/pdf
 *   - field "order": JSON string with { currency, subtotal, items:[{ id, service, title, date, time, basePrice, extras[], lineTotal }] }
 * - Immediately records a Payment with status "verified"
 * - Marks all referenced appointments as paymentStatus="paid"
 */
router.post(
  "/upload-slip",
  requireAuth,
  uploadSlip.single("slip"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Slip file is required" });
      }

      // Parse order JSON
      let order;
      try {
        order = JSON.parse(req.body.order || "{}");
      } catch {
        return res.status(400).json({ message: "Invalid order JSON" });
      }
      if (!Array.isArray(order.items) || order.items.length === 0) {
        return res.status(400).json({ message: "Order must contain items" });
      }

      // Normalize payload - handle both appointments and adoptions
      const items = order.items.map((it) => ({
        appointmentId: it.id,
        service: it.service, // "grooming" | "daycare" | "vet" | "adoption"
        title: it.title,
        date: it.date || new Date().toISOString().split('T')[0], // Default date for adoptions
        time: it.time || "00:00", // Default time for adoptions
        basePrice: Number(it.basePrice || 0),
        extras: Array.isArray(it.extras)
          ? it.extras.map((e) => ({ name: e.name, price: Number(e.price || 0) }))
          : [],
        lineTotal: Number(it.lineTotal || 0),
      }));

      const subtotal =
        order.subtotal ??
        items.reduce((s, i) => s + Number(i.lineTotal || 0), 0);

      //  create the Payment as "verified" 
      const payment = await Payment.create({
        currency: order.currency || "LKR",
        subtotal,
        items,
        uploadedBy: {
          userId: req.user?.id || null,
          email: req.user?.email || null,
        },
        slip: {
          path: req.file.path,
          mime: req.file.mimetype,
          size: req.file.size,
          originalName: req.file.originalname,
          storedName: req.file.filename,
        },
        status: "verified", // 
      });

      // immediately mark all items as PAID (appointments or adoptions)
      await setPaymentStatusForItems(items, "paid");

      // Determine response message based on service types
      const hasAdoptions = items.some(item => item.service === "adoption");
      const hasAppointments = items.some(item => ["vet", "grooming", "daycare"].includes(item.service));
      
      let message = "Slip uploaded successfully.";
      if (hasAdoptions && hasAppointments) {
        message += " Adoptions and appointments marked as PAID.";
      } else if (hasAdoptions) {
        message += " Adoptions marked as PAID.";
      } else if (hasAppointments) {
        message += " Appointments marked as PAID.";
      }

      return res.status(201).json({
        message,
        paymentId: payment._id,
      });
    } catch (err) {
      console.error(err);
      // rollback file on failure
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * GET /api/payments?status=
 * (unchanged) – useful if   want to list payments, e.g. in admin
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const q = {};
    if (status) q.status = status;

    // Role-based scoping (optional)
    const role = (req.user?.role || "").toLowerCase();
    if (role === "caretaker") {
      q["items.service"] = { $in: ["grooming", "daycare"] };
    } else if (role === "doctor") {
      q["items.service"] = "vet";
    } else if (role === "admin") {
      // see all
    } else {
      // normal users: leave as-is to see their payments if you want
    }

    const docs = await Payment.find(q).sort({ createdAt: -1 }).lean();
    res.json(docs);
  } catch (e) {
    console.error("payments list error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/payments/mark-paid
 * Body: { items: [{ id, service }, ...] }
 * Keep this for idempotency when the frontend wants to force-sync “paid”.
 * It just sets those appointments to "paid" again.
 */
router.patch("/mark-paid", requireAuth, async (req, res) => {
  try {
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!list.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    const items = list.map((x) => ({
      appointmentId: x.id,
      service: x.service,
    }));
    await setPaymentStatusForItems(items, "paid");

    return res.json({ message: "Appointments marked as paid" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * OPTIONAL: caretaker verification endpoints
 * These are now effectively no-ops, since uploads are already verified.
 * You can delete them if you prefer, or leave them as idempotent.
 */
router.patch("/:id/verify", requireAuth, requireCaretaker, async (req, res) => {
  const doc = await Payment.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });

  if (doc.status !== "verified") {
    doc.status = "verified";
    await doc.save();
    await setPaymentStatusForItems(doc.items, "paid");
  }
  res.json({ message: "Payment verified (idempotent) and appointments marked paid" });
});

router.patch("/:id/reject", requireAuth, requireCaretaker, async (req, res) => {
  // With instant-verify flow, you likely don't need rejection anymore.
  // If you still want to support it manually, keep this.
  try {
    const doc = await Payment.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    doc.status = "rejected";
    await doc.save();
    await setPaymentStatusForItems(doc.items, "unpaid");
    res.json({ message: "Payment rejected and appointments set to unpaid" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
