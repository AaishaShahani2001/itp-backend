// lib/multerSlip.js (ESM)
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID as uuid } from "node:crypto";

const ALLOWED = ["image/png", "image/jpeg", "application/pdf"];

// Use a stable project root (not process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..");
const SLIPS_DIR = path.join(PROJECT_ROOT, "uploads", "slips");

// Ensure directory exists
fs.mkdirSync(SLIPS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SLIPS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${uuid()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new Error("Only PNG, JPG, or PDF allowed"));
  }
  cb(null, true);
}

const uploadSlip = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

export default uploadSlip;
