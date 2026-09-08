const db = require('../config/database');
const { emitToConversation, emitToUser } = require('../socket');
const { createNotification } = require('../services/notificationService');

/**
 * Get or create a conversation between the authenticated user and another participant
 * for a specific resource or exchange request.
 * Prevents duplicate conversations for the same resource + participant pair.
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resourceId, transactionId, recipientId } = req.body;

    let targetResourceId = resourceId;
    let partnerId = recipientId;
    let targetTransactionId = transactionId || null;

    // If transactionId is provided, resolve resource and participants from the exchange request
    if (transactionId) {
      const [exchanges] = await db.query(
        `SELECT er.id, er.resource_id, er.requester_id, r.owner_id 
         FROM exchange_requests er
         JOIN resources r ON er.resource_id = r.id
         WHERE er.id = ?`,
        [transactionId]
      );

      if (!exchanges || exchanges.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Exchange request not found.'
        });
      }

      const exchange = exchanges[0];
      const isParticipant = exchange.requester_id === userId || exchange.owner_id === userId;
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You are not a participant in this exchange request.'
        });
      }

      targetResourceId = exchange.resource_id;
      partnerId = exchange.requester_id === userId ? exchange.owner_id : exchange.requester_id;
      targetTransactionId = exchange.id;
    } else if (targetResourceId) {
      // Look up resource
      const [resources] = await db.query(
        'SELECT id, owner_id, title FROM resources WHERE id = ?',
        [targetResourceId]
      );

      if (!resources || resources.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.'
        });
      }

      const resource = resources[0];

      if (partnerId) {
        // Owner initiating conversation with a specific requester
        const isParticipant = resource.owner_id === userId || partnerId === resource.owner_id;
        if (!isParticipant && partnerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden. Invalid participants for this resource listing.'
          });
        }
      } else {
        if (resource.owner_id === userId) {
          return res.status(400).json({
            success: false,
            message: 'Please specify a recipient when messaging about your own listing.'
          });
        }
        partnerId = resource.owner_id;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either resourceId or transactionId is required.'
      });
    }

    // Disallow self-conversation
    if (userId === partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a conversation with yourself.'
      });
    }

    // Deterministic participant IDs (p1 < p2) to enforce database uniqueness
    const participant1_id = Math.min(userId, partnerId);
    const participant2_id = Math.max(userId, partnerId);

    // Check if conversation already exists
    const [existing] = await db.query(
      `SELECT c.*, 
              r.title as resource_title, r.exchange_type, r.price, r.status as resource_status,
              (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = 1 LIMIT 1) as resource_image
       FROM conversations c
       JOIN resources r ON c.resource_id = r.id
       WHERE c.resource_id = ? AND c.participant1_id = ? AND c.participant2_id = ?`,
      [targetResourceId, participant1_id, participant2_id]
    );

    if (existing && existing.length > 0) {
      const conv = existing[0];
      // If transactionId was supplied now but not saved before, link it
      if (targetTransactionId && !conv.transaction_id) {
        await db.query(
          'UPDATE conversations SET transaction_id = ? WHERE id = ?',
          [targetTransactionId, conv.id]
        );
        conv.transaction_id = targetTransactionId;
      }

      // Fetch partner info
      const [partnerInfo] = await db.query(
        'SELECT id, name, email, profile_photo_url, trust_score, department FROM users WHERE id = ?',
        [partnerId]
      );

      return res.status(200).json({
        success: true,
        conversation: {
          ...conv,
          partner: partnerInfo[0] || null
        },
        created: false
      });
    }

    // Create new conversation
    const [result] = await db.query(
      `INSERT INTO conversations 
        (resource_id, transaction_id, participant1_id, participant2_id)
       VALUES (?, ?, ?, ?)`,
      [targetResourceId, targetTransactionId, participant1_id, participant2_id]
    );

    const newConversationId = result.insertId;

    // Fetch newly created conversation with resource and partner details
    const [newConvRows] = await db.query(
      `SELECT c.*, 
              r.title as resource_title, r.exchange_type, r.price, r.status as resource_status,
              (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = 1 LIMIT 1) as resource_image
       FROM conversations c
       JOIN resources r ON c.resource_id = r.id
       WHERE c.id = ?`,
      [newConversationId]
    );

    const [partnerInfo] = await db.query(
      'SELECT id, name, email, profile_photo_url, trust_score, department FROM users WHERE id = ?',
      [partnerId]
    );

    return res.status(201).json({
      success: true,
      conversation: {
        ...newConvRows[0],
        partner: partnerInfo[0] || null
      },
      created: true
    });
  } catch (error) {
    console.error('[ChatController] Error in getOrCreateConversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create or retrieve conversation.'
    });
  }
};

/**
 * Get all conversations for the authenticated user, ordered by last activity.
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        c.id,
        c.resource_id,
        c.transaction_id,
        c.participant1_id,
        c.participant2_id,
        c.last_message_at,
        c.created_at,
        r.title as resource_title,
        r.exchange_type,
        r.price,
        r.status as resource_status,
        (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = 1 LIMIT 1) as resource_image,
        CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END AS partner_id,
        u.name as partner_name,
        u.email as partner_email,
        u.profile_photo_url as partner_photo,
        u.trust_score as partner_trust_score,
        u.department as partner_department,
        (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_text,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender_id,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
      FROM conversations c
      JOIN resources r ON c.resource_id = r.id
      JOIN users u ON u.id = (CASE WHEN c.participant1_id = ? THEN c.participant2_id ELSE c.participant1_id END)
      WHERE c.participant1_id = ? OR c.participant2_id = ?
      ORDER BY c.last_message_at DESC
    `;

    const [rows] = await db.query(sql, [userId, userId, userId, userId, userId]);

    // Format conversations with clean partner objects
    const conversations = rows.map(row => ({
      id: row.id,
      resource_id: row.resource_id,
      transaction_id: row.transaction_id,
      resource: {
        id: row.resource_id,
        title: row.resource_title,
        exchange_type: row.exchange_type,
        price: row.price,
        status: row.resource_status,
        image_url: row.resource_image
      },
      partner: {
        id: row.partner_id,
        name: row.partner_name,
        email: row.partner_email,
        profile_photo_url: row.partner_photo,
        trust_score: row.partner_trust_score,
        department: row.partner_department
      },
      last_message: row.last_message_text ? {
        text: row.last_message_text,
        created_at: row.last_message_time,
        sender_id: row.last_message_sender_id,
        is_mine: row.last_message_sender_id === userId
      } : null,
      unread_count: parseInt(row.unread_count || 0, 10),
      last_message_at: row.last_message_at,
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('[ChatController] Error in getConversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations.'
    });
  }
};

/**
 * Get single conversation details by ID, validating participation.
 */
const getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const [convRows] = await db.query(
      `SELECT c.*,
              r.title as resource_title, r.exchange_type, r.price, r.status as resource_status,
              r.owner_id as resource_owner_id,
              (SELECT image_url FROM resource_images WHERE resource_id = r.id AND is_primary = 1 LIMIT 1) as resource_image
       FROM conversations c
       JOIN resources r ON c.resource_id = r.id
       WHERE c.id = ?`,
      [conversationId]
    );

    if (!convRows || convRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const conv = convRows[0];
    const isParticipant = conv.participant1_id === userId || conv.participant2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a participant in this conversation.'
      });
    }

    const partnerId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;
    const [partnerRows] = await db.query(
      'SELECT id, name, email, profile_photo_url, trust_score, department FROM users WHERE id = ?',
      [partnerId]
    );

    // If linked to transaction, fetch request status
    let transaction = null;
    if (conv.transaction_id) {
      const [txRows] = await db.query(
        'SELECT id, status, requester_id, created_at FROM exchange_requests WHERE id = ?',
        [conv.transaction_id]
      );
      if (txRows && txRows.length > 0) {
        transaction = txRows[0];
      }
    }

    return res.status(200).json({
      success: true,
      conversation: {
        id: conv.id,
        resource_id: conv.resource_id,
        transaction_id: conv.transaction_id,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
        resource: {
          id: conv.resource_id,
          title: conv.resource_title,
          exchange_type: conv.exchange_type,
          price: conv.price,
          status: conv.resource_status,
          owner_id: conv.resource_owner_id,
          image_url: conv.resource_image
        },
        partner: partnerRows[0] || null,
        transaction
      }
    });
  } catch (error) {
    console.error('[ChatController] Error in getConversationById:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation details.'
    });
  }
};

