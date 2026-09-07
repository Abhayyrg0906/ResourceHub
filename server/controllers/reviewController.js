const db = require('../config/database');
const { createNotification } = require('../services/notificationService');

// 1. Create a Review (Atomic with Trust Score Calculation)
const createReview = async (req, res) => {
  let conn;
  try {
    const { transaction_id, rating, review_text } = req.body;
    const reviewer_id = req.user.id; // From JWT authentication context

    // Check basic parameters
    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required.'
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required.'
      });
    }

    // Rule 7 — Rating validation (integer between 1 and 5)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    // Rule 8 — Review text length validation (optional, max 1000 characters)
    if (review_text !== undefined && review_text !== null) {
      if (typeof review_text !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Review text must be a string.'
        });
      }
      if (review_text.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Review text must not exceed 1000 characters.'
        });
      }
    }

    // Rule 1 — Transaction must exist
    const [transactions] = await db.query(
      `SELECT er.id, er.status, er.requester_id, r.owner_id 
       FROM exchange_requests er
       JOIN resources r ON er.resource_id = r.id
       WHERE er.id = ?`,
      [transaction_id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const transaction = transactions[0];

    // Rule 2 — Transaction must be COMPLETED
    if (transaction.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be reviewed.'
      });
    }

    // Rule 3 — Reviewer must be a participant (owner or requester)
    const isRequester = Number(reviewer_id) === Number(transaction.requester_id);
    const isOwner = Number(reviewer_id) === Number(transaction.owner_id);

    if (!isRequester && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this transaction.'
      });
    }

    // Rule 5 — Determine reviewed user automatically
    let reviewed_id;
    if (isRequester) {
      reviewed_id = transaction.owner_id;
    } else {
      reviewed_id = transaction.requester_id;
    }

    // Rule 4 — Reviewer cannot review themselves
    if (Number(reviewer_id) === Number(reviewed_id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review yourself.'
      });
    }

    // Rule 6 — Prevent duplicate reviews (transaction_id + reviewer_id)
    const [existing] = await db.query(
      'SELECT id FROM reviews WHERE transaction_id = ? AND reviewer_id = ?',
      [transaction_id, reviewer_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this transaction.'
      });
    }

    // Acquire transaction connection
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. Insert review into database
    const [result] = await conn.query(
      `INSERT INTO reviews (transaction_id, reviewer_id, reviewed_id, rating, review_text) 
       VALUES (?, ?, ?, ?, ?)`,
      [transaction_id, reviewer_id, reviewed_id, rating, review_text || null]
    );

    // Simulate rollback error if requested by testing header
    if (req.headers['x-simulate-rollback'] === 'true') {
      throw new Error('Simulated rollback error');
    }

    // 2. Calculate average rating and count for reviewed user
    const [stats] = await conn.query(
      `SELECT 
         COALESCE(AVG(rating), 5.0) AS average_rating,
         COUNT(*) AS review_count
       FROM reviews
       WHERE reviewed_id = ?`,
      [reviewed_id]
    );

    // Round average rating to 2 decimal places first (e.g. 4.67)
    const rawAverage = parseFloat(stats[0].average_rating || 5.0);
    const averageRating = parseFloat(rawAverage.toFixed(2));
    
    // Calculate trust score based on rounded average rating
    let trustScore = parseFloat((averageRating * 20).toFixed(2));

    // Limit trust score between 20.00 and 100.00
    if (trustScore > 100.00) trustScore = 100.00;
    if (trustScore < 20.00) trustScore = 20.00;

    // 3. Update reviewed user's trust_score
    await conn.query(
      `UPDATE users SET trust_score = ? WHERE id = ?`,
      [trustScore, reviewed_id]
    );

    // 4. Fetch the newly created review info to return
    const [newReviews] = await conn.query(
      `SELECT r.id, r.transaction_id, r.reviewer_id, r.reviewed_id, r.rating, r.review_text, r.created_at, u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    const newReview = newReviews[0];

    await conn.commit();

    // M9.4: Notify reviewed user of new rating & review
    createNotification(
      reviewed_id,
      'REVIEW_RECEIVED',
      'New Review Received',
      `You received a ${rating}-star rating and review from ${newReview.reviewer_name || 'a student'}.`,
      transaction_id,
      'reviews'
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: {
        review: {
          id: newReview.id,
          transaction_id: newReview.transaction_id,
          rating: newReview.rating,
          review_text: newReview.review_text,
          reviewer: {
            id: newReview.reviewer_id,
            name: newReview.reviewer_name
          },
          reviewed_id: newReview.reviewed_id,
          created_at: newReview.created_at
        },
        reviewed_user: {
          id: reviewed_id,
          trust_score: trustScore
        }
      }
    });

  } catch (error) {
    if (conn) {
      await conn.rollback();
    }
    console.error('Error creating review:', error);

    if (error.message === 'Simulated rollback error') {
      return res.status(500).json({
        success: false,
        message: 'Simulated rollback error occurred.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error while submitting review.'
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

// 2. Get User Reviews (received by specified user, with stats summary)
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check user exists
    const [users] = await db.query('SELECT id, trust_score FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Retrieve stats
    const [stats] = await db.query(
      `SELECT 
         COALESCE(AVG(rating), 5.0) AS average_rating,
         COUNT(*) AS review_count
       FROM reviews
       WHERE reviewed_id = ?`,
      [userId]
    );

    // Retrieve reviews array list
    const [rows] = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.reviewer_id, u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewed_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const formatted = rows.map(row => ({
      id: row.id,
      rating: row.rating,
      review_text: row.review_text,
      reviewer: {
        id: row.reviewer_id,
        name: row.reviewer_name
      },
      created_at: row.created_at
    }));

    const rawAverage = parseFloat(stats[0].average_rating || 5.0);
    const averageRating = parseFloat(rawAverage.toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        average_rating: averageRating,
        review_count: parseInt(stats[0].review_count || 0, 10),
        trust_score: parseFloat(users[0].trust_score),
        reviews: formatted
      }
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching reviews.'
    });
  }
};

// 3. Get Transaction Reviews
const getTransactionReviews = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Check transaction exists
    const [transactions] = await db.query('SELECT id FROM exchange_requests WHERE id = ?', [transactionId]);
    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.'
      });
    }

    const [rows] = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, r.reviewer_id, u.name AS reviewer_name, r.reviewed_id, u2.name AS reviewed_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN users u2 ON r.reviewed_id = u2.id
       WHERE r.transaction_id = ?
       ORDER BY r.created_at DESC`,
      [transactionId]
    );

    const formatted = rows.map(row => ({
      id: row.id,
      rating: row.rating,
      review_text: row.review_text,
      reviewer: {
        id: row.reviewer_id,
        name: row.reviewer_name
      },
      reviewed: {
        id: row.reviewed_id,
        name: row.reviewed_name
      },
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('Error fetching transaction reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching transaction reviews.'
    });
  }
};

module.exports = {
  createReview,
  getUserReviews,
  getTransactionReviews
};
