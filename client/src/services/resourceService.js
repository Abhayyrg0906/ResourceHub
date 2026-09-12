import api from './api';

export const getResources = async (params) => {
  const response = await api.get('/resources', { params });
  return response.data;
};

export const getResourceById = async (id) => {
  const response = await api.get(`/resources/${id}`);
  return response.data;
};

export const createResource = async (payload) => {
  const response = await api.post('/resources', payload);
  return response.data;
};

export const updateResource = async (id, payload) => {
  const response = await api.put(`/resources/${id}`, payload);
  return response.data;
};

export const archiveResource = async (id) => {
  const response = await api.delete(`/resources/${id}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const uploadImages = async (formData) => {
  const response = await api.post('/resources/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const addResourceImage = async (resourceId, data) => {
  const isFormData = data instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
  const response = await api.post(`/resources/${resourceId}/images`, data, config);
  return response.data;
};

export const setPrimaryImage = async (resourceId, imageId) => {
  const response = await api.patch(`/resources/${resourceId}/images/${imageId}/primary`);
  return response.data;
};

export const deleteResourceImage = async (resourceId, imageId) => {
  const response = await api.delete(`/resources/${resourceId}/images/${imageId}`);
  return response.data;
};

