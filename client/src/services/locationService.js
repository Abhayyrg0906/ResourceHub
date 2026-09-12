import api from './api';

/**
 * Fetch all verified safe campus locations (optionally filtered by category)
 * @param {Object} params { category }
 * @returns {Promise<Object>}
 */
export const getCampusLocations = async (params = {}) => {
  const response = await api.get('/locations/campus', { params });
  return response.data;
};

/**
 * Search campus locations by text query
 * @param {string} q 
 * @returns {Promise<Object>}
 */
export const searchCampusLocations = async (q) => {
  const response = await api.get('/locations/search', { params: { q } });
  return response.data;
};

export default {
  getCampusLocations,
  searchCampusLocations
};
