const crypto = require('crypto');
const db = require('../config/database');
const { createNotification } = require('../services/notificationService');

// 1. Generate QR Code verification token (Owner only)
const generateQr = async (req, res) => {
  try {
    const { id } = req.params; // Exchange request ID (transaction_id)
    const userId = req.user.id;

    // Verify transaction exists
    const [transactions] = await db.query(
      `SELECT er.id, er.status, r.owner_id, r.status AS resource_status 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const transaction = transactions[0];

    // Verify authenticated user is the resource owner (who handovers the item)
    if (transaction.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the resource owner is authorized to generate the exchange verification QR.'
      });
    }

    // Verify transaction is ACCEPTED and resource is RESERVED
    if (transaction.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'QR codes can only be generated for accepted exchange requests.'
      });
    }

    if (transaction.resource_status !== 'RESERVED') {
      return res.status(400).json({
        success: false,
        message: 'Associated resource must be reserved before generating verification token.'
      });
    }

    // Generate secure random verification token with high entropy
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry (read from environment variable, default 10 minutes)
    const expiryMinutes = parseInt(process.env.QR_EXPIRY_MINUTES || '10', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Check if verification record already exists
    const [existing] = await db.query(
      'SELECT id FROM qr_verifications WHERE transaction_id = ?',
      [id]
    );

    if (existing.length > 0) {
      // Overwrite/update existing record (effectively expires the old token)
      await db.query(
        `UPDATE qr_verifications 
         SET verification_token = ?, status = 'GENERATED', generated_at = CURRENT_TIMESTAMP, expires_at = ?, verified_at = NULL, verified_by_id = NULL 
         WHERE transaction_id = ?`,
        [token, expiresAt, id]
      );
    } else {
      // Create new verification record
      await db.query(
        `INSERT INTO qr_verifications 
          (transaction_id, verification_token, status, expires_at) 
         VALUES (?, ?, 'GENERATED', ?)`,
        [id, token, expiresAt]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'QR verification generated',
      data: {
        transaction_id: parseInt(id, 10),
        verification_token: token,
        expires_at: expiresAt
      }
    });

  } catch (error) {
    console.error('Error generating QR token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating verification token.'
    });
  }
};

// 2. Verify QR Code (Requester only scans)
const verifyQr = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const { verification_token } = req.body;
    const userId = req.user.id; // Scanner identity

    if (!verification_token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.'
      });
    }

    // Verify transaction exists and fetch details
    const [transactions] = await db.query(
      `SELECT er.id, er.requester_id, r.owner_id, r.title AS resource_title, er.status AS request_status 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const transaction = transactions[0];

    // Enforce participant policy (only transaction requester can scan and verify owner's handover)
    if (transaction.requester_id !== userId) {
      if (transaction.owner_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'Handover cannot be verified by the QR generator.'
        });
      }
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to scan this exchange token.'
      });
    }

    // Verify transaction is in ACCEPTED status
    if (transaction.request_status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Transaction is not in accepted status.'
      });
    }

    // Fetch the verification record
    const [verifications] = await db.query(
      'SELECT status, verification_token, expires_at FROM qr_verifications WHERE transaction_id = ?',
      [id]
    );

    if (verifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active QR token found for this transaction.'
      });
    }

    const verification = verifications[0];

    // Check token matches securely
    if (verification.verification_token !== verification_token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token.'
      });
    }

    // Verify status is PENDING/GENERATED
    if (verification.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'QR verification has already been completed.'
      });
    }

    if (verification.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired.'
      });
    }

    // Verify current time is before expires_at
    const now = new Date();
    if (now >= new Date(verification.expires_at)) {
      // Mark as EXPIRED in DB
      await db.query(
        'UPDATE qr_verifications SET status = "EXPIRED" WHERE transaction_id = ?',
        [id]
      );
      return res.status(400).json({
        success: false,
        message: 'QR code has expired.'
      });
    }

    // Perform atomic status change using MySQL transaction with row locking
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [lockedVer] = await conn.query(
      'SELECT status FROM qr_verifications WHERE transaction_id = ? FOR UPDATE',
      [id]
    );

    if (lockedVer[0].status !== 'GENERATED') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Verification is no longer active.'
      });
    }

    // Update status to VERIFIED
    await conn.query(
      `UPDATE qr_verifications 
       SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP, verified_by_id = ? 
       WHERE transaction_id = ?`,
      [userId, id]
    );

    await conn.commit();

    // M9.4: Notify owner that QR handover has been verified
    await createNotification(
      transaction.owner_id,
      'QR_VERIFIED',
      'Handover QR Verified',
      `The requester has successfully scanned and verified your handover QR code for "${transaction.resource_title || 'resource'}".`,
      transaction.id,
      'exchange_requests'
    );

    return res.status(200).json({
      success: true,
      message: 'Exchange verified successfully.'
    });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error verifying QR token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during handover verification.'
    });
  } finally {
    if (conn) conn.release();
  }
};

