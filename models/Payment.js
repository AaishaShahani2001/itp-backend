// models/Payment.js (ESM)
import mongoose from "mongoose";

const ExtraSchema = new mongoose.Schema(
  { name: { type: String, required: true }, price: { type: Number, default: 0 } },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    service: { type: String, enum: ["vet", "grooming", "daycare"], required: true },
    title: String,
    date: String,
    time: String,
    basePrice: { type: Number, default: 0 },
    extras: { type: [ExtraSchema], default: [] },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "LKR" },
    subtotal: { type: Number, required: true },
    items: { type: [ItemSchema], required: true },
    status: {
      type: String,
      enum: ["pending_verification", "verified", "rejected"],
      default: "pending_verification",
      index: true,
    },
    uploadedBy: { userId: { type: mongoose.Schema.Types.ObjectId }, email: String },
    slip: { path: String, mime: String, size: Number, originalName: String, storedName: String },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;
