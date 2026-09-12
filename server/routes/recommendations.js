const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { optionalAuth, protect } = require('../middleware/authMiddleware');

// Public/Optional Auth Endpoints
router.get('/personalized', optionalAuth, recommendationController.getPersonalizedRecommendations);
router.get('/similar/:id', optionalAuth, recommendationController.getSimilarResources);
router.get('/category/:categoryId', optionalAuth, recommendationController.getCategoryRecommendations);

// Root recommendation endpoint
router.get('/', optionalAuth, recommendationController.getPersonalizedRecommendations);

module.exports = router;
