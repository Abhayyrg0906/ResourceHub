import { io } from 'socket.io-client';
import api from './api';

let socket = null;

export const chatService = {
  // REST APIs
  getConversations: async () => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  getConversationById: async (id) => {
    const res = await api.get(`/chat/conversations/${id}`);
    return res.data;
  },

  getOrCreateConversation: async (payload) => {
    const res = await api.post('/chat/conversations', payload);
    return res.data;
  },

  getMessages: async (conversationId) => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`);
    return res.data;
  },

  sendMessage: async (conversationId, messageText) => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, { messageText });
    return res.data;
  },

  markAsRead: async (conversationId) => {
    const res = await api.put(`/chat/conversations/${conversationId}/read`);
    return res.data;
  },

  // Socket.IO Client Management
  initSocket: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    if (socket && socket.connected) {
      return socket;
    }

    if (socket) {
      socket.disconnect();
    }

    const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : window.location.origin;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    return socket;
  },

  getSocket: () => {
    if (!socket || !socket.connected) {
      return chatService.initSocket();
    }
    return socket;
  },

  joinConversation: (conversationId, callback) => {
    const s = chatService.getSocket();
    if (s) {
      s.emit('join_conversation', { conversationId }, callback);
    }
  },

  leaveConversation: (conversationId) => {
    if (socket && socket.connected) {
      socket.emit('leave_conversation', { conversationId });
    }
  },

  sendTyping: (conversationId, isTyping) => {
    if (socket && socket.connected) {
      socket.emit('typing', { conversationId, isTyping });
    }
  },

  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};

export default chatService;
