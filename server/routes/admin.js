const express = require('express');
const router = express.Router();
const {
  getStats,
  getUsers,
  updateUserStatus,
  getResources,
  updateResourceStatus,
  getReports,
  updateReportStatus,
  getAdminUserReputation,
  triggerAutoArchive,
  getExpiredResources
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// All admin routes require JWT authentication AND role === 'ADMIN'
router.use(protect);
router.use(requireAdmin);

// Dashboard Statistics & Analytics
router.get('/stats', getStats);
router.get('/analytics', getStats);

// User Management & Reputation Inspection
router.get('/users', getUsers);
router.get('/users/:id/reputation', getAdminUserReputation);
router.patch('/users/:id/status', updateUserStatus);

// Resource Moderation & Lifecycle (M22)
router.get('/resources', getResources);
router.get('/resources/expired', getExpiredResources);
router.post('/resources/auto-archive', triggerAutoArchive);
router.patch('/resources/:id/status', updateResourceStatus);

// Report Management
router.get('/reports', getReports);
router.patch('/reports/:id/status', updateReportStatus);

module.exports = router;
