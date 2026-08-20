const jwt = require('jsonwebtoken');
const db = require('../config/database');

const protect = async (req, res, next) => {
  let token;

  // Retrieve JWT_SECRET and fail safely if missing in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({
        success: false,
        message: 'Internal server security configuration error.'
      });
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Missing authentication token.'
    });
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, jwtSecret || 'supersecretkey12345_change_me_in_production');

    // Retrieve active student details
    const [rows] = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. User account no longer exists.'
      });
    }

    const user = rows[0];

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Your user account is suspended.'
      });
    }

    // Attach verified user information to the request
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT validation failed:', error.message);
    
    let message = 'Unauthorized. Invalid authentication token.';
    if (error.name === 'TokenExpiredError') {
      message = 'Unauthorized. Session expired. Please log in again.';
    }

    return res.status(401).json({
      success: false,
      message: message
    });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access this resource.'
      });
    }

    next();
  };
};

module.exports = {
  protect,
  requireRole
};
