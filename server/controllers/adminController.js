const db = require('../config/database');
const { createNotification } = require('../services/notificationService');
const reputationService = require('../services/reputationService');
const expiryService = require('../services/expiryService');
const auditService = require('../services/auditService');
const cache = require('../utils/cache');

const { getAdminAnalytics } = require('./analyticsController');

/**
 * 1. Platform Statistics & Analytics
 * GET /api/admin/stats
 * GET /api/admin/analytics
 */
const getStats = getAdminAnalytics;

/**
 * 2. User Management: Get Users
 * GET /api/admin/users
 */
const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, role } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR department LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status && status.trim() !== '') {
      whereClause += ' AND status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (role && role.trim() !== '') {
      whereClause += ' AND role = ?';
      params.push(role.trim().toUpperCase());
    }

    // Count total matching users
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Fetch paginated user records (NEVER select password_hash)
    const [users] = await db.query(
      `SELECT 
         id,
         name,
         email,
         department,
         year_of_study,
         role,
         status,
         trust_score,
         reputation_score,
         created_at,
         updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formattedUsers = users.map(u => ({
      ...u,
      trust_score: parseFloat(u.trust_score || 100.00),
      reputation_score: parseFloat(u.reputation_score !== undefined && u.reputation_score !== null ? u.reputation_score : (u.trust_score || 100.00))
    }));

    return res.status(200).json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching users.'
    });
  }
};

/**
 * 3. User Management: Update User Status
 * PATCH /api/admin/users/:id/status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const currentAdminId = req.user.id;

    const allowedStatuses = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'];
    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Allowed: PENDING_VERIFICATION, ACTIVE, SUSPENDED.'
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Check if user exists
    const [users] = await db.query(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const targetUser = users[0];

    // Prevent admin from deactivating or suspending themselves
    if (Number(id) === Number(currentAdminId) && normalizedStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot deactivate or suspend their own account.'
      });
    }

    const previousStatus = targetUser.status;

    // Update status
    await db.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [normalizedStatus, id]
    );

    // M23: Record administrative audit log
    await auditService.logAdminAction({
      adminId: currentAdminId,
      actionType: 'USER_STATUS_CHANGE',
      targetEntityType: 'USER',
      targetEntityId: targetUser.id,
      previousStatus: previousStatus,
      newStatus: normalizedStatus,
      reason: reason || null,
      metadata: { target_email: targetUser.email, target_name: targetUser.name }
    });

    // M17: Recalculate reputation on status change
    await reputationService.updateUserReputation(id);

    // M10.6: Dispatch user notification
    const notificationTitle = normalizedStatus === 'SUSPENDED' 
      ? 'Account Suspended' 
      : 'Account Status Updated';
    const notificationMsg = normalizedStatus === 'SUSPENDED'
      ? (reason ? `Your account has been suspended: ${reason}. Please contact support.` : 'Your account has been suspended by administration. Please contact support.')
      : `Your account status has been updated to ${normalizedStatus}.`;

    await createNotification(
      targetUser.id,
      'ACCOUNT_STATUS_CHANGED',
      notificationTitle,
      notificationMsg,
      targetUser.id,
      'users'
    );

    // Invalidate cached admin analytics
    cache.flushPattern('admin:analytics');

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully.',
      data: {
        id: targetUser.id,
        status: normalizedStatus
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating user status.'
    });
  }
};

/**
 * 4. Resource Moderation: Get Resources
 * GET /api/admin/resources
 */
const getResources = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { search, status, exchange_type } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      whereClause += ' AND (r.title LIKE ? OR r.description LIKE ? OR u.name LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status && status.trim() !== '') {
      whereClause += ' AND r.status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (exchange_type && exchange_type.trim() !== '') {
      whereClause += ' AND r.exchange_type = ?';
      params.push(exchange_type.trim().toUpperCase());
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM resources r 
       JOIN users u ON r.owner_id = u.id 
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [resources] = await db.query(
      `SELECT 
         r.id,
         r.title,
         r.description,
         r.category_id,
         c.name AS category_name,
         r.exchange_type,
         r.price,
         r.item_condition,
         r.meetup_location,
         r.status,
         r.created_at,
         r.updated_at,
         r.owner_id,
         u.name AS owner_name,
         u.email AS owner_email,
         u.trust_score AS owner_trust_score,
         u.reputation_score AS owner_reputation_score,
         (SELECT COUNT(*) FROM reports WHERE reported_entity_type = 'RESOURCE' AND reported_entity_id = r.id) AS report_count
       FROM resources r
       JOIN users u ON r.owner_id = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const formattedResources = resources.map(r => ({
      ...r,
      owner_trust_score: parseFloat(r.owner_trust_score || 100.00),
      owner_reputation_score: parseFloat(r.owner_reputation_score !== undefined && r.owner_reputation_score !== null ? r.owner_reputation_score : (r.owner_trust_score || 100.00)),
      report_count: parseInt(r.report_count || 0, 10)
    }));

    return res.status(200).json({
      success: true,
      data: formattedResources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching resources for moderation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching resources.'
    });
  }
};

