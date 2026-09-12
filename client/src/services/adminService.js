import api from './api';

/**
 * Fetch dashboard overview statistics.
 * @returns {Promise<Object>} Statistics data
 */
export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

/**
 * Fetch paginated users for user management.
 * @param {Object} params - Query params (page, limit, search, status, role)
 * @returns {Promise<Object>} Users data and pagination
 */
export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

/**
 * Update a user's status (ACTIVE, SUSPENDED, PENDING_VERIFICATION) with optional reason.
 * @param {number|string} userId 
 * @param {string} status 
 * @param {string|null} reason
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserStatus = async (userId, status, reason = null) => {
  const response = await api.patch(`/admin/users/${userId}/status`, { status, reason });
  return response.data;
};

/**
 * Fetch paginated resources for moderation.
 * @param {Object} params - Query params (page, limit, search, status, exchange_type)
 * @returns {Promise<Object>} Resources data and pagination
 */
export const getAdminResources = async (params = {}) => {
  const response = await api.get('/admin/resources', { params });
  return response.data;
};

/**
 * Update a resource's moderation status (e.g. ARCHIVED, AVAILABLE) with optional reason.
 * @param {number|string} resourceId 
 * @param {string} status 
 * @param {string|null} reason
 * @returns {Promise<Object>} Updated resource data
 */
export const updateResourceStatus = async (resourceId, status, reason = null) => {
  const response = await api.patch(`/admin/resources/${resourceId}/status`, { status, reason });
  return response.data;
};

/**
 * Fetch paginated reports for moderation review.
 * @param {Object} params - Query params (page, limit, status, entity_type, search)
 * @returns {Promise<Object>} Reports data and pagination
 */
export const getAdminReports = async (params = {}) => {
  const response = await api.get('/admin/reports', { params });
  return response.data;
};

/**
 * Fetch single report details with target entity snapshot.
 * @param {number|string} reportId 
 * @returns {Promise<Object>}
 */
export const getReportDetails = async (reportId) => {
  const response = await api.get(`/admin/reports/${reportId}`);
  return response.data;
};

/**
 * Update a report's status and resolution notes.
 * @param {number|string} reportId 
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export const updateReportStatus = async (reportId, payload) => {
  const response = await api.patch(`/admin/reports/${reportId}/status`, payload);
  return response.data;
};

/**
 * Fetch detailed reputation inspection breakdown for a user.
 * @param {number|string} userId 
 * @returns {Promise<Object>} Reputation breakdown data
 */
export const getAdminUserReputation = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/reputation`);
  return response.data;
};

/**
 * Fetch audit logs with filtering and pagination.
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/audit-logs', { params });
  return response.data;
};

/**
 * Fetch user-specific moderation history.
 * @param {number|string} userId 
 * @returns {Promise<Object>}
 */
export const getUserModerationHistory = async (userId) => {
  const response = await api.get(`/admin/users/${userId}/moderation-history`);
  return response.data;
};

/**
 * Fetch resource-specific moderation history.
 * @param {number|string} resourceId 
 * @returns {Promise<Object>}
 */
export const getResourceModerationHistory = async (resourceId) => {
  const response = await api.get(`/admin/resources/${resourceId}/moderation-history`);
  return response.data;
};

/**
 * Fetch all reports filed against a specific resource.
 * @param {number|string} resourceId 
 * @returns {Promise<Object>}
 */
export const getResourceReports = async (resourceId) => {
  const response = await api.get(`/admin/resources/${resourceId}/reports`);
  return response.data;
};

export default {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  getAdminResources,
  updateResourceStatus,
  getAdminReports,
  getReportDetails,
  updateReportStatus,
  getAdminUserReputation,
  getAuditLogs,
  getUserModerationHistory,
  getResourceModerationHistory,
  getResourceReports
};
