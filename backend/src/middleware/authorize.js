'use strict';

const { can } = require('../config/roles');
const { sendError } = require('../utils/response');

/**
 * authorize(permission) — middleware factory.
 * Checks if req.user.role has the given permission.
 *
 * Usage:
 *   router.post('/', authenticate, authorize('records:create'), handler)
 */
function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }
    if (!can(req.user.role, permission)) {
      return sendError(
        res,
        `Forbidden: '${req.user.role}' role does not have '${permission}' permission`,
        403
      );
    }
    next();
  };
}

/**
 * authorizeRoles(...roles) — allow specific roles explicitly.
 * Useful for role-level (not permission-level) checks.
 */
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden: insufficient role', 403);
    }
    next();
  };
}

module.exports = { authorize, authorizeRoles };
