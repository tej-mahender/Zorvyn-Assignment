'use strict';

const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { query: dbQuery, queryOne } = require('../db/database');
const { sendSuccess, buildPaginationMeta } = require('../utils/response');

router.use(authenticate, authorize('audit:read'));

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log access (Admin only)
 */

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs with filtering and pagination
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action (e.g. LOGIN, RECORD_CREATE)
 *       - in: query
 *         name: entity
 *         schema: { type: string }
 *         description: Filter by entity type (User, FinancialRecord)
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('dateFrom').optional().isDate(),
  query('dateTo').optional().isDate(),
], validate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, userId, action, entity, dateFrom, dateTo } = req.query;

    const conditions = [];
    const params = [];

    if (userId)   { conditions.push('a.user_id = ?');       params.push(userId); }
    if (action)   { conditions.push('a.action LIKE ?');     params.push(`%${action}%`); }
    if (entity)   { conditions.push('a.entity = ?');        params.push(entity); }
    if (dateFrom) { conditions.push('a.created_at >= ?');   params.push(dateFrom); }
    if (dateTo)   { conditions.push('a.created_at <= ?');   params.push(dateTo + ' 23:59:59'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = queryOne(`SELECT COUNT(*) as total FROM audit_logs a ${where}`, params);
    const total = countRow.total;

    const offset = (page - 1) * limit;
    const rows = dbQuery(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.metadata, a.ip_address, a.created_at,
              u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const logs = rows.map(r => ({
      id:         r.id,
      action:     r.action,
      entity:     r.entity,
      entity_id:  r.entity_id,
      metadata:   r.metadata ? JSON.parse(r.metadata) : null,
      ip_address: r.ip_address,
      created_at: r.created_at,
      user: r.user_id ? { id: r.user_id, name: r.user_name, email: r.user_email, role: r.user_role } : null,
    }));

    const meta = buildPaginationMeta(total, page, limit);
    return sendSuccess(res, logs, 'Audit logs fetched', 200, meta);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
