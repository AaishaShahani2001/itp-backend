// middleware/requireAuth.js (ESM)
export default function requireAuth(req, res, next) {
  const token = req.headers.token || req.headers.authorization || "";
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // DEV: allow role via header while you wire up real JWTs
  const roleHeader = (req.headers.role || req.headers["x-role"] || "").toLowerCase();

  // TODO: replace with real JWT decode
  req.user = {
    id: "000000000000000000000001",
    email: "caretaker@petpulse.com",
    role: roleHeader || "caretaker", // <-- default caretaker for caretaker app in dev
  };

  next();
}
