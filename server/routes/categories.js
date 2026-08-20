const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/resourceController');

// Public endpoints
router.get('/', getCategories);

module.exports = router;
