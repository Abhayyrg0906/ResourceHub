const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// All wishlist routes require JWT authentication
router.use(protect);

router.get('/', wishlistController.getWishlist);
router.get('/ids', wishlistController.getWishlistIds);
router.get('/check/:resourceId', wishlistController.checkWishlistStatus);

// Toggle support
router.post('/toggle', wishlistController.toggleWishlist);
router.post('/:resourceId/toggle', wishlistController.toggleWishlist);

// Explicit Add / Remove
router.post('/', wishlistController.addToWishlist);
router.post('/:resourceId', wishlistController.addToWishlist);
router.delete('/:resourceId', wishlistController.removeFromWishlist);

module.exports = router;
