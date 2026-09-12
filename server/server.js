const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const resourcesRouter = require('./routes/resources');
const categoriesRouter = require('./routes/categories');
const exchangeRequestsRouter = require('./routes/exchangeRequests');
const reviewsRouter = require('./routes/reviews');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const chatRouter = require('./routes/chat');
const wishlistRouter = require('./routes/wishlist');
const usersRouter = require('./routes/users');
const analyticsRouter = require('./routes/analytics');
const { initSocket } = require('./socket');
const path = require('path');
const { ensureUploadDir } = require('./services/imageService');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
ensureUploadDir();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/exchange-requests', exchangeRequestsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/users', usersRouter);
app.use('/api/profile', usersRouter);
app.use('/api/analytics', analyticsRouter);

// Fallback Route for Undefined Paths (404 Handler)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'An unexpected server error occurred.',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Create HTTP server and initialize WebSockets
const server = http.createServer(app);
initSocket(server);

// Test database connection at startup
async function testDbConnection() {
  try {
    const connection = await db.getConnection();
    console.log(`[OK] Connected to MySQL database successfully.`);
    connection.release();
  } catch (error) {
    console.warn(`====================================================================`);
    console.warn(`[WARNING] Could not establish connection to MySQL database:`);
    console.warn(`          ${error.message}`);
    console.warn(`          Please ensure MySQL is running and credentials in .env are correct.`);
    console.warn(`          The server is still running, but database operations will fail.`);
    console.warn(`====================================================================`);
  }
}

// Start listening
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` ResourceHub server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(` Local Server: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
  
  testDbConnection();
});

