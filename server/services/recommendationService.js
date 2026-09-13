const db = require('../config/database');

/**
 * RESOURCEHUB — M20: RESOURCE RECOMMENDATION ENGINE
 * 
 * Transparent, lightweight, explainable recommendation scoring formula:
 * 
 * 1. Category Match (Weight: 40 pts)
 *    - +40 pts: Matches categories of resources in user's active wishlist
 *    - +25 pts: Matches categories of resources user previously requested / exchanged
 * 
 * 2. Exchange Type Preference (Weight: 25 pts)
 *    - +25 pts: Matches user's #1 most frequent exchange type (SELL/BORROW/SWAP/DONATE)
 *    - +15 pts: Matches user's #2 most frequent exchange type
 * 
 * 3. User History & Interaction Match (Weight: 20 pts)
 *    - +20 pts: Category has completed exchange transactions in user history
 *    - +10 pts: Category has pending/accepted interactions in user history
 * 
 * 4. Popularity & Peer Trust Quality (Weight: 15 pts)
 *    - Up to +8 pts: Resource wishlist save volume on campus (min(saves * 3, 8))
 *    - Up to +7 pts: Verified owner trust/reputation score (min(round(reputation/100 * 7), 7))
 * 
 * Maximum Score: 100 pts.
 * 
 * Anti-Tampering & Security:
 * - Excludes self-owned listings (owner_id != userId).
 * - Excludes non-available listings (RESERVED, EXCHANGED, ARCHIVED).
 * - Excludes duplicate candidate IDs.
 * - Never leaks sensitive fields (password_hash, personal emails, internal tokens).
 */

/**
 * Get personalized recommendations for a specific user
 * @param {number|null} userId 
 * @param {object} options { limit: number, excludeIds: Array<number> }
 */
