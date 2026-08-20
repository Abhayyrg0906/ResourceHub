const mysql = require('mysql2/promise');

// Build the MySQL connection pool configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
};

// Create the pool
const pool = mysql.createPool(poolConfig);

// Handle unexpected connection drop errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database connection pool client:', err.message);
});

module.exports = pool;
