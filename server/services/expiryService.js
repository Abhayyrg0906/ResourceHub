const db = require('../config/database');
const { createNotification, notifyWishlistAvailability } = require('./notificationService');

/**
 * Gets the configured resource expiry days from environment or default (30 days).
 * @param {number|string|null} overrideDays 
 * @returns {number}
 */
const getExpiryDays = (overrideDays = null) => {
  if (overrideDays !== null && overrideDays !== undefined && overrideDays !== '') {
    const parsed = parseInt(overrideDays, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const envVal = parseInt(process.env.RESOURCE_EXPIRY_DAYS, 10);
  return !isNaN(envVal) && envVal > 0 ? envVal : 30;
};

/**
 * Finds all AVAILABLE resources that have been inactive for longer than the expiry threshold
 * and are NOT involved in any active exchange requests (PENDING or ACCEPTED).
 * 
 * @param {object} options
 * @param {number|null} options.expiryDays
 * @param {number|null} options.limit
 * @returns {Promise<Array<object>>}
 */
const findExpiredResources = async (options = {}) => {
  const expiryDays = getExpiryDays(options.expiryDays);
  const limit = Math.min(1000, Math.max(1, parseInt(options.limit, 10) || 100));

  const sql = `
    SELECT 
      r.id,
      r.owner_id,
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
      u.name AS owner_name,
      u.email AS owner_email,
      DATEDIFF(NOW(), r.updated_at) AS inactive_days
    FROM resources r
    JOIN users u ON r.owner_id = u.id
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.status = 'AVAILABLE'
      AND r.updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND r.id NOT IN (
        SELECT resource_id FROM exchange_requests WHERE status IN ('PENDING', 'ACCEPTED')
      )
      AND (
        r.id NOT IN (
          SELECT offered_resource_id 
          FROM exchange_requests 
          WHERE offered_resource_id IS NOT NULL AND status IN ('PENDING', 'ACCEPTED')
        )
      )
    ORDER BY r.updated_at ASC
    LIMIT ?
  `;

  const [rows] = await db.query(sql, [expiryDays, limit]);
  return rows;
};

/**
 * Automatically archives expired inactive resources in a database transaction
 * and notifies their respective owners.
 * 
 * @param {object} options
 * @param {number|null} options.expiryDays
 * @param {number|null} options.limit
 * @returns {Promise<{success: boolean, expiry_days: number, scanned: number, archived_count: number, archived_ids: Array<number>}>}
 */
const archiveExpiredResources = async (options = {}) => {
  const expiryDays = getExpiryDays(options.expiryDays);
  const expiredCandidates = await findExpiredResources({ expiryDays, limit: options.limit });

  if (expiredCandidates.length === 0) {
    return {
      success: true,
      expiry_days: expiryDays,
      scanned: 0,
      archived_count: 0,
      archived_ids: []
    };
  }

  const archivedIds = [];
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    for (const resource of expiredCandidates) {
      // Re-verify that no active request was placed concurrently
      const [activeRequests] = await connection.query(
        `SELECT id FROM exchange_requests 
         WHERE (resource_id = ? OR offered_resource_id = ?) 
           AND status IN ('PENDING', 'ACCEPTED')`,
        [resource.id, resource.id]
      );

      if (activeRequests.length === 0) {
        // Safe to archive
        await connection.query(
          "UPDATE resources SET status = 'ARCHIVED' WHERE id = ? AND status = 'AVAILABLE'",
          [resource.id]
        );
        archivedIds.push(resource.id);
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('[ExpiryService] Error during auto-archival transaction:', error);
    throw error;
  } finally {
    connection.release();
  }

  // Asynchronously dispatch notifications outside the transaction
  for (const resource of expiredCandidates) {
    if (archivedIds.includes(resource.id)) {
      createNotification(
        resource.owner_id,
        'RESOURCE_ARCHIVED',
        'Listing Archived Due to Inactivity',
        `Your listing "${resource.title}" has been automatically archived after ${expiryDays} days of inactivity. You can renew and reactivate it anytime from your listings.`,
        resource.id,
        'resources'
      ).catch(err => {
        console.error(`[ExpiryService] Failed to notify user ${resource.owner_id} for resource ${resource.id}:`, err.message);
      });
    }
  }

  return {
    success: true,
    expiry_days: expiryDays,
    scanned: expiredCandidates.length,
    archived_count: archivedIds.length,
    archived_ids: archivedIds
  };
};

/**
 * Allows an owner to renew an active or auto-archived resource, resetting its inactivity timer.
 * 
 * @param {number} resourceId 
 * @param {number} userId 
 * @returns {Promise<{success: boolean, message: string, data?: object}>}
 */
const renewResource = async (resourceId, userId) => {
  const parsedId = parseInt(resourceId, 10);
  if (isNaN(parsedId)) {
    return { success: false, statusCode: 400, message: 'Invalid resource ID.' };
  }

  const [resources] = await db.query(
    'SELECT id, owner_id, title, status FROM resources WHERE id = ?',
    [parsedId]
  );

  if (!resources || resources.length === 0) {
    return { success: false, statusCode: 404, message: 'Resource not found.' };
  }

  const resource = resources[0];

  // Authorization check
  if (resource.owner_id !== userId) {
    return { success: false, statusCode: 403, message: 'Forbidden. You do not own this resource.' };
  }

  // Disallow renewal if in an ongoing exchange transaction
  if (resource.status === 'RESERVED') {
    const [activeRequests] = await db.query(
      "SELECT id FROM exchange_requests WHERE resource_id = ? AND status IN ('PENDING', 'ACCEPTED')",
      [parsedId]
    );
    if (activeRequests.length > 0) {
      return { 
        success: false, 
        statusCode: 400, 
        message: 'Cannot renew resource while an active exchange request is in progress.' 
      };
    }
  }

  if (resource.status === 'EXCHANGED') {
    return {
      success: false,
      statusCode: 400,
      message: 'This resource has already been exchanged. Create a new listing instead.'
    };
  }

  const wasArchived = resource.status === 'ARCHIVED';

  // Transactionally update timestamp and set status to AVAILABLE
  await db.query(
    "UPDATE resources SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?",
    [parsedId]
  );

  // If reactivated from ARCHIVED state, notify wishlist subscribers
  if (wasArchived) {
    try {
      await notifyWishlistAvailability(parsedId);
    } catch (err) {
      console.error('[ExpiryService] Error notifying wishlist on resource renewal:', err.message);
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: wasArchived 
      ? 'Resource listing reactivated and renewed successfully.' 
      : 'Resource listing renewed successfully (inactivity timer reset).',
    data: {
      id: parsedId,
      title: resource.title,
      status: 'AVAILABLE',
      renewed_at: new Date()
    }
  };
};

module.exports = {
  getExpiryDays,
  findExpiredResources,
  archiveExpiredResources,
  renewResource
};
