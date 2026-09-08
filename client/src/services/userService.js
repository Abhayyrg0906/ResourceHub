import api from './api';

/**
 * Fetch authenticated user's complete profile with stats.
 */
export const getMyProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

/**
 * Update authenticated user's profile details.
 * Allowed fields: name, profile_photo_url, department, year_of_study, phone_number, bio.
 */
export const updateMyProfile = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

/**
 * Fetch public profile details of another user by their ID.
 */
export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export default {
  getMyProfile,
  updateMyProfile,
  getUserProfile
};
