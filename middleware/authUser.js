import jwt from 'jsonwebtoken';

const authUser = (req, res, next) => {
  try {
    const token = req.headers.token; // Explicitly access 'token' header
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, Login first' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id }; // Use req.user instead of req.body
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(500).json({ success: false, message: error.message }); // Expose error for debugging
  }
};

export default authUser;