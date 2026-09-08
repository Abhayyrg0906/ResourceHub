import api from './api';

export const wishlistService = {
  getWishlist: async () => {
    const res = await api.get('/wishlist');
    return res.data;
  },

  getWishlistIds: async () => {
    const res = await api.get('/wishlist/ids');
    return res.data;
  },

  checkWishlistStatus: async (resourceId) => {
    const res = await api.get(`/wishlist/check/${resourceId}`);
    return res.data;
  },

  toggleWishlist: async (resourceId) => {
    const res = await api.post(`/wishlist/${resourceId}/toggle`);
    return res.data;
  },

  addToWishlist: async (resourceId) => {
    const res = await api.post(`/wishlist/${resourceId}`);
    return res.data;
  },

  removeFromWishlist: async (resourceId) => {
    const res = await api.delete(`/wishlist/${resourceId}`);
    return res.data;
  }
};

export default wishlistService;
