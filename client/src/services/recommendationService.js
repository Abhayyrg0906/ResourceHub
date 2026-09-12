import api from './api';

/**
 * Fetch personalized recommendations (or cold-start campus recommendations if guest)
 * @param {Object} params { limit, exclude_ids }
 * @returns {Promise<Object>}
 */
export const getPersonalizedRecommendations = async (params = {}) => {
  const response = await api.get('/recommendations/personalized', { params });
  return response.data;
};

/**
 * Fetch similar resources for a specific item
 * @param {number|string} resourceId 
 * @param {Object} params { limit }
 * @returns {Promise<Object>}
 */
export const getSimilarResources = async (resourceId, params = {}) => {
  const response = await api.get(`/recommendations/similar/${resourceId}`, { params });
  return response.data;
};

/**
 * Fetch recommendations within a specific category
 * @param {number|string} categoryId 
 * @param {Object} params { limit, exclude_id }
 * @returns {Promise<Object>}
 */
export const getCategoryRecommendations = async (categoryId, params = {}) => {
  const response = await api.get(`/recommendations/category/${categoryId}`, { params });
  return response.data;
};

export default {
  getPersonalizedRecommendations,
  getSimilarResources,
  getCategoryRecommendations
};
