import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const VetAppointmentSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    user: {type: ObjectId, ref: "User", required: true},
    ownerPhone: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },

    petType: { type: String, enum: ["Dog", "Cat", "Rabbit", "Bird", "Other"], required: true },
    petSize: { type: String, enum: ["small", "medium", "large"], required: true },

    reason: { type: String, trim: true },

    // Store date as YYYY-MM-DD for easy queries + the chosen time slot in minutes from midnight
    dateISO: { type: String, required: true }, // e.g. "2025-09-03"
    timeSlotMinutes: { type: Number, required: true, min: 8 * 60, max: 20 * 60 },

    selectedService: String,
    selectedPrice: Number,

    packageId: {
      type: String,
      enum: ["general health checkup", "vaccination", "emergency care"],
    },

    notes: String,
    medicalFilePath: String,

    status: { type: String, enum: ["pending","accepted", "rejected", "completed"], default: "pending" },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "unpaid",
},
rejectionReason: { type: String },
  },
  { timestamps: true }
);

// No double-booking for the same slot (1 vet)
VetAppointmentSchema.index({ dateISO: 1, timeSlotMinutes: 1 }, { unique: true });

export default mongoose.model("VetAppointment", VetAppointmentSchema);
