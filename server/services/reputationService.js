const db = require('../config/database');

/**
 * ====================================================================
 * RESOURCEHUB — M17: ENHANCED TRUST & REPUTATION SYSTEM SERVICE
 * ====================================================================
 * 
 * DESIGN SPECIFICATION & FORMULA:
 * 
 * The enhanced reputation model evaluates 4 weighted, transparent factors:
 * 
 * 1. Review Quality (40% weight - max 40.0 pts):
 *    - Derived from peer review ratings (1.00 to 5.00 stars).
 *    - If user has reviews (N > 0):
 *        Review Score = (Average Rating / 5.00) * 100
 *    - If user has 0 reviews:
 *        Review Score = 100.00 (Neutral baseline trust for new members)
 *    - Contribution = Review Score * 0.40
 * 
 * 2. Completed Exchanges (30% weight - max 30.0 pts):
 *    - Rewards positive track record and volume of campus exchanges.
 *    - Benchmark: 5 completed transactions = 100% volume maturity.
 *    - Volume Score = min(100, (Completed Count / 5) * 100)
 *    - QR Handover Bonus: If completed > 0, verified QR ratio gives bonus factor:
 *        Exchange Score = min(100, Volume Score * (0.80 + 0.20 * (QR Verified / Completed)))
 *    - If Completed = 0: Exchange Score = 0.00
 *    - Contribution = Exchange Score * 0.30
 * 
 * 3. Reliability & Fulfillment (20% weight - max 20.0 pts):
 *    - Measures commitment and non-cancellation rate on initiated exchanges.
 *    - Total Decided = Completed Exchanges + Cancelled Exchanges
 *    - If Total Decided = 0: Reliability Score = 100.00 (Clean slate baseline)
 *    - Else: Fulfillment Rate = Completed / Total Decided
 *        Reliability Score = max(0, min(100, Fulfillment Rate * 100))
 *    - Contribution = Reliability Score * 0.20
 * 
 * 4. Account Standing & Moderation (10% weight - max 10.0 pts):
 *    - Validates server-side account status and report history.
 *    - If status === 'SUSPENDED': Account Score = 0.00 (and overall score capped)
 *    - If status === 'ACTIVE': Base 100.00
 *        Penalties: -30 pts per resolved/upheld report; -15 pts per active pending report.
 *        Account Score = max(0, 100 - penalties)
 *    - Contribution = Account Score * 0.10
 * 
 * Overall Reputation Score:
 *    Reputation = round(Review Contrib + Exchange Contrib + Reliability Contrib + Standing Contrib, 2)
 *    Safe Score Range: Strictly clamped to [0.00, 100.00].
 * 
 * Anti-Manipulation Controls:
 * - Only transactions with status = 'COMPLETED' count toward volume and fulfillment.
 * - Duplicate reviews are blocked at the DB level and filtered out of averages.
 * - Account standing and report penalties are verified server-side directly against DB.
 * - Recalculations are transactional: rollback on failure preserves state integrity.
 * 
 * Backward Compatibility:
 * - Existing M8 review-based score (`users.trust_score = averageRating * 20`) remains
 *   strictly maintained alongside `reputation_score`.
 * ====================================================================
 */

/**
 * Calculates the comprehensive reputation score and factor breakdown for a user.
 * @param {number|string} userId - Target user ID
 * @param {object} [client] - Optional MySQL connection for transaction support
 * @returns {Promise<object>} Reputation calculation breakdown
 */
