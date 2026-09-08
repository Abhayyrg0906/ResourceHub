const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes require JWT authentication
router.use(protect);

// Conversation management
router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id', chatController.getConversationById);

// Message operations
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.put('/conversations/:id/read', chatController.markAsRead);

module.exports = router;
