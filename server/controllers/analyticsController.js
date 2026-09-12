const db = require('../config/database');
const reputationService = require('../services/reputationService');

/**
 * 1. Get User-Scoped Student Dashboard Analytics
 * GET /api/analytics/student
 * GET /api/analytics/me
 */
const getStudentAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch User Record
    const [userRows] = await db.query(
      'SELECT id, name, email, trust_score, reputation_score, status, department, year_of_study FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = userRows[0];

    // 2. Aggregate Listings Stats
    const [[listingsRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_listings,
        COALESCE(SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_listings,
        COALESCE(SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END), 0) AS reserved_listings,
        COALESCE(SUM(CASE WHEN status = 'EXCHANGED' THEN 1 ELSE 0 END), 0) AS exchanged_listings,
        COALESCE(SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END), 0) AS archived_listings
      FROM resources
      WHERE owner_id = ?`,
      [userId]
    );

    // 3. Aggregate Exchange Requests Stats
    const [[exchangesRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_requests,
        COALESCE(SUM(CASE WHEN er.status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_exchanges,
        COALESCE(SUM(CASE WHEN er.status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_requests,
        COALESCE(SUM(CASE WHEN er.status = 'ACCEPTED' THEN 1 ELSE 0 END), 0) AS accepted_requests,
        COALESCE(SUM(CASE WHEN er.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_requests,
        COALESCE(SUM(CASE WHEN er.status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected_requests,
        COALESCE(SUM(CASE WHEN er.status = 'COMPLETED' AND r.owner_id = ? THEN 1 ELSE 0 END), 0) AS completed_as_owner,
        COALESCE(SUM(CASE WHEN er.status = 'COMPLETED' AND er.requester_id = ? THEN 1 ELSE 0 END), 0) AS completed_as_requester,
        COALESCE(SUM(CASE WHEN er.status = 'PENDING' AND r.owner_id = ? THEN 1 ELSE 0 END), 0) AS incoming_pending,
        COALESCE(SUM(CASE WHEN er.status = 'PENDING' AND er.requester_id = ? THEN 1 ELSE 0 END), 0) AS outgoing_pending
      FROM exchange_requests er
      JOIN resources r ON er.resource_id = r.id
      WHERE (er.requester_id = ? OR r.owner_id = ?)`,
      [userId, userId, userId, userId, userId, userId]
    );

    // 4. Aggregate QR Handover Verifications
    const [[qrRow]] = await db.query(
      `SELECT 
        COUNT(DISTINCT qv.id) AS successful_qr_handovers,
        COALESCE(SUM(CASE WHEN r.owner_id = ? THEN 1 ELSE 0 END), 0) AS qr_as_owner,
        COALESCE(SUM(CASE WHEN er.requester_id = ? THEN 1 ELSE 0 END), 0) AS qr_as_requester
      FROM qr_verifications qv
      JOIN exchange_requests er ON qv.transaction_id = er.id
      JOIN resources r ON er.resource_id = r.id
      WHERE (er.requester_id = ? OR r.owner_id = ?)
        AND qv.status = 'VERIFIED'
        AND er.status = 'COMPLETED'`,
      [userId, userId, userId, userId]
    );

    // 5. Aggregate Reviews Received
    const [[reviewsRow]] = await db.query(
      `SELECT 
        COUNT(*) AS reviews_received,
        COALESCE(AVG(rating), 0) AS raw_avg_rating
      FROM reviews
      WHERE reviewed_id = ?`,
      [userId]
    );

    // 6. Wishlist Count
    const [[wishlistRow]] = await db.query(
      `SELECT COUNT(*) AS wishlist_count
      FROM wishlist
      WHERE user_id = ?`,
      [userId]
    );

    // 7. Fetch Recent Actionable Pending Incoming Requests (max 5)
    const [actionableRequests] = await db.query(
      `SELECT 
        er.id, er.resource_id, er.requester_id, er.created_at,
        r.title AS resource_title, r.exchange_type, r.price,
        u.name AS requester_name, u.trust_score AS requester_trust_score
      FROM exchange_requests er
      JOIN resources r ON er.resource_id = r.id
      JOIN users u ON er.requester_id = u.id
      WHERE r.owner_id = ? AND er.status = 'PENDING'
      ORDER BY er.created_at DESC
      LIMIT 5`,
      [userId]
    );

    // 8. Fetch Recent Active Listings (max 5)
    const [recentListings] = await db.query(
      `SELECT 
        r.id, r.title, r.exchange_type, r.price, r.item_condition, r.status, r.created_at,
        c.name AS category_name,
        (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url
      FROM resources r
      JOIN categories c ON r.category_id = c.id
      WHERE r.owner_id = ? AND r.status = 'AVAILABLE'
      ORDER BY r.created_at DESC
      LIMIT 5`,
      [userId]
    );

    // Parse and format numeric values safely
    const totalListings = parseInt(listingsRow.total_listings, 10) || 0;
    const availableListings = parseInt(listingsRow.available_listings, 10) || 0;
    const completedExchanges = parseInt(exchangesRow.completed_exchanges, 10) || 0;
    const pendingRequests = parseInt(exchangesRow.pending_requests, 10) || 0;
    const successfulQrHandovers = parseInt(qrRow.successful_qr_handovers, 10) || 0;
    const reviewsReceived = parseInt(reviewsRow.reviews_received, 10) || 0;
    const averageRatingReceived = parseFloat(Number(reviewsRow.raw_avg_rating).toFixed(2));
    const trustScore = parseFloat(Number(user.trust_score || 100.00).toFixed(2));
    const reputationScore = parseFloat(Number(user.reputation_score !== undefined && user.reputation_score !== null ? user.reputation_score : trustScore).toFixed(2));
    const wishlistCount = parseInt(wishlistRow.wishlist_count, 10) || 0;

    // Reputation Tier Determination
    let tier = 'Trusted Peer';
    if (user.status === 'SUSPENDED' || reputationScore < 25.0) {
      tier = 'Restricted / Caution';
    } else if (reputationScore >= 90.0) {
      tier = 'Elite Exchanger';
    } else if (reputationScore >= 75.0) {
      tier = 'Trusted Peer';
    } else if (reputationScore >= 50.0) {
      tier = 'Active Member';
    } else {
      tier = 'Needs Improvement';
    }

    return res.status(200).json({
      success: true,
      data: {
        // Direct top-level fields required by user prompt
        total_listings: totalListings,
        available_listings: availableListings,
        completed_exchanges: completedExchanges,
        pending_requests: pendingRequests,
        successful_qr_handovers: successfulQrHandovers,
        reviews_received: reviewsReceived,
        average_rating_received: averageRatingReceived,
        trust_score: trustScore,
        reputation_score: reputationScore,
        reputation_tier: tier,
        wishlist_count: wishlistCount,

        // Detailed breakdowns for rich interactive UI
        listings_breakdown: {
          total: totalListings,
          available: availableListings,
          reserved: parseInt(listingsRow.reserved_listings, 10) || 0,
          exchanged: parseInt(listingsRow.exchanged_listings, 10) || 0,
          archived: parseInt(listingsRow.archived_listings, 10) || 0
        },
        exchanges_breakdown: {
          total: parseInt(exchangesRow.total_requests, 10) || 0,
          completed: completedExchanges,
          pending: pendingRequests,
          accepted: parseInt(exchangesRow.accepted_requests, 10) || 0,
          cancelled: parseInt(exchangesRow.cancelled_requests, 10) || 0,
          rejected: parseInt(exchangesRow.rejected_requests, 10) || 0,
          completed_as_owner: parseInt(exchangesRow.completed_as_owner, 10) || 0,
          completed_as_requester: parseInt(exchangesRow.completed_as_requester, 10) || 0,
          incoming_pending: parseInt(exchangesRow.incoming_pending, 10) || 0,
          outgoing_pending: parseInt(exchangesRow.outgoing_pending, 10) || 0
        },
        qr_breakdown: {
          total_verified: successfulQrHandovers,
          as_owner: parseInt(qrRow.qr_as_owner, 10) || 0,
          as_requester: parseInt(qrRow.qr_as_requester, 10) || 0
        },

        // Actionable feeds
        actionable_pending_requests: actionableRequests,
        recent_active_listings: recentListings
      }
    });

  } catch (error) {
    console.error('Error fetching student analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching student analytics.'
    });
  }
};

