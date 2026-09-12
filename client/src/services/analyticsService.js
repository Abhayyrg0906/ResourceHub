import api from './api';

/**
 * Fetch authenticated student dashboard analytics (user-scoped).
 * @returns {Promise<Object>} Student analytics data
 */
export const getStudentAnalytics = async () => {
  const response = await api.get('/analytics/student');
  return response.data;
};

/**
 * Fetch platform-wide administrator analytics (requires admin session).
 * @returns {Promise<Object>} Admin analytics data
 */
export const getAdminAnalytics = async () => {
  const response = await api.get('/analytics/admin');
  return response.data;
};

export default {
  getStudentAnalytics,
  getAdminAnalytics
};