const calculateReputation = async (userId, client = null) => {
  const runner = client || db;

  // 1. Fetch user account standing
  const [userRows] = await runner.query(
    'SELECT id, name, status, trust_score FROM users WHERE id = ?',
    [userId]
  );

  if (userRows.length === 0) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const user = userRows[0];
  const userStatus = user.status || 'ACTIVE';

  // 2. Fetch Review Quality stats (Factor 1)
  const [reviewRows] = await runner.query(
    `SELECT 
       COUNT(*) AS review_count, 
       COALESCE(AVG(rating), 5.0) AS raw_avg_rating
     FROM reviews 
     WHERE reviewed_id = ?`,
    [userId]
  );
  const reviewCount = parseInt(reviewRows[0].review_count, 10) || 0;
  const rawAvgRating = parseFloat(reviewRows[0].raw_avg_rating);
  const averageRating = reviewCount > 0 ? parseFloat(rawAvgRating.toFixed(2)) : 5.0;

  let reviewQualityScore = 100.00;
  if (reviewCount > 0) {
    reviewQualityScore = parseFloat(((averageRating / 5.0) * 100).toFixed(2));
  }
  const reviewEarnedPoints = parseFloat((reviewQualityScore * 0.40).toFixed(2));

  // 3. Fetch Completed Exchanges & QR Verification (Factor 2)
  const [completedRows] = await runner.query(
    `SELECT COUNT(DISTINCT er.id) AS completed_count 
     FROM exchange_requests er 
     JOIN resources r ON er.resource_id = r.id 
     WHERE (er.requester_id = ? OR r.owner_id = ?) 
       AND er.status = 'COMPLETED'`,
    [userId, userId]
  );
  const completedCount = parseInt(completedRows[0].completed_count, 10) || 0;

  const [qrRows] = await runner.query(
    `SELECT COUNT(DISTINCT qv.id) AS qr_verified_count 
     FROM qr_verifications qv 
     JOIN exchange_requests er ON qv.transaction_id = er.id 
     JOIN resources r ON er.resource_id = r.id 
     WHERE (er.requester_id = ? OR r.owner_id = ?) 
       AND qv.status = 'VERIFIED' 
       AND er.status = 'COMPLETED'`,
    [userId, userId]
  );
  const qrVerifiedCount = parseInt(qrRows[0].qr_verified_count, 10) || 0;

  let exchangeScore = 0.00;
  if (completedCount > 0) {
    const volumeRatio = Math.min(1.0, completedCount / 5.0);
    const volumeScore = volumeRatio * 100.0;
    const qrRatio = qrVerifiedCount / completedCount;
    // Base 80% volume, up to 20% bonus for verified QR handovers
    exchangeScore = Math.min(100.0, volumeScore * (0.80 + 0.20 * qrRatio));
  }
  exchangeScore = parseFloat(exchangeScore.toFixed(2));
  const exchangeEarnedPoints = parseFloat((exchangeScore * 0.30).toFixed(2));

  // 4. Fetch Reliability & Cancellation Rate (Factor 3)
  const [cancelledRows] = await runner.query(
    `SELECT COUNT(DISTINCT id) AS cancelled_count 
     FROM exchange_requests 
     WHERE requester_id = ? AND status = 'CANCELLED'`,
    [userId]
  );
  const cancelledCount = parseInt(cancelledRows[0].cancelled_count, 10) || 0;

  const totalDecided = completedCount + cancelledCount;
  let cancellationRate = 0.0;
  let reliabilityScore = 100.00;

  if (totalDecided > 0) {
    cancellationRate = parseFloat((cancelledCount / totalDecided).toFixed(4));
    const fulfillmentRate = completedCount / totalDecided;
    reliabilityScore = parseFloat((Math.max(0, Math.min(100, fulfillmentRate * 100))).toFixed(2));
  }
  const reliabilityEarnedPoints = parseFloat((reliabilityScore * 0.20).toFixed(2));

  // 5. Fetch Account Standing & Report Moderation (Factor 4)
  const [reportRows] = await runner.query(
    `SELECT 
       COUNT(*) AS total_reports,
       COALESCE(SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END), 0) AS resolved_reports,
       COALESCE(SUM(CASE WHEN status IN ('PENDING', 'UNDER_REVIEW') THEN 1 ELSE 0 END), 0) AS active_reports
     FROM reports 
     WHERE reported_entity_type = 'USER' AND reported_entity_id = ?`,
    [userId]
  );
  const totalReports = parseInt(reportRows[0].total_reports, 10) || 0;
  const resolvedReports = parseInt(reportRows[0].resolved_reports, 10) || 0;
  const activeReports = parseInt(reportRows[0].active_reports, 10) || 0;

  let accountScore = 100.00;
  if (userStatus === 'SUSPENDED') {
    accountScore = 0.00;
  } else {
    const penalty = (resolvedReports * 30.0) + (activeReports * 15.0);
    accountScore = parseFloat(Math.max(0.0, 100.0 - penalty).toFixed(2));
  }
  const accountEarnedPoints = parseFloat((accountScore * 0.10).toFixed(2));

  // 6. Aggregate Final Score
  const rawSum = reviewEarnedPoints + exchangeEarnedPoints + reliabilityEarnedPoints + accountEarnedPoints;
  let finalScore = parseFloat(rawSum.toFixed(2));

  // Severe enforcement: Suspended accounts cannot have high reputation
  if (userStatus === 'SUSPENDED') {
    finalScore = Math.min(finalScore, 20.00);
    if (finalScore < 0.00) finalScore = 0.00;
  }

  // Strictly clamp score within [0.00, 100.00] safe boundary
  finalScore = Math.max(0.00, Math.min(100.00, finalScore));

  // 7. Compute Reputation Tier
  let tier = 'Active Member';
  let tierBadge = 'active';
  if (userStatus === 'SUSPENDED' || finalScore < 25.00) {
    tier = 'Restricted / Caution';
    tierBadge = 'restricted';
  } else if (finalScore >= 90.00) {
    tier = 'Elite Exchanger';
    tierBadge = 'elite';
  } else if (finalScore >= 75.00) {
    tier = 'Trusted Peer';
    tierBadge = 'trusted';
  } else if (finalScore >= 50.00) {
    tier = 'Active Member';
    tierBadge = 'active';
  } else {
    tier = 'Needs Improvement';
    tierBadge = 'warning';
  }

  // 8. Compute Earned Badges
  const badges = [];
  if (qrVerifiedCount >= 3 && qrVerifiedCount === completedCount) {
    badges.push({
      id: 'qr_champion',
      name: 'Verified Handover Champion',
      description: '100% of completed exchanges verified securely via QR handover.'
    });
  }
  if (completedCount >= 1 && cancelledCount === 0) {
    badges.push({
      id: 'zero_cancellations',
      name: 'Zero Cancellation Record',
      description: 'Maintains a flawless record without cancelling accepted exchanges.'
    });
  }
  if (reviewCount >= 1 && averageRating >= 4.5) {
    badges.push({
      id: 'top_rated',
      name: 'Top Rated',
      description: 'Consistently receives exceptional reviews (4.5+ stars) from peers.'
    });
  }
  if (completedCount >= 5) {
    badges.push({
      id: 'established_trader',
      name: 'Established Trader',
      description: 'Completed 5 or more successful resource exchanges on campus.'
    });
  }

  return {
    user_id: user.id,
    user_name: user.name,
    trust_score: parseFloat(user.trust_score || 100.00), // Legacy M8 score
    reputation_score: finalScore,                        // M17 Enhanced score
    tier,
    tier_badge: tierBadge,
    formula: {
      review_quality_weight: '40%',
      completed_exchanges_weight: '30%',
      reliability_weight: '20%',
      account_standing_weight: '10%'
    },
    factors: {
      review_quality: {
        weight_percent: 40,
        max_points: 40.0,
        earned_points: reviewEarnedPoints,
        factor_score: reviewQualityScore,
        average_rating: averageRating,
        review_count: reviewCount,
        description: reviewCount > 0 
          ? `Average rating of ${averageRating.toFixed(1)} / 5.0 across ${reviewCount} peer review(s).`
          : 'New member baseline rating (5.0 / 5.0 stars assumed until reviewed).'
      },
      completed_exchanges: {
        weight_percent: 30,
        max_points: 30.0,
        earned_points: exchangeEarnedPoints,
        factor_score: exchangeScore,
        completed_count: completedCount,
        qr_verified_count: qrVerifiedCount,
        benchmark: 5,
        description: `${completedCount} of 5 benchmark exchanges completed (${qrVerifiedCount} verified via QR).`
      },
      reliability: {
        weight_percent: 20,
        max_points: 20.0,
        earned_points: reliabilityEarnedPoints,
        factor_score: reliabilityScore,
        cancellation_rate: cancellationRate,
        completed_count: completedCount,
        cancelled_count: cancelledCount,
        description: totalDecided > 0
          ? `${(reliabilityScore).toFixed(0)}% fulfillment rate (${cancelledCount} cancellation(s) out of ${totalDecided} exchange(s)).`
          : 'Clean reliability baseline (0 cancellations recorded).'
      },
      account_standing: {
        weight_percent: 10,
        max_points: 10.0,
        earned_points: accountEarnedPoints,
        factor_score: accountScore,
        account_status: userStatus,
        total_reports: totalReports,
        resolved_reports: resolvedReports,
        active_reports: activeReports,
        description: userStatus === 'SUSPENDED'
          ? 'Account suspended by campus moderation.'
          : (totalReports === 0 
              ? 'Clean campus standing with zero moderation reports.' 
              : `${totalReports} report(s) on file (${resolvedReports} resolved, ${activeReports} active).`)
      }
    },
    badges,
    summary: `${tier} with ${finalScore.toFixed(1)}/100 reputation score based on ${completedCount} completed exchange(s) and ${reviewCount} review(s).`
  };
};

