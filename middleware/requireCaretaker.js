// middleware/requireCaretaker.js (ESM)
export default function requireCaretaker(req, res, next) {
  if ((req.user?.role || "").toLowerCase() !== "caretaker" &&
      (req.user?.role || "").toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Forbidden (caretaker only)" });
  }
  next();
}
