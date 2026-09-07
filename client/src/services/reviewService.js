import api from './api';

// Submit a review for a completed transaction
export const createReview = async ({ transaction_id, rating, review_text }) => {
  const payload = {
    transaction_id,
    rating
  };
  if (review_text !== undefined && review_text !== null && review_text.trim() !== '') {
    payload.review_text = review_text.trim();
  }
  const response = await api.post('/reviews', payload);
  return response.data;
};

// Retrieve all reviews and trust statistics for a given user
export const getUserReviews = async (userId) => {
  const response = await api.get(`/reviews/user/${userId}`);
  return response.data;
};

// Retrieve reviews associated with a specific exchange request/transaction
export const getTransactionReviews = async (transactionId) => {
  const response = await api.get(`/reviews/transaction/${transactionId}`);
  return response.data;
};
