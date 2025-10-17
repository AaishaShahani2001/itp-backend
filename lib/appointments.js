// lib/appointments.js (ESM)
import mongoose from "mongoose";
import { VetAppointment, GroomingAppointment, DaycareAppointment } from "../models/index.js";

function modelForService(service) {
  switch ((service || "").toLowerCase()) {
    case "vet": return VetAppointment;
    case "grooming": return GroomingAppointment;
    case "daycare": return DaycareAppointment;
    default: return null;
  }
}

export async function setPaymentStatusForItem(item, status) {
  const Model = modelForService(item.service);
  if (!Model) return;

  const id = item.appointmentId || item.id; // accept either name
  if (!id || !mongoose.isValidObjectId(id)) {
    console.warn("⚠️ Skipping invalid appointment id:", id, "for service:", item.service);
    return;
  }

  await Model.updateOne({ _id: id }, { $set: { paymentStatus: status } });
}

export async function setPaymentStatusForItems(items, status) {
  await Promise.all(items.map((it) => setPaymentStatusForItem(it, status)));
}
