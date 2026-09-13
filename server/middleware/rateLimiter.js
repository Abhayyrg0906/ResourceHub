const rateLimit = require('express-rate-limit');

/**
 * RESOURCEHUB — M25: RATE LIMITING MIDDLEWARE
 * Configurable rate limiters for sensitive endpoints and general API traffic.
 */

// Window configuration (default: 15 minutes)
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;

// Auth limiter for Login & Registration (prevents brute-force credential stuffing)
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || (process.env.NODE_ENV === 'test' ? 1000 : 150),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

// QR Verification Limiter (prevents automated brute-forcing of exchange QR tokens)
const qrLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_QR_MAX, 10) || (process.env.NODE_ENV === 'test' ? 1000 : 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many QR verification attempts. Please wait a moment before trying again.'
  }
});

// General API Rate Limiter
const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || (process.env.NODE_ENV === 'test' ? 5000 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'API rate limit exceeded. Please slow down your requests.'
  }
});

module.exports = {
  authLimiter,
  qrLimiter,
  generalLimiter
};