/**
 * Get all messages for a conversation, validating participation, and marking incoming messages as read.
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // Check conversation exists and user is participant
    const [conv] = await db.query(
      'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!conv || conv.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const isParticipant = conv[0].participant1_id === userId || conv[0].participant2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a participant in this conversation.'
      });
    }

    // Retrieve messages in chronological order
    const [messages] = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.is_read, m.created_at,
              u.name as sender_name, u.profile_photo_url as sender_photo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    // Mark unread messages sent by the partner as read
    const [updateResult] = await db.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [conversationId, userId]
    );

    if (updateResult.affectedRows > 0) {
      emitToConversation(conversationId, 'messages_read', {
        conversationId: parseInt(conversationId, 10),
        readerId: userId
      });
    }

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('[ChatController] Error in getMessages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages.'
    });
  }
};

/**
 * Send a message in a conversation. Validates text, enforces participation,
 * persists in MySQL, emits Socket.IO event, and triggers notification.
 */
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const text = (req.body.messageText || req.body.message_text || req.body.text || req.body.content || '').trim();

    // Validation: empty or whitespace
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty.'
      });
    }

    // Validation: maximum character length (2000 characters)
    if (text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum allowed length of 2000 characters.'
      });
    }

    // Verify conversation existence and participant authorization
    const [convRows] = await db.query(
      'SELECT id, participant1_id, participant2_id, resource_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!convRows || convRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const conv = convRows[0];
    const isParticipant = conv.participant1_id === userId || conv.participant2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to send messages in this conversation.'
      });
    }

    // Insert message into MySQL
    const [result] = await db.query(
      'INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)',
      [conversationId, userId, text]
    );

    const messageId = result.insertId;

    // Update conversation last_message_at
    await db.query(
      'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );

    // Fetch the newly created message with sender info
    const [createdRows] = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.is_read, m.created_at,
              u.name as sender_name, u.profile_photo_url as sender_photo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    const messageData = createdRows[0];

    // Determine recipient
    const recipientId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;

    // Real-time broadcast to conversation room
    emitToConversation(conversationId, 'new_message', messageData);

    // Real-time ping to recipient's private user channel
    emitToUser(recipientId, 'chat_notification', {
      conversationId: parseInt(conversationId, 10),
      senderId: userId,
      senderName: req.user.name,
      messageText: text.length > 80 ? text.substring(0, 77) + '...' : text,
      createdAt: messageData.created_at
    });

    // Create persistent notification in notifications table without failing the message request
    createNotification(
      recipientId,
      'NEW_MESSAGE',
      `New message from ${req.user.name}`,
      text.length > 80 ? text.substring(0, 77) + '...' : text,
      parseInt(conversationId, 10),
      'conversations'
    ).catch(err => console.error('[ChatController] Error creating message notification:', err));

    return res.status(201).json({
      success: true,
      message: messageData
    });
  } catch (error) {
    console.error('[ChatController] Error in sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message.'
    });
  }
};

/**
 * Mark messages in a conversation as read.
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const [conv] = await db.query(
      'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!conv || conv.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const isParticipant = conv[0].participant1_id === userId || conv[0].participant2_id === userId;
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a participant in this conversation.'
      });
    }

    const [result] = await db.query(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [conversationId, userId]
    );

    if (result.affectedRows > 0) {
      emitToConversation(conversationId, 'messages_read', {
        conversationId: parseInt(conversationId, 10),
        readerId: userId
      });
    }

    return res.status(200).json({
      success: true,
      affectedRows: result.affectedRows,
      message: 'Messages marked as read.'
    });
  } catch (error) {
    console.error('[ChatController] Error in markAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read.'
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getConversationById,
  getMessages,
  sendMessage,
  markAsRead
};