/**
 * 5. Resource Moderation: Update Resource Status
 * PATCH /api/admin/resources/:id/status
 */
const updateResourceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['AVAILABLE', 'RESERVED', 'EXCHANGED', 'ARCHIVED'];
    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource status. Allowed: AVAILABLE, RESERVED, EXCHANGED, ARCHIVED.'
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Check resource exists
    const [resources] = await db.query(
      'SELECT id, title, owner_id, status FROM resources WHERE id = ?',
      [id]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    const resource = resources[0];
    const previousStatus = resource.status;

    // Transaction integrity check: Do NOT allow moderation action to alter an active transaction
    if (normalizedStatus === 'ARCHIVED') {
      const [activeRequests] = await db.query(
        'SELECT id FROM exchange_requests WHERE resource_id = ? AND status = "ACCEPTED"',
        [id]
      );

      if (activeRequests.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot archive a resource with an active ongoing exchange transaction.'
        });
      }
    }

    // Update status
    await db.query(
      'UPDATE resources SET status = ? WHERE id = ?',
      [normalizedStatus, id]
    );

    // M23: Record administrative audit log
    await auditService.logAdminAction({
      adminId,
      actionType: 'RESOURCE_STATUS_CHANGE',
      targetEntityType: 'RESOURCE',
      targetEntityId: resource.id,
      previousStatus: previousStatus,
      newStatus: normalizedStatus,
      reason: reason || null,
      metadata: { resource_title: resource.title, owner_id: resource.owner_id }
    });

    // M10.6: Notify owner when resource is archived or unarchived by moderation
    if (normalizedStatus === 'ARCHIVED') {
      await createNotification(
        resource.owner_id,
        'RESOURCE_ARCHIVED',
        'Resource Listing Archived',
        reason ? `Your resource listing "${resource.title}" has been archived: ${reason}.` : `Your resource listing "${resource.title}" has been archived by administration.`,
        resource.id,
        'resources'
      );
    } else if (previousStatus === 'ARCHIVED' && normalizedStatus === 'AVAILABLE') {
      await createNotification(
        resource.owner_id,
        'WISHLIST_AVAILABLE',
        'Resource Listing Reactivated',
        `Your resource listing "${resource.title}" has been reactivated by administration.`,
        resource.id,
        'resources'
      );
    }

    // Invalidate cached admin analytics
    cache.flushPattern('admin:analytics');

    return res.status(200).json({
      success: true,
      message: 'Resource status updated successfully.',
      data: {
        id: resource.id,
        status: normalizedStatus
      }
    });
  } catch (error) {
    console.error('Error updating resource status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating resource status.'
    });
  }
};

