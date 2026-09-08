const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  updateUserStatus,
  getResources,
  updateResourceStatus,
  getReports,
  updateReportStatus
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// All admin routes require JWT authentication AND role === 'ADMIN'
router.use(protect);
router.use(requireAdmin);

// Dashboard Statistics
router.get('/stats', getStats);

// User Management
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);

// Resource Moderation
router.get('/resources', getResources);
router.patch('/resources/:id/status', updateResourceStatus);

// Report Management
router.get('/reports', getReports);
router.patch('/reports/:id/status', updateReportStatus);

module.exports = router;
