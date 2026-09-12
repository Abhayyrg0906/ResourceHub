const recommendationService = require('../services/recommendationService');

/**
 * RESOURCEHUB — M20: RECOMMENDATION CONTROLLER
 */

/**
 * Get personalized recommendations for current student (or cold start if guest)
 * GET /api/recommendations/personalized
 * GET /api/recommendations
 */
const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const limit = parseInt(req.query.limit, 10) || 6;
    
    let excludeIds = [];
    if (req.query.exclude_ids) {
      if (Array.isArray(req.query.exclude_ids)) {
        excludeIds = req.query.exclude_ids.map(Number).filter(Boolean);
      } else if (typeof req.query.exclude_ids === 'string') {
        excludeIds = req.query.exclude_ids.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
      }
    }

    const recommendations = await recommendationService.getPersonalizedRecommendations(userId, {
      limit,
      excludeIds
    });

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('[RecommendationController] Error in getPersonalizedRecommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating recommendations.'
    });
  }
};

/**
 * Get similar resources for a specific resource
 * GET /api/recommendations/similar/:id
 * GET /api/resources/:id/similar
 */
const getSimilarResources = async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id || req.params.resourceId, 10);
    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.'
      });
    }

    const userId = req.user ? req.user.id : null;
    const limit = parseInt(req.query.limit, 10) || 4;

    const similarItems = await recommendationService.getSimilarResources(resourceId, userId, { limit });

    return res.status(200).json({
      success: true,
      count: similarItems.length,
      data: similarItems
    });
  } catch (error) {
    console.error('[RecommendationController] Error in getSimilarResources:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching similar resources.'
    });
  }
};

/**
 * Get recommendations within a specific category
 * GET /api/recommendations/category/:categoryId
 */
const getCategoryRecommendations = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId || req.params.id, 10);
    if (!categoryId || isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID.'
      });
    }

    const userId = req.user ? req.user.id : null;
    const limit = parseInt(req.query.limit, 10) || 6;
    const excludeId = req.query.exclude_id ? parseInt(req.query.exclude_id, 10) : null;

    const items = await recommendationService.getCategoryRecommendations(categoryId, userId, {
      limit,
      excludeId
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('[RecommendationController] Error in getCategoryRecommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching category recommendations.'
    });
  }
};

module.exports = {
  getPersonalizedRecommendations,
  getSimilarResources,
  getCategoryRecommendations
};