/**
 * 6. Report Management: Get Reports
 * GET /api/admin/reports
 */
const getReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { status, entity_type, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status.trim() !== '') {
      whereClause += ' AND r.status = ?';
      params.push(status.trim().toUpperCase());
    }

    if (entity_type && entity_type.trim() !== '') {
      whereClause += ' AND r.reported_entity_type = ?';
      params.push(entity_type.trim().toUpperCase());
    }

    if (search && search.trim() !== '') {
      whereClause += ' AND (r.reason LIKE ? OR r.description LIKE ? OR u_rep.name LIKE ? OR u_rep.email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM reports r 
       JOIN users u_rep ON r.reporter_id = u_rep.id 
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [reports] = await db.query(
      `SELECT 
         r.id,
         r.reporter_id,
         u_rep.name AS reporter_name,
         u_rep.email AS reporter_email,
         r.reported_entity_type,
         r.reported_entity_id,
         r.reason,
         r.description,
         r.status,
         r.admin_resolution,
         r.created_at,
         r.updated_at
       FROM reports r
       JOIN users u_rep ON r.reporter_id = u_rep.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching reports.'
    });
  }
};

/**
 * 7. Report Management: Update Report Status
 * PATCH /api/admin/reports/:id/status
 */
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_resolution, reason, archive_resource } = req.body;
    const adminId = req.user.id;

    const allowedStatuses = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
    if (!status || !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report status. Allowed: PENDING, UNDER_REVIEW, RESOLVED, DISMISSED.'
      });
    }

    const normalizedStatus = status.toUpperCase();

    // Check report exists
    const [reports] = await db.query(
      'SELECT * FROM reports WHERE id = ?',
      [id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    const report = reports[0];
    const previousStatus = report.status;
    const finalResolution = admin_resolution || reason || null;

    // Optionally archive reported resource if requested and valid
    if (archive_resource && report.reported_entity_type === 'RESOURCE') {
      const [activeRequests] = await db.query(
        'SELECT id FROM exchange_requests WHERE resource_id = ? AND status = "ACCEPTED"',
        [report.reported_entity_id]
      );

      if (activeRequests.length === 0) {
        await db.query(
          'UPDATE resources SET status = "ARCHIVED" WHERE id = ?',
          [report.reported_entity_id]
        );

        // Fetch owner and notify
        const [resRows] = await db.query('SELECT title, owner_id FROM resources WHERE id = ?', [report.reported_entity_id]);
        if (resRows.length > 0) {
          await createNotification(
            resRows[0].owner_id,
            'RESOURCE_ARCHIVED',
            'Resource Listing Archived',
            `Your resource listing "${resRows[0].title}" was archived following moderation review.`,
            report.reported_entity_id,
            'resources'
          );
        }
      }
    }

    // Update report
    await db.query(
      'UPDATE reports SET status = ?, admin_resolution = ? WHERE id = ?',
      [normalizedStatus, finalResolution, id]
    );

    // M23: Record administrative audit log
    await auditService.logAdminAction({
      adminId,
      actionType: 'REPORT_RESOLUTION',
      targetEntityType: 'REPORT',
      targetEntityId: report.id,
      previousStatus: previousStatus,
      newStatus: normalizedStatus,
      reason: finalResolution,
      metadata: {
        reporter_id: report.reporter_id,
        reported_entity_type: report.reported_entity_type,
        reported_entity_id: report.reported_entity_id,
        archive_resource: Boolean(archive_resource)
      }
    });

    // M17: If report was filed against a user, recalculate user's reputation score
    if (report.reported_entity_type === 'USER') {
      await reputationService.updateUserReputation(report.reported_entity_id);
    }

    // M10.6: Notify reporter that their report has been reviewed/updated
    await createNotification(
      report.reporter_id,
      'REPORT_RESOLVED',
      'Report Update',
      `Your report (#${report.id}) regarding ${report.reported_entity_type} has been marked as ${normalizedStatus}.`,
      report.id,
      'reports'
    );

    // Invalidate cached admin analytics
    cache.flushPattern('admin:analytics');

    return res.status(200).json({
      success: true,
      message: 'Report status updated successfully.',
      data: {
        id: report.id,
        status: normalizedStatus,
        admin_resolution: finalResolution
      }
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating report status.'
    });
  }
};

