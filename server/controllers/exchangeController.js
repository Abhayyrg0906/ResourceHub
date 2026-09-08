const db = require('../config/database');
const { createNotification } = require('../services/notificationService');

// Helper to check transition validity
const isValidTransition = (currentStatus, targetStatus) => {
  const allowed = {
    'PENDING': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    'ACCEPTED': ['COMPLETED']
  };
  return allowed[currentStatus]?.includes(targetStatus) || false;
};

// 1. Create Exchange Request
const createRequest = async (req, res) => {
  try {
    const { resource_id, borrow_duration_days, offered_resource_id } = req.body;
    const requester_id = req.user.id; // From JWT auth

    if (!resource_id) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required.'
      });
    }

    // 1. Verify resource exists
    const [resources] = await db.query(
      'SELECT id, owner_id, status, exchange_type, price, title FROM resources WHERE id = ?',
      [resource_id]
    );

    if (resources.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.'
      });
    }

    const resource = resources[0];

    // 2. Verify resource status is AVAILABLE
    if (resource.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Resource is not available for exchange.'
      });
    }

    // 3. Verify requester is not the owner
    if (resource.owner_id === requester_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot request an exchange for your own resource.'
      });
    }

    // 4. Verify exchange type rules
    let price_agreed = null;
    let final_borrow_days = null;
    let final_offered_id = null;

    const exchangeType = resource.exchange_type.toUpperCase();

    if (exchangeType === 'SELL') {
      price_agreed = resource.price;
    } else if (exchangeType === 'BORROW') {
      if (!borrow_duration_days || parseInt(borrow_duration_days, 10) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Borrow duration in days must be greater than 0.'
        });
      }
      final_borrow_days = parseInt(borrow_duration_days, 10);
    } else if (exchangeType === 'SWAP') {
      if (!offered_resource_id) {
        return res.status(400).json({
          success: false,
          message: 'An offered resource is required for swapping.'
        });
      }

      // Verify offered resource
      const [offeredResources] = await db.query(
        'SELECT id, owner_id, status FROM resources WHERE id = ?',
        [offered_resource_id]
      );

      if (offeredResources.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Offered resource not found.'
        });
      }

      const offered = offeredResources[0];

      // Verify offered resource belongs to requester
      if (offered.owner_id !== requester_id) {
        return res.status(403).json({
          success: false,
          message: 'You do not own the offered resource.'
        });
      }

      // Verify offered resource is AVAILABLE
      if (offered.status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: 'The offered resource is not available for swapping.'
        });
      }

      // Verify requester is not offering the requested resource itself
      if (parseInt(offered_resource_id, 10) === parseInt(resource_id, 10)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot offer the same resource being requested.'
        });
      }

      final_offered_id = parseInt(offered_resource_id, 10);
    }

    // 5. Verify no duplicate pending request exists
    const [duplicates] = await db.query(
      'SELECT id FROM exchange_requests WHERE resource_id = ? AND requester_id = ? AND status = "PENDING"',
      [resource_id, requester_id]
    );

    if (duplicates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this resource.'
      });
    }

    // Create the exchange request
    const [result] = await db.query(
      `INSERT INTO exchange_requests 
        (resource_id, requester_id, status, offered_resource_id, borrow_duration_days, price_agreed) 
       VALUES (?, ?, 'PENDING', ?, ?, ?)`,
      [resource_id, requester_id, final_offered_id, final_borrow_days, price_agreed]
    );

    // M9.4: Notify resource owner of new exchange request
    await createNotification(
      resource.owner_id,
      'EXCHANGE_REQUEST',
      'New Exchange Request',
      `${req.user.name || 'A student'} requested an exchange for your resource "${resource.title}".`,
      result.insertId,
      'exchange_requests'
    );

    return res.status(201).json({
      success: true,
      message: 'Exchange request submitted successfully.',
      data: {
        id: result.insertId,
        resource_id,
        requester_id,
        status: 'PENDING',
        offered_resource_id: final_offered_id,
        borrow_duration_days: final_borrow_days,
        price_agreed
      }
    });

  } catch (error) {
    console.error('Error creating exchange request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing request.'
    });
  }
};

