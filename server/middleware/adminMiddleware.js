const { protect } = require('./authMiddleware');

/**
 * Middleware that verifies the authenticated user has the ADMIN role.
 * Requires protect middleware to have executed first, or can be used standalone if req.user is set.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges required.'
    });
  }

  next();
};

module.exports = {
  requireAdmin
};
