const ROLES = {
  VIEWER:  'VIEWER',
  ANALYST: 'ANALYST',
  ADMIN:   'ADMIN',
};

// Higher index = higher privilege
const ROLE_HIERARCHY = {
  [ROLES.VIEWER]:  0,
  [ROLES.ANALYST]: 1,
  [ROLES.ADMIN]:   2,
};

/**
 * Permission matrix — defines what each role can do.
 *
 * Records:
 *   VIEWER  → read only
 *   ANALYST → full CRUD (no user management)
 *   ADMIN   → full CRUD + user management
 *
 * Users:
 *   Only ADMIN can manage users.
 */
const PERMISSIONS = {
  // Financial Records
  'records:read':   [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN],
  'records:create': [ROLES.ANALYST, ROLES.ADMIN],
  'records:update': [ROLES.ANALYST, ROLES.ADMIN],
  'records:delete': [ROLES.ANALYST, ROLES.ADMIN],

  // Dashboard / Analytics
  'dashboard:read': [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN],

  // Audit Logs
  'audit:read':     [ROLES.ADMIN],

  // User management
  'users:read':     [ROLES.ADMIN],
  'users:create':   [ROLES.ADMIN],
  'users:update':   [ROLES.ADMIN],
  'users:delete':   [ROLES.ADMIN],
};

/**
 * Check if a role has a specific permission.
 */
function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

module.exports = { ROLES, ROLE_HIERARCHY, PERMISSIONS, can };