const getPersonalizedRecommendations = async (userId, options = {}) => {
  const limit = Math.max(parseInt(options.limit, 10) || 12, 1);
  const excludeIds = Array.isArray(options.excludeIds) ? options.excludeIds.map(Number).filter(Boolean) : [];

  // If no user ID provided or guest, return cold-start campus recommendations
  if (!userId) {
    return await getColdStartRecommendations({ limit, excludeIds });
  }

  // 1. Gather User Interest Signals
  // 1a. Wishlist Categories
  const [wishlistRows] = await db.query(
    `SELECT r.category_id, COUNT(*) AS count
     FROM wishlist w
     JOIN resources r ON w.resource_id = r.id
     WHERE w.user_id = ?
     GROUP BY r.category_id`,
    [userId]
  );
  const wishlistCategoryMap = new Map();
  wishlistRows.forEach(r => wishlistCategoryMap.set(r.category_id, r.count));

  // 1b. Exchange History (Categories and Exchange Types)
  const [exchangeRows] = await db.query(
    `SELECT r.category_id, r.exchange_type, er.status, COUNT(*) AS count
     FROM exchange_requests er
     JOIN resources r ON er.resource_id = r.id
     WHERE er.requester_id = ? OR r.owner_id = ?
     GROUP BY r.category_id, r.exchange_type, er.status`,
    [userId, userId]
  );

  const historyCategoryMap = new Map();
  const exchangeTypeFrequency = new Map();
  let hasCompletedExchangesInCat = new Set();

  exchangeRows.forEach(r => {
    historyCategoryMap.set(r.category_id, (historyCategoryMap.get(r.category_id) || 0) + r.count);
    exchangeTypeFrequency.set(r.exchange_type, (exchangeTypeFrequency.get(r.exchange_type) || 0) + r.count);
    if (r.status === 'COMPLETED') {
      hasCompletedExchangesInCat.add(r.category_id);
    }
  });

  // Also factor wishlist items into exchange type preferences
  const [wishlistTypes] = await db.query(
    `SELECT r.exchange_type, COUNT(*) AS count
     FROM wishlist w
     JOIN resources r ON w.resource_id = r.id
     WHERE w.user_id = ?
     GROUP BY r.exchange_type`,
    [userId]
  );
  wishlistTypes.forEach(r => {
    exchangeTypeFrequency.set(r.exchange_type, (exchangeTypeFrequency.get(r.exchange_type) || 0) + (r.count * 2));
  });

  // Rank preferred exchange types
  const sortedTypes = Array.from(exchangeTypeFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const topExchangeType = sortedTypes[0] || null;
  const secondaryExchangeType = sortedTypes[1] || null;

  const isColdUser = wishlistCategoryMap.size === 0 && historyCategoryMap.size === 0 && exchangeTypeFrequency.size === 0;
  if (isColdUser) {
    return await getColdStartRecommendations({ limit, excludeIds, excludeOwnerId: userId });
  }

  // 2. Query Candidate Resources (AVAILABLE, not owned by user, not in excludeIds)
  let candidateSql = `
    SELECT 
      r.id,
      r.owner_id,
      r.title,
      r.description,
      r.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      r.exchange_type,
      r.price,
      r.item_condition,
      r.meetup_location,
      r.status,
      r.created_at,
      r.updated_at,
      u.name AS owner_name,
      u.department AS owner_department,
      u.trust_score AS owner_trust_score,
      u.reputation_score AS owner_reputation_score,
      (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url,
      (SELECT COUNT(*) FROM wishlist WHERE resource_id = r.id) AS popularity_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    JOIN users u ON r.owner_id = u.id
    WHERE r.status = 'AVAILABLE'
      AND r.owner_id != ?
  `;

  const queryParams = [userId];

  if (excludeIds.length > 0) {
    candidateSql += ` AND r.id NOT IN (${excludeIds.map(() => '?').join(',')})`;
    queryParams.push(...excludeIds);
  }

  candidateSql += ` ORDER BY r.created_at DESC LIMIT 60`;

  const [candidates] = await db.query(candidateSql, queryParams);

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 3. Score Each Candidate
  const scoredItems = candidates.map(resource => {
    let categoryScore = 0;
    let typeScore = 0;
    let historyScore = 0;
    let popularityScore = 0;
    const reasons = [];

    // --- A. Category Match (40 pts max) ---
    if (wishlistCategoryMap.has(resource.category_id)) {
      categoryScore = 40;
      reasons.push(`Matches your saved wishlist interest in ${resource.category_name}`);
    } else if (historyCategoryMap.has(resource.category_id)) {
      categoryScore = 25;
      reasons.push(`Similar to items from your previous ${resource.category_name} exchanges`);
    }

    // --- B. Exchange Type Preference (25 pts max) ---
    if (topExchangeType && resource.exchange_type === topExchangeType) {
      typeScore = 25;
      reasons.push(`Matches your preferred exchange type (${resource.exchange_type})`);
    } else if (secondaryExchangeType && resource.exchange_type === secondaryExchangeType) {
      typeScore = 15;
      reasons.push(`Matches your frequent interest in ${resource.exchange_type} items`);
    }

    // --- C. Interaction & History Match (20 pts max) ---
    if (hasCompletedExchangesInCat.has(resource.category_id)) {
      historyScore = 20;
      reasons.push(`Category aligns with your successfully completed exchanges`);
    } else if (historyCategoryMap.has(resource.category_id)) {
      historyScore = 10;
      reasons.push(`Based on your recent exchange activity`);
    }

    // --- D. Popularity & Peer Trust Quality (15 pts max) ---
    const popCount = parseInt(resource.popularity_count || 0, 10);
    const popPoints = Math.min(popCount * 3, 8);
    const repScore = parseFloat(resource.owner_reputation_score || resource.owner_trust_score || 100);
    const trustPoints = Math.min(Math.round((repScore / 100) * 7), 7);
    popularityScore = popPoints + trustPoints;

    if (popCount >= 2) {
      reasons.push(`Popular on campus (${popCount} students saved this)`);
    } else if (repScore >= 85) {
      reasons.push(`Listed by a highly trusted peer (${Math.round(repScore)}% trust rating)`);
    }

    // Default reason fallback if no specific triggers hit
    if (reasons.length === 0) {
      reasons.push(`Recommended campus resource in ${resource.category_name}`);
    }

    const totalScore = Math.min(categoryScore + typeScore + historyScore + popularityScore, 100);

    return {
      ...resource,
      recommendation_metadata: {
        match_score: totalScore,
        reasons,
        primary_reason: reasons[0],
        score_breakdown: {
          category_match: categoryScore,
          exchange_preference: typeScore,
          history_match: historyScore,
          popularity_trust: popularityScore
        }
      }
    };
  });

  // 4. Sort descending by score, tie-break by recency (ID descending)
  scoredItems.sort((a, b) => {
    if (b.recommendation_metadata.match_score !== a.recommendation_metadata.match_score) {
      return b.recommendation_metadata.match_score - a.recommendation_metadata.match_score;
    }
    return b.id - a.id;
  });

  // Return top N items
  return scoredItems.slice(0, limit);
};

/**
 * Get Cold-Start Recommendations for guest users or users with no historical signals
 * @param {object} options { limit: number, excludeIds: Array<number>, excludeOwnerId: number|null }
 */
const getColdStartRecommendations = async (options = {}) => {
  const limit = Math.max(parseInt(options.limit, 10) || 6, 1);
  const excludeIds = Array.isArray(options.excludeIds) ? options.excludeIds.map(Number).filter(Boolean) : [];
  const excludeOwnerId = options.excludeOwnerId ? parseInt(options.excludeOwnerId, 10) : null;

  let sql = `
    SELECT 
      r.id,
      r.owner_id,
      r.title,
      r.description,
      r.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      r.exchange_type,
      r.price,
      r.item_condition,
      r.meetup_location,
      r.status,
      r.created_at,
      r.updated_at,
      u.name AS owner_name,
      u.department AS owner_department,
      u.trust_score AS owner_trust_score,
      u.reputation_score AS owner_reputation_score,
      (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url,
      (SELECT COUNT(*) FROM wishlist WHERE resource_id = r.id) AS popularity_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    JOIN users u ON r.owner_id = u.id
    WHERE r.status = 'AVAILABLE'
  `;

  const params = [];

  if (excludeOwnerId) {
    sql += ` AND r.owner_id != ?`;
    params.push(excludeOwnerId);
  }

  if (excludeIds.length > 0) {
    sql += ` AND r.id NOT IN (${excludeIds.map(() => '?').join(',')})`;
    params.push(...excludeIds);
  }

  sql += `
    ORDER BY 
      popularity_count DESC,
      u.trust_score DESC,
      r.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  const [rows] = await db.query(sql, params);

  return rows.map((resource, index) => {
    const popCount = parseInt(resource.popularity_count || 0, 10);
    const repScore = parseFloat(resource.owner_reputation_score || resource.owner_trust_score || 100);
    const reasons = [];

    if (popCount > 0) {
      reasons.push(`Popular on campus (${popCount} student saves)`);
    }
    if (repScore >= 90) {
      reasons.push(`Top-rated peer listing (${Math.round(repScore)}% trust rating)`);
    }
    reasons.push(`Recently listed in ${resource.category_name}`);

    // Estimated baseline score for cold start (75 - index * 2)
    const baselineScore = Math.max(75 - index * 2, 50);

    return {
      ...resource,
      recommendation_metadata: {
        match_score: baselineScore,
        reasons,
        primary_reason: reasons[0],
        score_breakdown: {
          category_match: 0,
          exchange_preference: 0,
          history_match: 0,
          popularity_trust: Math.min(popCount * 3 + Math.round((repScore / 100) * 7), 15),
          is_cold_start: true
        }
      }
    };
  });
};

/**
 * Get Similar Resources for a specific resource (e.g. on Resource Details page)
 * @param {number} resourceId 
 * @param {number|null} userId 
 * @param {object} options { limit: number }
 */
const getSimilarResources = async (resourceId, userId = null, options = {}) => {
  const parsedResId = parseInt(resourceId, 10);
  if (!parsedResId || isNaN(parsedResId)) {
    return [];
  }

  const limit = Math.max(parseInt(options.limit, 10) || 20, 1);

  // 1. Fetch Target Resource Metadata
  const [targetRows] = await db.query(
    `SELECT id, category_id, exchange_type, price, item_condition, owner_id, title
     FROM resources
     WHERE id = ?`,
    [parsedResId]
  );

  if (targetRows.length === 0) {
    return [];
  }

  const target = targetRows[0];

  // 2. Query Candidate Similar Resources
  let sql = `
    SELECT 
      r.id,
      r.owner_id,
      r.title,
      r.description,
      r.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      r.exchange_type,
      r.price,
      r.item_condition,
      r.meetup_location,
      r.status,
      r.created_at,
      r.updated_at,
      u.name AS owner_name,
      u.department AS owner_department,
      u.trust_score AS owner_trust_score,
      u.reputation_score AS owner_reputation_score,
      (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url,
      (SELECT COUNT(*) FROM wishlist WHERE resource_id = r.id) AS popularity_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    JOIN users u ON r.owner_id = u.id
    WHERE r.status = 'AVAILABLE'
      AND r.id != ?
  `;

  const params = [parsedResId];

  // Exclude resources owned by current user if logged in
  if (userId) {
    sql += ` AND r.owner_id != ?`;
    params.push(userId);
  }

  sql += ` ORDER BY (r.category_id = ?) DESC, r.created_at DESC LIMIT 50`;
  params.push(target.category_id);

  const [candidates] = await db.query(sql, params);

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 3. Compute Similarity Score
  const conditionRanks = { 'NEW': 5, 'LIKE_NEW': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1 };
  const targetConditionRank = conditionRanks[target.item_condition] || 3;

  const scoredSimilar = candidates.map(item => {
    let score = 0;
    const reasons = [];

    // Category similarity (45 pts)
    if (item.category_id === target.category_id) {
      score += 45;
      reasons.push(`Same category (${item.category_name})`);
    }

    // Exchange type similarity (25 pts)
    if (item.exchange_type === target.exchange_type) {
      score += 25;
      reasons.push(`Matching exchange option (${item.exchange_type})`);
    }

    // Condition similarity (15 pts)
    const itemConditionRank = conditionRanks[item.item_condition] || 3;
    const rankDiff = Math.abs(targetConditionRank - itemConditionRank);
    if (rankDiff === 0) {
      score += 15;
      reasons.push(`Identical condition (${item.item_condition})`);
    } else if (rankDiff === 1) {
      score += 10;
      reasons.push(`Similar condition (${item.item_condition})`);
    }

    // Popularity & owner reputation (15 pts)
    const popCount = parseInt(item.popularity_count || 0, 10);
    const repScore = parseFloat(item.owner_reputation_score || item.owner_trust_score || 100);
    const popScore = Math.min(popCount * 3 + Math.round((repScore / 100) * 7), 15);
    score += popScore;

    if (popCount >= 1) {
      reasons.push(`Popular on campus`);
    }

    if (reasons.length === 0) {
      reasons.push(`Alternative campus resource`);
    }

    const similarityScore = Math.min(score, 100);

    return {
      ...item,
      recommendation_metadata: {
        match_score: similarityScore,
        similarity_score: similarityScore,
        reasons,
        primary_reason: reasons[0],
        score_breakdown: {
          category_similarity: item.category_id === target.category_id ? 45 : 0,
          type_similarity: item.exchange_type === target.exchange_type ? 25 : 0,
          condition_similarity: rankDiff === 0 ? 15 : (rankDiff === 1 ? 10 : 0),
          popularity_trust: popScore
        }
      }
    };
  });

  // Sort descending by similarity score, tie-break by ID descending (recency)
  scoredSimilar.sort((a, b) => {
    if (b.recommendation_metadata.similarity_score !== a.recommendation_metadata.similarity_score) {
      return b.recommendation_metadata.similarity_score - a.recommendation_metadata.similarity_score;
    }
    return b.id - a.id;
  });

  return scoredSimilar.slice(0, limit);
};

/**
 * Get Recommendations within a specific Category
 * @param {number} categoryId 
 * @param {number|null} userId 
 * @param {object} options { limit: number, excludeId: number|null }
 */
const getCategoryRecommendations = async (categoryId, userId = null, options = {}) => {
  const parsedCatId = parseInt(categoryId, 10);
  if (!parsedCatId || isNaN(parsedCatId)) {
    return [];
  }

  const limit = Math.max(parseInt(options.limit, 10) || 6, 1);
  const excludeId = options.excludeId ? parseInt(options.excludeId, 10) : null;

  let sql = `
    SELECT 
      r.id,
      r.owner_id,
      r.title,
      r.description,
      r.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      r.exchange_type,
      r.price,
      r.item_condition,
      r.meetup_location,
      r.status,
      r.created_at,
      r.updated_at,
      u.name AS owner_name,
      u.department AS owner_department,
      u.trust_score AS owner_trust_score,
      u.reputation_score AS owner_reputation_score,
      (SELECT image_url FROM resource_images WHERE resource_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS image_url,
      (SELECT COUNT(*) FROM wishlist WHERE resource_id = r.id) AS popularity_count
    FROM resources r
    JOIN categories c ON r.category_id = c.id
    JOIN users u ON r.owner_id = u.id
    WHERE r.status = 'AVAILABLE'
      AND r.category_id = ?
  `;

  const params = [parsedCatId];

  if (userId) {
    sql += ` AND r.owner_id != ?`;
    params.push(userId);
  }

  if (excludeId) {
    sql += ` AND r.id != ?`;
    params.push(excludeId);
  }

  sql += `
    ORDER BY 
      popularity_count DESC,
      u.trust_score DESC,
      r.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  const [rows] = await db.query(sql, params);

  return rows.map((item, index) => {
    const popCount = parseInt(item.popularity_count || 0, 10);
    const repScore = parseFloat(item.owner_reputation_score || item.owner_trust_score || 100);
    const reasons = [`Top choice in ${item.category_name}`];

    if (popCount > 0) {
      reasons.push(`Saved by ${popCount} students`);
    }
    if (repScore >= 85) {
      reasons.push(`Trusted peer rating (${Math.round(repScore)}%)`);
    }

    const score = Math.max(80 - index * 3, 50);

    return {
      ...item,
      recommendation_metadata: {
        match_score: score,
        reasons,
        primary_reason: reasons[0],
        score_breakdown: {
          category_match: 40,
          exchange_preference: 0,
          history_match: 0,
          popularity_trust: Math.min(popCount * 3 + Math.round((repScore / 100) * 7), 15)
        }
      }
    };
  });
};

module.exports = {
  getPersonalizedRecommendations,
  getColdStartRecommendations,
  getSimilarResources,
  getCategoryRecommendations
};
