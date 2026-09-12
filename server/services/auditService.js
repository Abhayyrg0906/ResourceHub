const db = require('../config/database');

/**
 * Ensures the admin_audit_logs table exists in the database.
 */
const ensureAuditLogsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_id INT NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      target_entity_type ENUM('USER', 'RESOURCE', 'REPORT', 'SYSTEM') NOT NULL,
      target_entity_id INT NULL,
      previous_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      reason TEXT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_audit_admin (admin_id),
      INDEX idx_audit_target (target_entity_type, target_entity_id),
      INDEX idx_audit_action (action_type),
      INDEX idx_audit_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await db.query(sql);
};

// Auto-initialize table schema on load
ensureAuditLogsTable().catch(err => {
  console.error('[AuditService] Failed to ensure admin_audit_logs table:', err.message);
});

/**
 * Persists an administrative moderation action to the audit log.
 * 
 * @param {object} params
 * @param {number} params.adminId
 * @param {string} params.actionType (e.g. 'USER_STATUS_CHANGE', 'RESOURCE_STATUS_CHANGE', 'REPORT_RESOLUTION', 'AUTO_ARCHIVE_TRIGGER')
 * @param {'USER'|'RESOURCE'|'REPORT'|'SYSTEM'} params.targetEntityType
 * @param {number|null} params.targetEntityId
 * @param {string|null} params.previousStatus
 * @param {string|null} params.newStatus
 * @param {string|null} params.reason
 * @param {object|null} params.metadata
 * @returns {Promise<{success: boolean, id?: number, error?: string}>}
 */
