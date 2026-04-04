'use strict';

const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * validate — runs after express-validator chains.
 * Returns 422 with formatted errors if validation failed.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({
      field: e.path,
      message: e.msg,
      value: e.value,
    }));
    return sendError(res, 'Validation failed', 422, formatted);
  }
  next();
}

module.exports = { validate };
