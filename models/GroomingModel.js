import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const GroomingAppointmentSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    user: {type: ObjectId, ref: "User", required: true},
    phone:     { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true },

    petType:   { type: String, required: true, enum: ["Dog","Cat","Rabbit","Bird","Other"] },
    packageId: { type: String, required: true,
      enum: ["basic-bath-brush", "full-grooming", "nail-trim", "deshedding", "flea-tick", "premium-spa"],
     },

    dateISO:         { type: String, required: true },  // "YYYY-MM-DD"
    timeSlotMinutes: { type: Number, required: true },   // minutes from 00:00 (e.g. 10:30 AM = 630)

    notes: { type: String, default: "", trim: true },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "unpaid",
  },
  rejectionReason: { type: String },
},
  { timestamps: true }
);

// prevent double-booking same slot
GroomingAppointmentSchema.index({ dateISO: 1, timeSlotMinutes: 1 }, { unique: true });

export default mongoose.model("GroomingAppointment", GroomingAppointmentSchema);