/**
 * 2. Get Platform-Wide Admin Dashboard Analytics
 * GET /api/analytics/admin
 * GET /api/admin/analytics
 */
const getAdminAnalytics = async (req, res) => {
  try {
    // 1. Users Statistics
    const [[usersRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_users,
        COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0) AS active_users,
        COALESCE(SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END), 0) AS suspended_users,
        COALESCE(SUM(CASE WHEN status = 'PENDING_VERIFICATION' THEN 1 ELSE 0 END), 0) AS pending_verification_users,
        COALESCE(SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END), 0) AS student_users,
        COALESCE(SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END), 0) AS admin_users
      FROM users`
    );

    // 2. Resources Statistics
    const [[resourcesRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_resources,
        COALESCE(SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END), 0) AS available_resources,
        COALESCE(SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END), 0) AS reserved_resources,
        COALESCE(SUM(CASE WHEN status = 'EXCHANGED' THEN 1 ELSE 0 END), 0) AS exchanged_resources,
        COALESCE(SUM(CASE WHEN status = 'ARCHIVED' THEN 1 ELSE 0 END), 0) AS archived_resources,
        COALESCE(SUM(CASE WHEN exchange_type = 'SELL' THEN 1 ELSE 0 END), 0) AS sell_resources,
        COALESCE(SUM(CASE WHEN exchange_type = 'BORROW' THEN 1 ELSE 0 END), 0) AS borrow_resources,
        COALESCE(SUM(CASE WHEN exchange_type = 'DONATE' THEN 1 ELSE 0 END), 0) AS donate_resources,
        COALESCE(SUM(CASE WHEN exchange_type = 'SWAP' THEN 1 ELSE 0 END), 0) AS swap_resources
      FROM resources`
    );

    // 3. Exchange Statistics & Completion Rate
    const [[exchangesRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_exchange_requests,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_requests,
        COALESCE(SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END), 0) AS accepted_requests,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_exchanges,
        COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_requests,
        COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected_requests
      FROM exchange_requests`
    );

    const completed = parseInt(exchangesRow.completed_exchanges, 10) || 0;
    const cancelled = parseInt(exchangesRow.cancelled_requests, 10) || 0;
    const totalRequests = parseInt(exchangesRow.total_exchange_requests, 10) || 0;

    // Completion Rate formula: Completed / (Completed + Cancelled) * 100
    let completionRate = 100.0;
    if (completed + cancelled > 0) {
      completionRate = parseFloat(((completed / (completed + cancelled)) * 100).toFixed(1));
    }

    // Fulfillment Rate formula: Completed / Total Requests * 100
    let fulfillmentRate = 0.0;
    if (totalRequests > 0) {
      fulfillmentRate = parseFloat(((completed / totalRequests) * 100).toFixed(1));
    }

    // 4. QR Verification Statistics
    const [[qrRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_qr_generated,
        COALESCE(SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END), 0) AS verified_qr_codes,
        COALESCE(SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END), 0) AS expired_qr_codes,
        COALESCE(SUM(CASE WHEN status = 'GENERATED' THEN 1 ELSE 0 END), 0) AS active_qr_codes
      FROM qr_verifications`
    );

    const qrVerified = parseInt(qrRow.verified_qr_codes, 10) || 0;
    const qrExpired = parseInt(qrRow.expired_qr_codes, 10) || 0;
    let qrVerificationRate = 100.0;
    if (qrVerified + qrExpired > 0) {
      qrVerificationRate = parseFloat(((qrVerified / (qrVerified + qrExpired)) * 100).toFixed(1));
    }

    // 5. Reviews Statistics & Distribution
    const [[reviewsRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_reviews,
        COALESCE(AVG(rating), 0) AS raw_avg_rating,
        COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS five_stars,
        COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS four_stars,
        COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS three_stars,
        COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS two_stars,
        COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS one_star
      FROM reviews`
    );

    // 6. Reports & Moderation Statistics
    const [[reportsRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_reports,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_reports,
        COALESCE(SUM(CASE WHEN status = 'UNDER_REVIEW' THEN 1 ELSE 0 END), 0) AS under_review_reports,
        COALESCE(SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END), 0) AS resolved_reports,
        COALESCE(SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END), 0) AS dismissed_reports
      FROM reports`
    );

    // 7. Notifications Activity
    const [[notificationsRow]] = await db.query(
      `SELECT 
        COUNT(*) AS total_notifications_sent,
        COALESCE(SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_notifications,
        COALESCE(SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END), 0) AS read_notifications
      FROM notifications`
    );

    const [topNotificationTypes] = await db.query(
      `SELECT notification_type, COUNT(*) AS count
      FROM notifications
      GROUP BY notification_type
      ORDER BY count DESC
      LIMIT 6`
    );

    // Preserve exact top-level fields for backwards compatibility with M10/M11 tests
    return res.status(200).json({
      success: true,
      data: {
        total_users: parseInt(usersRow.total_users, 10) || 0,
        active_users: parseInt(usersRow.active_users, 10) || 0,
        suspended_users: parseInt(usersRow.suspended_users, 10) || 0,
        pending_verification_users: parseInt(usersRow.pending_verification_users, 10) || 0,
        total_resources: parseInt(resourcesRow.total_resources, 10) || 0,
        available_resources: parseInt(resourcesRow.available_resources, 10) || 0,
        total_exchange_requests: totalRequests,
        completed_exchanges: completed,
        pending_reports: parseInt(reportsRow.pending_reports, 10) || 0,
        completion_rate: completionRate,
        fulfillment_rate: fulfillmentRate,

        // Comprehensive detailed M19 categories
        users: {
          total: parseInt(usersRow.total_users, 10) || 0,
          active: parseInt(usersRow.active_users, 10) || 0,
          suspended: parseInt(usersRow.suspended_users, 10) || 0,
          pending_verification: parseInt(usersRow.pending_verification_users, 10) || 0,
          students: parseInt(usersRow.student_users, 10) || 0,
          admins: parseInt(usersRow.admin_users, 10) || 0
        },
        resources: {
          total: parseInt(resourcesRow.total_resources, 10) || 0,
          available: parseInt(resourcesRow.available_resources, 10) || 0,
          reserved: parseInt(resourcesRow.reserved_resources, 10) || 0,
          exchanged: parseInt(resourcesRow.exchanged_resources, 10) || 0,
          archived: parseInt(resourcesRow.archived_resources, 10) || 0,
          exchange_types: {
            sell: parseInt(resourcesRow.sell_resources, 10) || 0,
            borrow: parseInt(resourcesRow.borrow_resources, 10) || 0,
            donate: parseInt(resourcesRow.donate_resources, 10) || 0,
            swap: parseInt(resourcesRow.swap_resources, 10) || 0
          }
        },
        exchanges: {
          total: totalRequests,
          pending: parseInt(exchangesRow.pending_requests, 10) || 0,
          accepted: parseInt(exchangesRow.accepted_requests, 10) || 0,
          completed: completed,
          cancelled: cancelled,
          rejected: parseInt(exchangesRow.rejected_requests, 10) || 0,
          completion_rate: completionRate,
          fulfillment_rate: fulfillmentRate
        },
        qr_verifications: {
          total_generated: parseInt(qrRow.total_qr_generated, 10) || 0,
          verified: qrVerified,
          expired: qrExpired,
          active: parseInt(qrRow.active_qr_codes, 10) || 0,
          verification_rate: qrVerificationRate
        },
        reviews: {
          total: parseInt(reviewsRow.total_reviews, 10) || 0,
          average_rating: parseFloat(Number(reviewsRow.raw_avg_rating).toFixed(2)),
          distribution: {
            5: parseInt(reviewsRow.five_stars, 10) || 0,
            4: parseInt(reviewsRow.four_stars, 10) || 0,
            3: parseInt(reviewsRow.three_stars, 10) || 0,
            2: parseInt(reviewsRow.two_stars, 10) || 0,
            1: parseInt(reviewsRow.one_star, 10) || 0
          }
        },
        reports: {
          total: parseInt(reportsRow.total_reports, 10) || 0,
          pending: parseInt(reportsRow.pending_reports, 10) || 0,
          under_review: parseInt(reportsRow.under_review_reports, 10) || 0,
          resolved: parseInt(reportsRow.resolved_reports, 10) || 0,
          dismissed: parseInt(reportsRow.dismissed_reports, 10) || 0
        },
        notifications: {
          total: parseInt(notificationsRow.total_notifications_sent, 10) || 0,
          unread: parseInt(notificationsRow.unread_notifications, 10) || 0,
          read: parseInt(notificationsRow.read_notifications, 10) || 0,
          by_type: topNotificationTypes
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching admin analytics.'
    });
  }
};

module.exports = {
  getStudentAnalytics,
  getAdminAnalytics
};