// 3. Get QR Status (Both participants)
const getQrStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify transaction exists and fetch details
    const [transactions] = await db.query(
      `SELECT er.id, er.requester_id, r.owner_id 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const transaction = transactions[0];

    // Check participation
    if (transaction.requester_id !== userId && transaction.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this exchange.'
      });
    }

    const [rows] = await db.query(
      'SELECT status, generated_at, expires_at, verified_at, verified_by_id, verification_token FROM qr_verifications WHERE transaction_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    const qr = rows[0];

    // Auto-expire check on read
    if (qr.status === 'GENERATED' && new Date() >= new Date(qr.expires_at)) {
      qr.status = 'EXPIRED';
      await db.query(
        'UPDATE qr_verifications SET status = "EXPIRED" WHERE transaction_id = ?',
        [id]
      );
    }

    const payload = {
      status: qr.status,
      generated_at: qr.generated_at,
      expires_at: qr.expires_at,
      verified_at: qr.verified_at,
      verified_by_id: qr.verified_by_id
    };

    // Only expose active verification token to owner when status is GENERATED
    if (userId === transaction.owner_id && qr.status === 'GENERATED') {
      payload.verification_token = qr.verification_token;
    }

    return res.status(200).json({
      success: true,
      data: payload
    });

  } catch (error) {
    console.error('Error fetching QR status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching QR status.'
    });
  }
};

/**
 * 4. Get QR Handover History for Authenticated User
 * Returns all QR verifications for transactions where the caller was owner or requester.
 * Strictly omits verification_token.
 */
const getQrHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Auto-expire any stale GENERATED records
    await db.query(
      'UPDATE qr_verifications SET status = "EXPIRED" WHERE status = "GENERATED" AND expires_at <= NOW()'
    );

    const [rows] = await db.query(
      `SELECT 
        qv.id,
        qv.transaction_id,
        qv.status,
        qv.generated_at,
        qv.expires_at,
        qv.verified_at,
        qv.verified_by_id,
        er.status AS transaction_status,
        r.exchange_type AS resource_exchange_type,
        er.price_agreed,
        r.id AS resource_id,
        r.title AS resource_title,
        r.meetup_location,
        u_owner.id AS owner_id,
        u_owner.name AS owner_name,
        u_req.id AS requester_id,
        u_req.name AS requester_name,
        u_ver.name AS verified_by_name,
        CASE 
          WHEN r.owner_id = ? THEN 'OWNER'
          ELSE 'REQUESTER'
        END AS user_role,
        CASE 
          WHEN r.owner_id = ? THEN u_req.name
          ELSE u_owner.name
        END AS partner_name
      FROM qr_verifications qv
      JOIN exchange_requests er ON qv.transaction_id = er.id
      JOIN resources r ON er.resource_id = r.id
      JOIN users u_owner ON r.owner_id = u_owner.id
      JOIN users u_req ON er.requester_id = u_req.id
      LEFT JOIN users u_ver ON qv.verified_by_id = u_ver.id
      WHERE (r.owner_id = ? OR er.requester_id = ?)
      ORDER BY qv.generated_at DESC`,
      [userId, userId, userId, userId]
    );

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching QR history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching QR history.'
    });
  }
};

/**
 * 5. Get QR History for a Specific Transaction
 */
const getTransactionQrHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First check transaction existence and participant authorization
    const [txRows] = await db.query(
      `SELECT er.id, er.requester_id, r.owner_id 
       FROM exchange_requests er
       JOIN resources r ON er.resource_id = r.id
       WHERE er.id = ?`,
      [id]
    );

    if (txRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const transaction = txRows[0];
    if (userId !== transaction.owner_id && userId !== transaction.requester_id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view QR history for this transaction.'
      });
    }

    const [rows] = await db.query(
      `SELECT 
        qv.id,
        qv.transaction_id,
        qv.status,
        qv.generated_at,
        qv.expires_at,
        qv.verified_at,
        qv.verified_by_id,
        er.status AS transaction_status,
        r.exchange_type AS resource_exchange_type,
        er.price_agreed,
        r.id AS resource_id,
        r.title AS resource_title,
        r.meetup_location,
        u_owner.id AS owner_id,
        u_owner.name AS owner_name,
        u_req.id AS requester_id,
        u_req.name AS requester_name,
        u_ver.name AS verified_by_name,
        CASE 
          WHEN r.owner_id = ? THEN 'OWNER'
          ELSE 'REQUESTER'
        END AS user_role,
        CASE 
          WHEN r.owner_id = ? THEN u_req.name
          ELSE u_owner.name
        END AS partner_name
      FROM qr_verifications qv
      JOIN exchange_requests er ON qv.transaction_id = er.id
      JOIN resources r ON er.resource_id = r.id
      JOIN users u_owner ON r.owner_id = u_owner.id
      JOIN users u_req ON er.requester_id = u_req.id
      LEFT JOIN users u_ver ON qv.verified_by_id = u_ver.id
      WHERE qv.transaction_id = ?`,
      [userId, userId, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No QR verification history found for this exchange.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching transaction QR history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching transaction QR history.'
    });
  }
};

module.exports = {
  generateQr,
  verifyQr,
  getQrStatus,
  getQrHistory,
  getTransactionQrHistory
};
