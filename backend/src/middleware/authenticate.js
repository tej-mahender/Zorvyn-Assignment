'use strict';

const jwt = require('jsonwebtoken');
const { queryOne } = require('../db/database');
const { sendError } = require('../utils/response');

/**
 * authenticate — verifies JWT and attaches user to req.user.
 * Must be applied to all protected routes.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authorization token required', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Re-fetch user from DB to ensure current status/role
    const user = queryOne(
      `SELECT id, name, email, role, status FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (!user) {
      return sendError(res, 'User not found', 401);
    }
    if (user.status === 'inactive') {
      return sendError(res, 'Account is inactive. Contact an administrator.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please log in again.', 401);
    }
    return sendError(res, 'Invalid token', 401);
  }
}

module.exports = { authenticate };
