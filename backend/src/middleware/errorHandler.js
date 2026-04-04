'use strict';

/**
 * Global error handler — must be registered last in Express.
 * Catches any error passed via next(err).
 */
function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  // Known operational errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message || 'An error occurred',
    });
  }

  // SQLite constraint errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
    });
  }

  // Default 500
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

module.exports = { errorHandler };
