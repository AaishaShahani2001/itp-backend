// lib/multerSlip.js (ESM)
import multer from "multer";
import path from "node:path";
import { randomUUID as uuid } from "node:crypto";

const ALLOWED = ["image/png", "image/jpeg", "application/pdf"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "uploads", "slips")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuid()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED.includes(file.mimetype)) return cb(new Error("Only PNG, JPG, or PDF allowed"));
  cb(null, true);
}

const uploadSlip = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });
export default uploadSlip;
