import api from './api';

export const createRequest = async (payload) => {
  const response = await api.post('/exchange-requests', payload);
  return response.data;
};

export const getRequests = async (params) => {
  const response = await api.get('/exchange-requests', { params });
  return response.data;
};

export const getRequestById = async (id) => {
  const response = await api.get(`/exchange-requests/${id}`);
  return response.data;
};

export const cancelRequest = async (id) => {
  const response = await api.put(`/exchange-requests/${id}/cancel`);
  return response.data;
};

export const acceptRequest = async (id) => {
  const response = await api.put(`/exchange-requests/${id}/accept`);
  return response.data;
};

export const rejectRequest = async (id) => {
  const response = await api.put(`/exchange-requests/${id}/reject`);
  return response.data;
};

export const completeRequest = async (id) => {
  const response = await api.put(`/exchange-requests/${id}/complete`);
  return response.data;
};
