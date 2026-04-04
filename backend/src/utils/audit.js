'use strict';

const { v4: uuidv4 } = require('uuid');
const { run } = require('../db/database');

/**
 * Write an audit log entry.
 * Does NOT throw — audit failures should never break the main request.
 */
function auditLog({ userId, action, entity = null, entityId = null, metadata = null, ipAddress = null }) {
  try {
    const id = uuidv4();
    const meta = metadata ? JSON.stringify(metadata) : null;
    run(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, action, entity, entityId, meta, ipAddress]
    );
  } catch (err) {
    // Log to console but don't crash the request
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
}

/**
 * Get the real IP from request (handles proxies).
 */
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Audit action constants
const ACTIONS = {
  // Auth
  LOGIN:   'LOGIN',
  LOGOUT:  'LOGOUT',
  REGISTER:'REGISTER',

  // Financial Records
  RECORD_CREATE: 'RECORD_CREATE',
  RECORD_UPDATE: 'RECORD_UPDATE',
  RECORD_DELETE: 'RECORD_DELETE',
  RECORD_VIEW:   'RECORD_VIEW',

  // Users
  USER_CREATE:     'USER_CREATE',
  USER_UPDATE:     'USER_UPDATE',
  USER_STATUS:     'USER_STATUS_CHANGE',
  USER_ROLE:       'USER_ROLE_CHANGE',
};

module.exports = { auditLog, getIp, ACTIONS };
