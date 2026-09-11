const db = require('../config/database');
const reputationService = require('../services/reputationService');

/**
 * Helper to retrieve aggregated statistics for a user.
 * 
 * @param {number} userId 
 * @returns {Promise<{completed_exchanges: number, active_listings: number, review_count: number, average_rating: number}>}
 */
const getUserStats = async (userId) => {
  // 1. Completed Exchanges
  const [exchangeRows] = await db.query(
    `SELECT COUNT(*) AS completed_exchanges
     FROM exchange_requests er
     JOIN resources r ON er.resource_id = r.id
     WHERE er.status = 'COMPLETED' AND (er.requester_id = ? OR r.owner_id = ?)`,
    [userId, userId]
  );

  // 2. Active Listings
  const [listingRows] = await db.query(
    `SELECT COUNT(*) AS active_listings
     FROM resources
     WHERE owner_id = ? AND status = 'AVAILABLE'`,
    [userId]
  );

  // 3. Review Summary
  const [reviewRows] = await db.query(
    `SELECT COUNT(*) AS review_count, COALESCE(AVG(rating), 5.0) AS average_rating
     FROM reviews
     WHERE reviewed_id = ?`,
    [userId]
  );

  const rawAverage = parseFloat(reviewRows[0]?.average_rating || 5.0);
  const averageRating = parseFloat(rawAverage.toFixed(2));

  return {
    completed_exchanges: exchangeRows[0]?.completed_exchanges || 0,
    active_listings: listingRows[0]?.active_listings || 0,
    review_count: reviewRows[0]?.review_count || 0,
    average_rating: averageRating
  };
};

/**
 * GET /api/users/profile
 * Retrieves the full profile of the authenticated user.
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
        id, 
        name, 
        email, 
        profile_photo_url, 
        department, 
        year_of_study, 
        phone_number, 
        bio, 
        trust_score, 
        reputation_score,
        role, 
        status, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const user = rows[0];
    const stats = await getUserStats(userId);
    const reputation_breakdown = await reputationService.getReputationBreakdown(userId);

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_photo_url: user.profile_photo_url,
        department: user.department,
        year_of_study: user.year_of_study,
        phone_number: user.phone_number,
        bio: user.bio,
        trust_score: parseFloat(user.trust_score || 100.00),
        reputation_score: parseFloat(user.reputation_score !== undefined && user.reputation_score !== null ? user.reputation_score : (user.trust_score || 100.00)),
        reputation_breakdown,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        stats
      }
    });

  } catch (error) {
    console.error('[UserController] Error in getMyProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user profile.'
    });
  }
};

/**
 * PUT /api/users/profile
 * Updates editable profile fields for the authenticated user.
 * Strictly prevents modifications to id, role, trust_score, status, email, and password.
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, 
      profile_photo_url, 
      department, 
      year_of_study, 
      phone_number, 
      bio,
      // Extraneous sensitive fields to explicitly guard
      role,
      trust_score,
      status,
      password,
      password_hash,
      id
    } = req.body;

    const updateFields = [];
    const queryParams = [];

    // 1. Name validation
    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long.'
        });
      }
      updateFields.push('name = ?');
      queryParams.push(trimmedName);
    }

    // 2. Profile photo URL validation
    if (profile_photo_url !== undefined) {
      const trimmedPhoto = typeof profile_photo_url === 'string' ? profile_photo_url.trim() : null;
      if (trimmedPhoto && trimmedPhoto.length > 255) {
        return res.status(400).json({
          success: false,
          message: 'Profile photo URL cannot exceed 255 characters.'
        });
      }
      updateFields.push('profile_photo_url = ?');
      queryParams.push(trimmedPhoto || null);
    }

    // 3. Department validation
    if (department !== undefined) {
      const trimmedDept = typeof department === 'string' ? department.trim() : null;
      if (trimmedDept && trimmedDept.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Department name cannot exceed 100 characters.'
        });
      }
      updateFields.push('department = ?');
      queryParams.push(trimmedDept || null);
    }

    // 4. Year of study validation
    if (year_of_study !== undefined && year_of_study !== null && year_of_study !== '') {
      const parsedYear = parseInt(year_of_study, 10);
      if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 6) {
        return res.status(400).json({
          success: false,
          message: 'Year of study must be a number between 1 and 6.'
        });
      }
      updateFields.push('year_of_study = ?');
      queryParams.push(parsedYear);
    } else if (year_of_study === null || year_of_study === '') {
      updateFields.push('year_of_study = ?');
      queryParams.push(null);
    }

    // 5. Phone number validation
    if (phone_number !== undefined) {
      const trimmedPhone = typeof phone_number === 'string' ? phone_number.trim() : null;
      if (trimmedPhone && trimmedPhone.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Phone number cannot exceed 20 characters.'
        });
      }
      updateFields.push('phone_number = ?');
      queryParams.push(trimmedPhone || null);
    }

    // 6. Bio validation
    if (bio !== undefined) {
      const trimmedBio = typeof bio === 'string' ? bio.trim() : null;
      if (trimmedBio && trimmedBio.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 1000 characters.'
        });
      }
      updateFields.push('bio = ?');
      queryParams.push(trimmedBio || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields provided for update.'
      });
    }

    // Execute parameterized update
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    queryParams.push(userId);

    await db.query(sql, queryParams);

    // Retrieve updated profile and stats
    const [rows] = await db.query(
      `SELECT 
        id, 
        name, 
        email, 
        profile_photo_url, 
        department, 
        year_of_study, 
        phone_number, 
        bio, 
        trust_score, 
        reputation_score,
        role, 
        status, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    const updatedUser = rows[0];
    const stats = await getUserStats(userId);
    const reputation_breakdown = await reputationService.getReputationBreakdown(userId);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profile_photo_url: updatedUser.profile_photo_url,
        department: updatedUser.department,
        year_of_study: updatedUser.year_of_study,
        phone_number: updatedUser.phone_number,
        bio: updatedUser.bio,
        trust_score: parseFloat(updatedUser.trust_score || 100.00),
        reputation_score: parseFloat(updatedUser.reputation_score !== undefined && updatedUser.reputation_score !== null ? updatedUser.reputation_score : (updatedUser.trust_score || 100.00)),
        reputation_breakdown,
        role: updatedUser.role,
        status: updatedUser.status,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        stats
      }
    });

  } catch (error) {
    console.error('[UserController] Error in updateMyProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile.'
    });
  }
};

/**
 * GET /api/users/:id
 * Retrieves the public profile of a user.
 * Strictly excludes password_hash and sensitive authentication information.
 */