// 2. Get User Exchange Requests
const getRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, role } = req.query;

    let query = `
      SELECT 
        er.id,
        er.resource_id,
        er.requester_id,
        er.status,
        er.offered_resource_id,
        er.borrow_duration_days,
        er.price_agreed,
        er.created_at,
        er.updated_at,
        r.title AS resource_title,
        r.exchange_type AS resource_exchange_type,
        r.meetup_location AS resource_meetup_location,
        r.owner_id AS owner_id,
        u_req.name AS requester_name,
        u_req.email AS requester_email,
        u_own.name AS owner_name,
        u_own.email AS owner_email,
        r_off.title AS offered_resource_title
      FROM exchange_requests er
      JOIN resources r ON er.resource_id = r.id
      JOIN users u_req ON er.requester_id = u_req.id
      JOIN users u_own ON r.owner_id = u_own.id
      LEFT JOIN resources r_off ON er.offered_resource_id = r_off.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by role/user participation
    if (role === 'requester') {
      query += ' AND er.requester_id = ?';
      params.push(userId);
    } else if (role === 'owner') {
      query += ' AND r.owner_id = ?';
      params.push(userId);
    } else {
      query += ' AND (er.requester_id = ? OR r.owner_id = ?)';
      params.push(userId, userId);
    }

    // Filter by request status
    if (status) {
      query += ' AND er.status = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY er.created_at DESC';

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching exchange requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching requests.'
    });
  }
};

// 3. Get Request Details
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
        er.id,
        er.resource_id,
        er.requester_id,
        er.status,
        er.offered_resource_id,
        er.borrow_duration_days,
        er.price_agreed,
        er.created_at,
        er.updated_at,
        r.title AS resource_title,
        r.description AS resource_description,
        r.exchange_type AS resource_exchange_type,
        r.price AS resource_price,
        r.item_condition AS resource_condition,
        r.meetup_location AS resource_meetup_location,
        r.owner_id AS owner_id,
        u_req.name AS requester_name,
        u_req.email AS requester_email,
        u_own.name AS owner_name,
        u_own.email AS owner_email,
        r_off.title AS offered_resource_title,
        r_off.item_condition AS offered_resource_condition
      FROM exchange_requests er
      JOIN resources r ON er.resource_id = r.id
      JOIN users u_req ON er.requester_id = u_req.id
      JOIN users u_own ON r.owner_id = u_own.id
      LEFT JOIN resources r_off ON er.offered_resource_id = r_off.id
      WHERE er.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const request = rows[0];

    // Restrict access to requester and owner only
    if (request.requester_id !== userId && request.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this request.'
      });
    }

    return res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    console.error('Error fetching request details:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// 4. Cancel Exchange Request
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT er.id, er.requester_id, er.status, r.owner_id, r.title AS resource_title 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const request = rows[0];

    // Only requester can cancel
    if (request.requester_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this request.'
      });
    }

    // Only PENDING requests may be cancelled
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be cancelled.'
      });
    }

    // Update status to CANCELLED
    await db.query(
      'UPDATE exchange_requests SET status = "CANCELLED" WHERE id = ?',
      [id]
    );

    // M9.4: Notify resource owner of cancellation
    await createNotification(
      request.owner_id,
      'REQUEST_CANCELLED',
      'Exchange Request Cancelled',
      `The exchange request for "${request.resource_title || 'resource'}" was cancelled by the requester.`,
      request.id,
      'exchange_requests'
    );

    return res.status(200).json({
      success: true,
      message: 'Exchange request cancelled successfully.'
    });

  } catch (error) {
    console.error('Error cancelling exchange request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// 5. Accept Exchange Request
const acceptRequest = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch request with resource parameters
    const [rows] = await db.query(
      `SELECT er.id, er.status, er.offered_resource_id, er.resource_id, er.requester_id, r.title AS resource_title, r.owner_id, r.status AS resource_status, r.exchange_type 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const request = rows[0];

    // Only owner can accept
    if (request.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to accept this request.'
      });
    }

    // Only PENDING requests can be accepted
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${request.status} to ACCEPTED.`
      });
    }

    // Verify resource is still AVAILABLE
    if (request.resource_status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Resource is no longer available for exchange.'
      });
    }

    // If SWAP, verify offered resource is still AVAILABLE
    if (request.exchange_type.toUpperCase() === 'SWAP') {
      const [offeredRows] = await db.query(
        'SELECT status FROM resources WHERE id = ?',
        [request.offered_resource_id]
      );
      if (offeredRows.length === 0 || offeredRows[0].status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: 'The offered swap item is no longer available.'
        });
      }
    }

    // Acquire transaction connection to prevent race conditions
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. Update request status to ACCEPTED
    await conn.query(
      'UPDATE exchange_requests SET status = "ACCEPTED" WHERE id = ?',
      [id]
    );

    // 2. Update resource status to RESERVED
    await conn.query(
      'UPDATE resources SET status = "RESERVED" WHERE id = ?',
      [request.resource_id]
    );

    // 3. If SWAP, also reserve offered resource
    if (request.exchange_type.toUpperCase() === 'SWAP') {
      await conn.query(
        'UPDATE resources SET status = "RESERVED" WHERE id = ?',
        [request.offered_resource_id]
      );
    }

    await conn.commit();

    // M9.4: Notify requester of accepted request
    await createNotification(
      request.requester_id,
      'REQUEST_ACCEPTED',
      'Exchange Request Accepted',
      `Your exchange request for "${request.resource_title || 'resource'}" has been accepted!`,
      request.id,
      'exchange_requests'
    );
    return res.status(200).json({
      success: true,
      message: 'Exchange request accepted successfully.'
    });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error accepting request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while accepting request.'
    });
  } finally {
    if (conn) conn.release();
  }
};

// 6. Reject Exchange Request
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT er.id, er.requester_id, er.status, r.owner_id, r.title AS resource_title 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const request = rows[0];

    // Only owner can reject
    if (request.owner_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this request.'
      });
    }

    // Only PENDING requests can be rejected
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${request.status} to REJECTED.`
      });
    }

    // Update status to REJECTED
    await db.query(
      'UPDATE exchange_requests SET status = "REJECTED" WHERE id = ?',
      [id]
    );

    // M9.4: Notify requester of rejected request
    await createNotification(
      request.requester_id,
      'REQUEST_REJECTED',
      'Exchange Request Declined',
      `Your exchange request for "${request.resource_title || 'resource'}" was declined.`,
      request.id,
      'exchange_requests'
    );

    return res.status(200).json({
      success: true,
      message: 'Exchange request rejected successfully.'
    });

  } catch (error) {
    console.error('Error rejecting request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// 7. Complete Transaction
const completeRequest = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT er.id, er.status, er.offered_resource_id, er.resource_id, er.requester_id, r.owner_id, r.title AS resource_title, r.exchange_type 
       FROM exchange_requests er 
       JOIN resources r ON er.resource_id = r.id 
       WHERE er.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exchange request not found.'
      });
    }

    const request = rows[0];

    // Only requester or resource owner can mark complete
    if (request.owner_id !== userId && request.requester_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to complete this transaction.'
      });
    }

    // Only ACCEPTED requests can be completed
    if (request.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted requests can be marked as completed.'
      });
    }

    // Verify QR verification is completed
    const [qrRecords] = await db.query(
      'SELECT status FROM qr_verifications WHERE transaction_id = ?',
      [id]
    );

    if (qrRecords.length === 0 || qrRecords[0].status !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: 'QR verification is required before completing this exchange.'
      });
    }

    // Acquire transaction connection
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. Update request status to COMPLETED
    await conn.query(
      'UPDATE exchange_requests SET status = "COMPLETED" WHERE id = ?',
      [id]
    );

    // 2. Update resource status to EXCHANGED
    await conn.query(
      'UPDATE resources SET status = "EXCHANGED" WHERE id = ?',
      [request.resource_id]
    );

    // 3. If SWAP, update offered resource to EXCHANGED as well
    if (request.exchange_type.toUpperCase() === 'SWAP') {
      await conn.query(
        'UPDATE resources SET status = "EXCHANGED" WHERE id = ?',
        [request.offered_resource_id]
      );
    }

    await conn.commit();

    // M9.4: Notify the other participant that transaction is complete
    const notifyUserId = (Number(userId) === Number(request.owner_id)) ? request.requester_id : request.owner_id;
    await createNotification(
      notifyUserId,
      'EXCHANGE_COMPLETED',
      'Exchange Completed',
      `Your exchange for "${request.resource_title || 'resource'}" has been marked as completed. Please leave a review!`,
      request.id,
      'exchange_requests'
    );

    return res.status(200).json({
      success: true,
      message: 'Transaction completed successfully.'
    });

  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Error completing request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while completing transaction.'
    });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  completeRequest
};
