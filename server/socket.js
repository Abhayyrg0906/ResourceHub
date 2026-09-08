const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./config/database');

let ioInstance = null;

/**
 * Initialize Socket.IO server with JWT authentication and room authorization.
 * @param {import('http').Server} httpServer 
 */
function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*', // Allow frontend dev server and clients
      methods: ['GET', 'POST']
    }
  });

  // JWT Socket Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      // Extract token from handshake auth or authorization header
      let token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token && socket.handshake.headers && socket.handshake.headers.authorization) {
        const parts = socket.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const jwtSecret = process.env.JWT_SECRET || 'supersecretkey12345_change_me_in_production';
      const decoded = jwt.verify(token, jwtSecret);

      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token payload'));
      }

      // Verify user exists and is active in database
      const [users] = await db.query(
        'SELECT id, name, email, role, status FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!users || users.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      if (users[0].status === 'SUSPENDED') {
        return next(new Error('Authentication error: User suspended'));
      }

      // Attach authenticated user to socket
      socket.user = {
        userId: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role
      };

      return next();
    } catch (err) {
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  // Connection Handler
  ioInstance.on('connection', (socket) => {
    const userId = socket.user.userId;
    // Join user-specific notification room
    socket.join(`user_${userId}`);

    // Room join request with server-side authorization check
    socket.on('join_conversation', async (data, callback) => {
      try {
        const conversationId = data && data.conversationId;
        if (!conversationId) {
          if (callback) callback({ success: false, error: 'Conversation ID required' });
          return;
        }

        // Verify user is a participant in this conversation
        const [conv] = await db.query(
          'SELECT id, participant1_id, participant2_id FROM conversations WHERE id = ?',
          [conversationId]
        );

        if (!conv || conv.length === 0) {
          socket.emit('socket_error', { message: 'Conversation not found' });
          if (callback) callback({ success: false, error: 'Conversation not found' });
          return;
        }

        const isParticipant = conv[0].participant1_id === userId || conv[0].participant2_id === userId;
        if (!isParticipant) {
          socket.emit('socket_error', { message: 'Forbidden. You are not a participant in this conversation.' });
          if (callback) callback({ success: false, error: 'Forbidden' });
          return;
        }

        const roomName = `conversation_${conversationId}`;
        socket.join(roomName);

        if (callback) callback({ success: true, room: roomName });
      } catch (err) {
        socket.emit('socket_error', { message: 'Failed to join conversation room' });
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (data) => {
      if (data && data.conversationId) {
        socket.leave(`conversation_${data.conversationId}`);
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      try {
        const conversationId = data && data.conversationId;
        if (!conversationId) return;

        // Verify participation
        const [conv] = await db.query(
          'SELECT participant1_id, participant2_id FROM conversations WHERE id = ?',
          [conversationId]
        );
        if (conv && conv.length > 0 && (conv[0].participant1_id === userId || conv[0].participant2_id === userId)) {
          socket.to(`conversation_${conversationId}`).emit('user_typing', {
            conversationId,
            userId,
            isTyping: !!data.isTyping
          });
        }
      } catch (err) {
        // Ignore typing indicator errors
      }
    });

    socket.on('disconnect', () => {
      // Handled cleanly by Socket.IO
    });
  });

  return ioInstance;
}

/**
 * Returns the active Socket.IO server instance.
 */
function getIO() {
  return ioInstance;
}

/**
 * Emits an event to all clients in a specific conversation room.
 */
function emitToConversation(conversationId, event, data) {
  if (ioInstance) {
    ioInstance.to(`conversation_${conversationId}`).emit(event, data);
  }
}

/**
 * Emits an event to a specific user's private notification channel.
 */
function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit(event, data);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToConversation,
  emitToUser
};
