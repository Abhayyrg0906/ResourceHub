const db = require('../config/database');

/**
 * Creates and persists a user notification in MySQL.
 * 
 * @param {number} userId - ID of user receiving notification (stored as recipient_id)
 * @param {string} type - Notification type (e.g. EXCHANGE_REQUEST, REQUEST_ACCEPTED, etc.)
 * @param {string} title - Brief notification title
 * @param {string} message - Notification text message
 * @param {number|null} relatedId - Optional foreign key identifier (e.g. exchange_request.id, review.id)
 * @param {string|null} relatedEntityType - Optional entity type descriptor (e.g. 'exchange_requests')
 * @returns {Promise<{success: boolean, id?: number, error?: string}>}
 */
const createNotification = async (userId, type, title, message, relatedId = null, relatedEntityType = 'exchange_requests') => {
  try {
    if (!userId || !type || !title || !message) {
      console.warn('[NotificationService] Missing required notification fields:', { userId, type, title });
      return { success: false, error: 'Missing required notification fields' };
    }

    const [result] = await db.query(
      `INSERT INTO notifications 
        (recipient_id, notification_type, title, message, related_entity_id, related_entity_type) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, relatedId, relatedEntityType]
    );

    return {
      success: true,
      id: result.insertId
    };
  } catch (error) {
    // Gracefully log error and do not throw to prevent failing parent transaction
    console.error('[NotificationService] Error creating notification:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createNotification
};
