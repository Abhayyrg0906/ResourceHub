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