/**
 * 8. User Reputation Inspection
 * GET /api/admin/users/:id/reputation
 */
const getAdminUserReputation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID parameter.'
      });
    }

    const breakdown = await reputationService.getReputationBreakdown(userId);
    return res.status(200).json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('Error fetching user reputation for admin:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching reputation details.'
    });
  }
};

/**
 * 9. Trigger Resource Auto-Archival Scan (M22)
 * POST /api/admin/resources/auto-archive
 */
const triggerAutoArchive = async (req, res) => {
  try {
    const { expiry_days, limit } = req.body || {};
    const result = await expiryService.archiveExpiredResources({
      expiryDays: expiry_days || req.query.expiry_days,
      limit: limit || req.query.limit
    });

    // M23: Record audit log for system auto-archival trigger
    await auditService.logAdminAction({
      adminId: req.user.id,
      actionType: 'AUTO_ARCHIVE_TRIGGER',
      targetEntityType: 'SYSTEM',
      targetEntityId: null,
      previousStatus: null,
      newStatus: null,
      reason: `Auto-archival execution archived ${result.archived_count} listings out of ${result.scanned} scanned.`,
      metadata: { expiry_days: result.expiry_days, archived_ids: result.archived_ids }
    });

    // Invalidate cached admin analytics
    cache.flushPattern('admin:analytics');

    return res.status(200).json({
      success: true,
      message: `Auto-archival complete. ${result.archived_count} listing(s) archived out of ${result.scanned} scanned.`,
      data: result
    });
  } catch (error) {
    console.error('Error executing admin auto-archival:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during auto-archival.'
    });
  }
};

/**
 * 10. Get Expired Resources List / Candidates (M22)
 * GET /api/admin/resources/expired
 */
const getExpiredResources = async (req, res) => {
  try {
    const { expiry_days, limit } = req.query;
    const candidates = await expiryService.findExpiredResources({
      expiryDays: expiry_days,
      limit
    });

    return res.status(200).json({
      success: true,
      count: candidates.length,
      expiry_days: expiryService.getExpiryDays(expiry_days),
      data: candidates
    });
  } catch (error) {
    console.error('Error fetching admin expired resources:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching expired resources.'
    });
  }
};

/**
 * 11. Admin Audit Trail
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching audit logs.'
    });
  }
};

/**
 * 12. User Moderation History
 * GET /api/admin/users/:id/moderation-history
 */
const getUserModerationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID parameter.'
      });
    }

    const history = await auditService.getEntityModerationHistory('USER', userId);
    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching user moderation history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user history.'
    });
  }
};

/**
 * 13. Resource Moderation History
 * GET /api/admin/resources/:id/moderation-history
 */
const getResourceModerationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID parameter.'
      });
    }

    const history = await auditService.getEntityModerationHistory('RESOURCE', resourceId);
    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching resource moderation history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching resource history.'
    });
  }
};

/**
 * 14. Resource Reports Inspection
 * GET /api/admin/resources/:id/reports
 */
const getResourceReports = async (req, res) => {
  try {
    const { id } = req.params;
    const resourceId = parseInt(id, 10);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID parameter.'
      });
    }

    const reports = await auditService.getResourceReports(resourceId);
    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching resource reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching resource reports.'
    });
  }
};

/**
 * 15. Single Report Details Inspection
 * GET /api/admin/reports/:id
 */
const getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID parameter.'
      });
    }

    const report = await auditService.getReportDetails(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching report details.'
    });
  }
};

module.exports = {
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
};
