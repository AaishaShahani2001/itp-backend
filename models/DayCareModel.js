import mongoose from "mongoose";

const {ObjectId} = mongoose.Schema.Types

const DayCareSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true },
    user: {type: ObjectId, ref: "User", required: true},
    ownerEmail: { type: String, required: true, trim: true, lowercase: true },
    ownerPhone: { type: String, required: true, trim: true },
    emergencyPhone: { type: String, trim: true },

    petType: {
      type: String,
      required: true,
      enum: ["Dog", "Cat", "Rabbit", "Parrot", "Other"],
    },
    petName: { type: String, required: true, trim: true },

    packageId: {
      type: String,
      required: true,
      enum: ["half-day", "full-day", "extended-day"],
    },

    dateISO: { type: String, required: true }, // YYYY-MM-DD
    dropOffMinutes: { type: Number, required: true, min: 0, max: 24 * 60 },
    pickUpMinutes: { type: Number, required: true, min: 0, max: 24 * 60 },

    notes: { type: String, default: "" },

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

// basic sanity check
DayCareSchema.pre("validate", function (next) {
  if (this.pickUpMinutes <= this.dropOffMinutes) {
    return next(new Error("pickUpMinutes must be after dropOffMinutes"));
  }
  next();
});

DayCareSchema.index({ dateISO: 1, dropOffMinutes: 1 });
export default mongoose.model("DayCareAppointment", DayCareSchema);
