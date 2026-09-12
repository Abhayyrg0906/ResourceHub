const express = require('express');
const router = express.Router();
const { 
  getResources, 
  getResourceById, 
  createResource, 
  updateResource, 
  deleteResource,
  uploadResourceImages,
  addResourceImage,
  setPrimaryResourceImage,
  deleteResourceImage
} = require('../controllers/resourceController');
const { getSimilarResources } = require('../controllers/recommendationController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { handleImageUpload } = require('../middleware/imageUploadMiddleware');

// Public endpoints
router.get('/', getResources);
router.get('/:id/similar', optionalAuth, getSimilarResources);
router.get('/:id', getResourceById);


// Protected image upload and listing endpoints
router.post('/upload', protect, handleImageUpload, uploadResourceImages);
router.post('/', protect, createResource);
router.put('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);

// Resource-specific image management endpoints
router.post('/:id/images', protect, handleImageUpload, addResourceImage);
router.patch('/:id/images/:imageId/primary', protect, setPrimaryResourceImage);
router.delete('/:id/images/:imageId', protect, deleteResourceImage);

module.exports = router;