const getUserProfileById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID parameter.'
      });
    }

    // Retrieve sanitized public user record
    const [users] = await db.query(
      `SELECT 
        id, 
        name, 
        profile_photo_url, 
        department, 
        year_of_study, 
        bio, 
        trust_score, 
        reputation_score,
        role, 
        status,
        created_at
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    const user = users[0];

    // Block public profile if user is suspended
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'This user profile is suspended.'
      });
    }

    // Retrieve user stats and reputation breakdown
    const stats = await getUserStats(userId);
    const reputation_breakdown = await reputationService.getReputationBreakdown(userId);

    // Retrieve active resources listed by this user
    const [activeListings] = await db.query(
      `SELECT 
        r.id, 
        r.title, 
        r.description, 
        r.exchange_type, 
        r.price, 
        r.item_condition, 
        r.status, 
        r.created_at, 
        c.name AS category,
        (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = TRUE LIMIT 1) AS image_url
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      WHERE r.owner_id = ? AND r.status = 'AVAILABLE'
      ORDER BY r.created_at DESC
      LIMIT 12`,
      [userId]
    );

    // Retrieve reviews received by this user
    const [reviews] = await db.query(
      `SELECT 
        r.id, 
        r.rating, 
        r.review_text, 
        r.created_at, 
        u.name AS reviewer_name, 
        u.id AS reviewer_id,
        u.profile_photo_url AS reviewer_photo_url
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewed_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        profile_photo_url: user.profile_photo_url,
        department: user.department,
        year_of_study: user.year_of_study,
        bio: user.bio,
        trust_score: parseFloat(user.trust_score || 100.00),
        reputation_score: parseFloat(user.reputation_score !== undefined && user.reputation_score !== null ? user.reputation_score : (user.trust_score || 100.00)),
        reputation_breakdown,
        created_at: user.created_at,
        stats,
        active_listings: activeListings.map(item => ({
          ...item,
          price: item.price !== null ? parseFloat(item.price) : null
        })),
        reviews
      }
    });

  } catch (error) {
    console.error('[UserController] Error in getUserProfileById:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching public profile.'
    });
  }
};

/**
 * GET /api/users/:id/reputation
 * Retrieves the transparent reputation breakdown for a user.
 */
const getUserReputation = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID parameter.'
      });
    }

    const breakdown = await reputationService.getReputationBreakdown(userId);
    return res.status(200).json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    console.error('[UserController] Error in getUserReputation:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching reputation breakdown.'
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfileById,
  getUserReputation
};
