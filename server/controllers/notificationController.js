const db = require('../config/database');

/**
 * 1. Get Logged-in User's Notifications
 * GET /api/notifications
 * Supports optional pagination (page, limit) and sorts newest first.
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    // Count total notifications for user
    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE recipient_id = ?',
      [userId]
    );
    const total = countRows[0].total;

    // Fetch notifications ordered by newest first
    const [rows] = await db.query(
      `SELECT 
         id,
         recipient_id,
         recipient_id AS user_id,
         notification_type,
         notification_type AS type,
         title,
         message,
         related_entity_id,
         related_entity_id AS related_id,
         related_entity_type,
         is_read,
         created_at
       FROM notifications
       WHERE recipient_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Format boolean is_read for consistency
    const formatted = rows.map((item) => ({
      ...item,
      is_read: Boolean(item.is_read)
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching notifications.'
    });
  }
};

/**
 * 2. Get Unread Count for Logged-in User
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      'SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_id = ? AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      unread_count: rows[0].unread_count || 0
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching unread count.'
    });
  }
};

/**
 * 3. Mark Single Notification as Read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      'SELECT id, recipient_id, is_read FROM notifications WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.'
      });
    }

    const notification = rows[0];

    // Security check: Enforce user ownership
    if (notification.recipient_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this notification.'
      });
    }

    // Mark as read
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating notification.'
    });
  }
};

/**
 * 4. Mark All Notifications as Read for Logged-in User
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE recipient_id = ? AND is_read = 0',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while marking notifications as read.'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