/**
 * Recalculates and persists a user's reputation score in the database.
 * Supports running inside an existing transaction by passing `conn`.
 * @param {number|string} userId 
 * @param {object} [client] - Optional active transaction connection
 * @returns {Promise<object>}
 */
const updateUserReputation = async (userId, client = null) => {
  const needsOwnConnection = !client;
  let conn = client;

  try {
    if (needsOwnConnection) {
      conn = await db.getConnection();
      await conn.beginTransaction();
    }

    const reputationData = await calculateReputation(userId, conn);

    await conn.query(
      'UPDATE users SET reputation_score = ? WHERE id = ?',
      [reputationData.reputation_score, userId]
    );

    if (needsOwnConnection) {
      await conn.commit();
    }

    return reputationData;
  } catch (error) {
    if (needsOwnConnection && conn) {
      await conn.rollback();
    }
    throw error;
  } finally {
    if (needsOwnConnection && conn) {
      conn.release();
    }
  }
};

/**
 * Retrieves the full reputation breakdown for public/user APIs.
 * @param {number|string} userId 
 * @returns {Promise<object>}
 */
const getReputationBreakdown = async (userId) => {
  return await calculateReputation(userId);
};

module.exports = {
  calculateReputation,
  updateUserReputation,
  getReputationBreakdown
};
