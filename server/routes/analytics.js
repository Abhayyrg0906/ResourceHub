const express = require('express');
const router = express.Router();
const { 
  getStudentAnalytics, 
  getAdminAnalytics 
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Student Analytics (User-scoped, requires authenticated student session)
router.get('/student', protect, getStudentAnalytics);
router.get('/me', protect, getStudentAnalytics);

// Admin Analytics (Platform-wide, requires authenticated admin session)
router.get('/admin', protect, requireAdmin, getAdminAnalytics);

module.exports = router;
