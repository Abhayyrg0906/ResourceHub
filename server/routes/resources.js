const express = require('express');
const router = express.Router();
const { 
  getResources, 
  getResourceById, 
  createResource, 
  updateResource, 
  deleteResource 
} = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');

// Public endpoints
router.get('/', getResources);
router.get('/:id', getResourceById);

// Protected endpoints (Require student session token)
router.post('/', protect, createResource);
router.put('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;
