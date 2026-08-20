const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/health
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    message: 'ResourceHub API is running successfully.',
    timestamp: new Date().toISOString(),
    service: 'ResourceHub-Backend'
  });
});

// GET /api/health/db
router.get('/health/db', async (req, res) => {
  try {
    // Execute a harmless query to verify database connectivity
    await db.query('SELECT 1');
    res.status(200).json({
      success: true,
      database: 'connected'
    });
  } catch (error) {
    // Log the detailed error locally (do not include passwords/secrets)
    console.error('Database connection verification failed:', error.message);

    res.status(500).json({
      success: false,
      database: 'disconnected',
      error: 'Database communication error. Connection failed or timed out.'
    });
  }
});

module.exports = router;
