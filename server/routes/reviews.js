const express = require('express');
const router = express.Router();
const { 
  createReview, 
  getUserReviews, 
  getTransactionReviews 
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Authenticated route
router.post('/', protect, createReview);

// Public read-only routes
router.get('/user/:userId', getUserReviews);
router.get('/transaction/:transactionId', getTransactionReviews);

module.exports = router;
