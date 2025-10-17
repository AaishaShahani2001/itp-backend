
import nodemailer from "nodemailer";
import twilio from "twilio";

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL,
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
  TWILIO_MESSAGING_SERVICE_SID,   // optional (preferred in prod)
  APP_NAME = "PetPulse",
} = process.env;

// ----- email transporter -----
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: false, // true for 465, false for 587
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

// ----- twilio client -----
const smsClient = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

// utils
function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h12 = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}
// normalize E.164 (quick Sri Lanka helper)
function toE164LK(phone) {
  if (!phone) return phone;
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.startsWith("+94")) return digits;
  if (digits.startsWith("94")) return `+${digits}`;
  if (digits.startsWith("0")) return `+94${digits.slice(1)}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function sendEmail({ to, subject, text, html }) {
  try {
    if (!to || !SMTP_HOST) return;
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });
    console.log("Email sent successfully to:", to);
  } catch (e) {
    console.error("Email send error (ignored):", e?.message || e);
  }
}

export async function sendSMS({ to, body }) {
  try {
    if (!smsClient || !to) return;
    const payload = {
      to: toE164LK(to),
      body,
      ...(TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID } // preferred
        : { from: TWILIO_FROM_NUMBER }                         // fallback
      ),
    };
    const res = await smsClient.messages.create(payload);
    console.log("Twilio SMS sent:", res.sid, res.status);
  } catch (e) {
    console.error("Twilio SMS error (ignored):", e?.code, e?.message || e);
  }
}

/**
 * Notify owner when caretaker changes status.
 * @param {Object} p
 * @param {('grooming'|'daycare'|'vet')} p.serviceType
 * @param {Object} p.appt
 * @param {('accepted'|'rejected')} p.newStatus
 * @param {String} [p.caretakerName]
 */
export async function notifyStatusChange({ serviceType, appt, newStatus, caretakerName = "Caretaker" }) {
  const dateLabel = appt?.dateISO ?? appt?.date ?? "";

  //time label for daycare (dropOff–pickUp window)
  let timeLabel = "";
  if (serviceType === "daycare") {
    const start = typeof appt?.dropOffMinutes === "number" ? toHHMM(appt.dropOffMinutes) : "";
    const end   = typeof appt?.pickUpMinutes === "number" ? toHHMM(appt.pickUpMinutes) : "";
    timeLabel = start && end ? `${start}–${end}` : (start || end || "");
  } else {
    timeLabel = typeof appt?.timeSlotMinutes === "number"
      ? toHHMM(appt.timeSlotMinutes)
      : (appt?.time || "");
  }

  const ownerName = appt?.ownerName || "there";
  const prettySvc = serviceType === "vet"
    ? "Veterinary"
    : serviceType?.[0]?.toUpperCase() + serviceType?.slice(1);

  const text =
`${ownerName}, your ${prettySvc} appointment on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""} was ${newStatus.toUpperCase()} by ${caretakerName}.
Appointment ID: ${appt?._id || ""}${appt?.rejectionReason ? `\nReason: ${appt.rejectionReason}` : ""}`;

  // Send both email and SMS
  await Promise.allSettled([
    sendEmail({ to: appt?.ownerEmail, subject: `${APP_NAME} ${prettySvc} ${newStatus}`, text }),
    sendSMS({ to: appt?.ownerPhone || appt?.phone, body: text }),
  ]);
}
