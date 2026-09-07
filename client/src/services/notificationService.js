import api from './api';

/**
 * Fetch notifications for the authenticated user with optional pagination.
 * @param {Object} params - Query params (page, limit)
 * @returns {Promise<Object>} API response data
 */
export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

/**
 * Fetch total unread notifications count for the authenticated user.
 * @returns {Promise<Object>} API response data with { success: true, unread_count: N }
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read by ID.
 * @param {number|string} id - Notification ID
 * @returns {Promise<Object>} API response data
 */
export const markNotificationRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Mark all notifications for the authenticated user as read.
 * @returns {Promise<Object>} API response data
 */
export const markAllNotificationsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};
