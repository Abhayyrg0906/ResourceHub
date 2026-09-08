const db = require('../config/database');

/**
 * Get all items in the authenticated user's wishlist
 */
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        w.created_at AS saved_at,
        r.id,
        r.owner_id,
        r.title,
        r.description,
        r.category_id,
        c.name AS category_name,
        r.exchange_type,
        r.price,
        r.item_condition,
        r.meetup_location,
        r.status,
        r.created_at,
        u.name AS owner_name,
        u.email AS owner_email,
        u.trust_score AS owner_trust_score,
        u.department AS owner_department,
        (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = 1 LIMIT 1) AS image_url
      FROM wishlist w
      JOIN resources r ON w.resource_id = r.id
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.owner_id = u.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;

    const [rows] = await db.query(sql, [userId]);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[WishlistController] Error in getWishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist items.'
    });
  }
};

/**
 * Get lightweight array of resource IDs currently saved in the user's wishlist
 */
const getWishlistIds = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      'SELECT resource_id FROM wishlist WHERE user_id = ?',
      [userId]
    );

    const ids = rows.map(r => r.resource_id);

    return res.status(200).json({
      success: true,
      ids,
      data: ids
    });
  } catch (error) {
    console.error('[WishlistController] Error in getWishlistIds:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist IDs.'
    });
  }
};

/**
 * Check if a specific resource is in the user's wishlist
 */
const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const resourceId = parseInt(req.params.resourceId, 10);

    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID.'
      });
    }

    const [rows] = await db.query(
      'SELECT 1 FROM wishlist WHERE user_id = ? AND resource_id = ?',
      [userId, resourceId]
    );

    return res.status(200).json({
      success: true,
      inWishlist: rows.length > 0
    });
  } catch (error) {
    console.error('[WishlistController] Error in checkWishlistStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status.'
    });
  }
};

/**
 * Add a resource to the user's wishlist
 */
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawId = req.params.resourceId || req.body.resourceId || req.body.resource_id;
    const resourceId = parseInt(rawId, 10);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid resource ID is required.'
      });
    }

    // Validate resource existence
    const [resRows] = await db.query(
      'SELECT id, title, status FROM resources WHERE id = ?',
      [resourceId]
    );

    if (!resRows || resRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    // Check if already in wishlist (duplicate prevention)
    const [existing] = await db.query(
      'SELECT 1 FROM wishlist WHERE user_id = ? AND resource_id = ?',
      [userId, resourceId]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Resource is already in your wishlist.',
        inWishlist: true
      });
    }

    await db.query(
      'INSERT INTO wishlist (user_id, resource_id) VALUES (?, ?)',
      [userId, resourceId]
    );

    return res.status(201).json({
      success: true,
      message: 'Resource added to wishlist.',
      inWishlist: true
    });
  } catch (error) {
    console.error('[WishlistController] Error in addToWishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add resource to wishlist.'
    });
  }
};

/**
 * Remove a resource from the user's wishlist
 */
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawId = req.params.resourceId || req.body.resourceId || req.body.resource_id;
    const resourceId = parseInt(rawId, 10);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid resource ID is required.'
      });
    }

    const [result] = await db.query(
      'DELETE FROM wishlist WHERE user_id = ? AND resource_id = ?',
      [userId, resourceId]
    );

    return res.status(200).json({
      success: true,
      message: 'Resource removed from wishlist.',
      inWishlist: false,
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('[WishlistController] Error in removeFromWishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove resource from wishlist.'
    });
  }
};

/**
 * Toggle a resource in the user's wishlist (adds if absent, removes if present)
 */
const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawId = req.params.resourceId || req.body.resourceId || req.body.resource_id;
    const resourceId = parseInt(rawId, 10);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid resource ID is required.'
      });
    }

    // Validate resource existence
    const [resRows] = await db.query(
      'SELECT id, title, status FROM resources WHERE id = ?',
      [resourceId]
    );

    if (!resRows || resRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    // Check if currently wishlisted
    const [existing] = await db.query(
      'SELECT 1 FROM wishlist WHERE user_id = ? AND resource_id = ?',
      [userId, resourceId]
    );

    if (existing.length > 0) {
      await db.query(
        'DELETE FROM wishlist WHERE user_id = ? AND resource_id = ?',
        [userId, resourceId]
      );

      return res.status(200).json({
        success: true,
        message: 'Resource removed from wishlist.',
        inWishlist: false
      });
    } else {
      await db.query(
        'INSERT INTO wishlist (user_id, resource_id) VALUES (?, ?)',
        [userId, resourceId]
      );

      return res.status(200).json({
        success: true,
        message: 'Resource added to wishlist.',
        inWishlist: true
      });
    }
  } catch (error) {
    console.error('[WishlistController] Error in toggleWishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle wishlist item.'
    });
  }
};

module.exports = {
  getWishlist,
  getWishlistIds,
  checkWishlistStatus,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist
};
