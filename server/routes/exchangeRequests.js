const express = require('express');
const router = express.Router();
const { 
  createRequest,
  getRequests,
  getRequestById,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  completeRequest
} = require('../controllers/exchangeController');
const { protect } = require('../middleware/authMiddleware');

// All exchange request endpoints require authentication
router.use(protect);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.put('/:id/cancel', cancelRequest);
router.put('/:id/accept', acceptRequest);
router.put('/:id/reject', rejectRequest);
router.put('/:id/complete', completeRequest);

module.exports = router;
