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
 * Update a user's status (ACTIVE, SUSPENDED, PENDING_VERIFICATION).
 * @param {number|string} userId 
 * @param {string} status 
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserStatus = async (userId, status) => {
  const response = await api.patch(`/admin/users/${userId}/status`, { status });
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
 * Update a resource's moderation status (e.g. ARCHIVED).
 * @param {number|string} resourceId 
 * @param {string} status 
 * @returns {Promise<Object>} Updated resource data
 */
export const updateResourceStatus = async (resourceId, status) => {
  const response = await api.patch(`/admin/resources/${resourceId}/status`, { status });
  return response.data;
};

/**
 * Fetch paginated reports for moderation review.
 * @param {Object} params - Query params (page, limit, status, entity_type)
 * @returns {Promise<Object>} Reports data and pagination
 */
export const getAdminReports = async (params = {}) => {
  const response = await api.get('/admin/reports', { params });
  return response.data;
};

/**
 * Update a report's status and resolution notes.
 * @param {number|string} reportId 
 * @param {Object} payload - { status, admin_resolution, archive_resource }
 * @returns {Promise<Object>} Updated report data
 */
export const updateReportStatus = async (reportId, payload) => {
  const response = await api.patch(`/admin/reports/${reportId}/status`, payload);
  return response.data;
};
