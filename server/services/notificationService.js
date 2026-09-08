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

/**
 * Notifies all users who have bookmarked a resource when it becomes AVAILABLE.
 * Fails gracefully to never disrupt the parent transaction.
 * 
 * @param {number} resourceId 
 */
const notifyWishlistAvailability = async (resourceId) => {
  try {
    const [wishlistUsers] = await db.query(
      `SELECT DISTINCT w.user_id, r.title, r.owner_id
       FROM wishlist w
       JOIN resources r ON w.resource_id = r.id
       WHERE w.resource_id = ? AND w.user_id != r.owner_id`,
      [resourceId]
    );

    for (const entry of wishlistUsers) {
      await createNotification(
        entry.user_id,
        'WISHLIST_AVAILABLE',
        'Wishlist Item Available!',
        `Good news! "${entry.title}" from your wishlist is now available for exchange.`,
        resourceId,
        'resources'
      );
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying wishlist availability:', err.message);
  }
};

/**
 * Notifies users who have saved items in the same category when a new resource is listed.
 * Fails gracefully to never disrupt resource creation.
 * 
 * @param {number} resourceId 
 * @param {number} categoryId 
 * @param {string} title 
 * @param {number} ownerId 
 */
const notifyWishlistCategoryMatch = async (resourceId, categoryId, title, ownerId) => {
  try {
    const [catRows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
    const catName = catRows.length > 0 ? catRows[0].name : '';

    const [matchingUsers] = await db.query(
      `SELECT DISTINCT w.user_id
       FROM wishlist w
       JOIN resources r ON w.resource_id = r.id
       WHERE r.category_id = ? AND w.user_id != ?`,
      [categoryId, ownerId]
    );

    for (const entry of matchingUsers) {
      await createNotification(
        entry.user_id,
        'WISHLIST_AVAILABLE',
        'New Item in Your Saved Category',
        `A new item "${title}" was just listed in ${catName ? `the ${catName} category` : 'a category you have in your wishlist'}.`,
        resourceId,
        'resources'
      );
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying category match:', err.message);
  }
};

module.exports = {
  createNotification,
  notifyWishlistAvailability,
  notifyWishlistCategoryMatch
};