const logAdminAction = async ({
  adminId,
  actionType,
  targetEntityType,
  targetEntityId = null,
  previousStatus = null,
  newStatus = null,
  reason = null,
  metadata = null
}) => {
  try {
    if (!adminId || !actionType || !targetEntityType) {
      console.warn('[AuditService] Missing required audit log fields:', { adminId, actionType, targetEntityType });
      return { success: false, error: 'Missing required audit log fields.' };
    }

    await ensureAuditLogsTable();

    const [result] = await db.query(
      `INSERT INTO admin_audit_logs 
        (admin_id, action_type, target_entity_type, target_entity_id, previous_status, new_status, reason, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        actionType,
        targetEntityType,
        targetEntityId,
        previousStatus,
        newStatus,
        reason || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return {
      success: true,
      id: result.insertId
    };
  } catch (error) {
    console.error('[AuditService] Error recording audit log:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Retrieves paginated audit logs with search, action, entity, and admin filters.
 * 
 * @param {object} query
 * @returns {Promise<{data: Array<object>, pagination: object}>}
 */
const getAuditLogs = async (query = {}) => {
  await ensureAuditLogsTable();

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const admin_id = query.admin_id;
  const action_type = query.action_type || query.action;
  const target_entity_type = query.target_entity_type || query.entity_type;
  const target_entity_id = query.target_entity_id || query.entity_id;
  const search = query.search;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (admin_id) {
    whereClause += ' AND a.admin_id = ?';
    params.push(parseInt(admin_id, 10));
  }

  if (action_type && action_type.trim() !== '') {
    whereClause += ' AND a.action_type = ?';
    params.push(action_type.trim().toUpperCase());
  }

  if (target_entity_type && target_entity_type.trim() !== '') {
    whereClause += ' AND a.target_entity_type = ?';
    params.push(target_entity_type.trim().toUpperCase());
  }

  if (target_entity_id) {
    whereClause += ' AND a.target_entity_id = ?';
    params.push(parseInt(target_entity_id, 10));
  }

  if (search && search.trim() !== '') {
    whereClause += ' AND (a.reason LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR a.action_type LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total 
     FROM admin_audit_logs a 
     JOIN users u ON a.admin_id = u.id 
     ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await db.query(
    `SELECT 
       a.id,
       a.admin_id,
       u.name AS admin_name,
       u.email AS admin_email,
       a.action_type,
       a.target_entity_type,
       a.target_entity_id,
       a.previous_status,
       a.new_status,
       a.reason,
       a.metadata,
       a.created_at
     FROM admin_audit_logs a
     JOIN users u ON a.admin_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const formattedRows = rows.map(r => ({
    ...r,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
  }));

  return {
    data: formattedRows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Retrieves the complete moderation history for a specific entity.
 * 
 * @param {'USER'|'RESOURCE'|'REPORT'} entityType 
 * @param {number} entityId 
 * @returns {Promise<Array<object>>}
 */
const getEntityModerationHistory = async (entityType, entityId) => {
  await ensureAuditLogsTable();

  const parsedId = parseInt(entityId, 10);
  if (isNaN(parsedId)) return [];

  const [rows] = await db.query(
    `SELECT 
       a.id,
       a.admin_id,
       u.name AS admin_name,
       u.email AS admin_email,
       a.action_type,
       a.target_entity_type,
       a.target_entity_id,
       a.previous_status,
       a.new_status,
       a.reason,
       a.metadata,
       a.created_at
     FROM admin_audit_logs a
     JOIN users u ON a.admin_id = u.id
     WHERE a.target_entity_type = ? AND a.target_entity_id = ?
     ORDER BY a.created_at DESC, a.id DESC`,
    [entityType.toUpperCase(), parsedId]
  );

  return rows.map(r => ({
    ...r,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
  }));
};

/**
 * Retrieves all moderation reports filed against a specific resource.
 * 
 * @param {number} resourceId 
 * @returns {Promise<Array<object>>}
 */
const getResourceReports = async (resourceId) => {
  const parsedId = parseInt(resourceId, 10);
  if (isNaN(parsedId)) return [];

  const [rows] = await db.query(
    `SELECT 
       r.id,
       r.reporter_id,
       u.name AS reporter_name,
       u.email AS reporter_email,
       r.reported_entity_type,
       r.reported_entity_id,
       r.reason,
       r.description,
       r.status,
       r.admin_resolution,
       r.created_at,
       r.updated_at
     FROM reports r
     JOIN users u ON r.reporter_id = u.id
     WHERE r.reported_entity_type = 'RESOURCE' AND r.reported_entity_id = ?
     ORDER BY r.created_at DESC`,
    [parsedId]
  );

  return rows;
};

/**
 * Retrieves detailed report information including target entity context.
 * 
 * @param {number} reportId 
 * @returns {Promise<object|null>}
 */
const getReportDetails = async (reportId) => {
  const parsedId = parseInt(reportId, 10);
  if (isNaN(parsedId)) return null;

  const [rows] = await db.query(
    `SELECT 
       r.id,
       r.reporter_id,
       u.name AS reporter_name,
       u.email AS reporter_email,
       r.reported_entity_type,
       r.reported_entity_id,
       r.reason,
       r.description,
       r.status,
       r.admin_resolution,
       r.created_at,
       r.updated_at
     FROM reports r
     JOIN users u ON r.reporter_id = u.id
     WHERE r.id = ?`,
    [parsedId]
  );

  if (rows.length === 0) return null;

  const report = rows[0];

  // Attach target entity context if available
  if (report.reported_entity_type === 'RESOURCE') {
    const [resRows] = await db.query(
      `SELECT r.id, r.title, r.owner_id, r.status, u.name AS owner_name, u.email AS owner_email, u.trust_score AS owner_trust_score
       FROM resources r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = ?`,
      [report.reported_entity_id]
    );
    if (resRows.length > 0) {
      report.target_resource = resRows[0];
    }
  } else if (report.reported_entity_type === 'USER') {
    const [userRows] = await db.query(
      `SELECT id, name, email, role, status, trust_score, reputation_score
       FROM users
       WHERE id = ?`,
      [report.reported_entity_id]
    );
    if (userRows.length > 0) {
      report.target_user = userRows[0];
    }
  }

  // Attach report moderation history
  report.moderation_history = await getEntityModerationHistory('REPORT', parsedId);

  return report;
};

module.exports = {
  ensureAuditLogsTable,
  logAdminAction,
  getAuditLogs,
  getEntityModerationHistory,
  getResourceReports,
  getReportDetails
};
