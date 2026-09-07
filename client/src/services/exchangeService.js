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

export const generateQr = async (id) => {
  const response = await api.post(`/exchange-requests/${id}/qr`);
  return response.data;
};

export const verifyQr = async (id, verification_token) => {
  const response = await api.post(`/exchange-requests/${id}/qr/verify`, { verification_token });
  return response.data;
};

export const getQrStatus = async (id) => {
  const response = await api.get(`/exchange-requests/${id}/qr`);
  return response.data;
};

// Review & Ratings API calls
export const createReview = async ({ transaction_id, rating, review_text }) => {
  const payload = { transaction_id, rating };
  if (review_text !== undefined && review_text !== null && review_text.trim() !== '') {
    payload.review_text = review_text.trim();
  }
  const response = await api.post('/reviews', payload);
  return response.data;
};

export const getUserReviews = async (userId) => {
  const response = await api.get(`/reviews/user/${userId}`);
  return response.data;
};

export const getTransactionReviews = async (transactionId) => {
  const response = await api.get(`/reviews/transaction/${transactionId}`);
  return response.data;
};

