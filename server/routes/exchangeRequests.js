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
const { 
  generateQr,
  verifyQr,
  getQrStatus,
  getQrHistory,
  getTransactionQrHistory
} = require('../controllers/qrController');
const { protect } = require('../middleware/authMiddleware');
const { qrLimiter } = require('../middleware/rateLimiter');

// All exchange request endpoints require authentication
router.use(protect);

// Global QR Handover History (placed before :id route)
router.get('/qr/history', getQrHistory);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.put('/:id/cancel', cancelRequest);
router.patch('/:id/cancel', cancelRequest);
router.put('/:id/accept', acceptRequest);
router.patch('/:id/accept', acceptRequest);
router.put('/:id/reject', rejectRequest);
router.patch('/:id/reject', rejectRequest);
router.put('/:id/complete', completeRequest);
router.patch('/:id/complete', completeRequest);

// QR Verification Endpoints
router.post('/:id/qr', generateQr);
router.post('/:id/qr/generate', generateQr);
router.post('/:id/qr/verify', qrLimiter, verifyQr);
router.get('/:id/qr', getQrStatus);
router.get('/:id/qr/history', getTransactionQrHistory);

module.exports = router;
