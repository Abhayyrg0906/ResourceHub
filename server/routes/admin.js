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
  getExpiredResources,
  getAuditLogs,
  getUserModerationHistory,
  getResourceModerationHistory,
  getResourceReports,
  getReportDetails
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
router.get('/users/:id/moderation-history', getUserModerationHistory);
router.patch('/users/:id/status', updateUserStatus);

// Resource Moderation & Lifecycle (M22/M23)
router.get('/resources', getResources);
router.get('/resources/expired', getExpiredResources);
router.get('/resources/:id/reports', getResourceReports);
router.get('/resources/:id/moderation-history', getResourceModerationHistory);
router.post('/resources/auto-archive', triggerAutoArchive);
router.patch('/resources/:id/status', updateResourceStatus);

// Report Management & Investigation (M23)
router.get('/reports', getReports);
router.get('/reports/:id', getReportDetails);
router.patch('/reports/:id/status', updateReportStatus);

// Admin Audit Trail (M23)
router.get('/audit-logs', getAuditLogs);
router.get('/moderation/history', getAuditLogs);

module.exports = router;
