const express = require('express');
const router = express.Router();
const { 
  getMyProfile, 
  updateMyProfile, 
  getUserProfileById,
  getUserReputation 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Authenticated current user profile endpoints (supports /api/users/profile and /api/profile)
router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);
router.get('/', protect, getMyProfile);
router.put('/', protect, updateMyProfile);

// Reputation breakdown endpoint
router.get('/:id/reputation', protect, getUserReputation);

// Public user profile endpoint
router.get('/:id', protect, getUserProfileById);

module.exports = router;
