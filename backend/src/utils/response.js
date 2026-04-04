'use strict';

/**
 * Send a successful JSON response.
 */
function sendSuccess(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

/**
 * Send an error JSON response.
 */
function sendError(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = { success: false, message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

/**
 * Build pagination meta from query results.
 */
function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { sendSuccess, sendError, buildPaginationMeta };
