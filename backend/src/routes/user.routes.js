'use strict';

const router = require('express').Router();
const { body, query, param } = require('express-validator');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const userService = require('../services/user.service');
const { auditLog, getIp, ACTIONS } = require('../utils/audit');
const { sendSuccess, sendError, buildPaginationMeta } = require('../utils/response');
const { ROLES } = require('../config/roles');

// All user routes require auth + admin permission
router.use(authenticate, authorize('users:read'));

// ─── Validation rules ────────────────────────────────────────────────────────

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Min 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase')
    .matches(/[0-9]/).withMessage('Must contain a number'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
];

const updateRules = [
  param('id').notEmpty(),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('Valid email required').normalizeEmail(),
];

const roleRules = [
  param('id').notEmpty(),
  body('role').isIn(Object.values(ROLES)).withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
];

const statusRules = [
  param('id').notEmpty(),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
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
 *         name: role
 *         schema: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Admin only
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(Object.values(ROLES)),
  query('status').optional().isIn(['active', 'inactive']),
], validate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const { rows, total } = userService.getAll({ page, limit, role, status, search });
    const meta = buildPaginationMeta(total, page, limit);
    return sendSuccess(res, rows, 'Users fetched', 200, meta);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', (req, res, next) => {
  try {
    const user = userService.getById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role:     { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already in use
 */
router.post('/', authorize('users:create'), createRules, validate, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await userService.create({ name, email, password, role });
    auditLog({ userId: req.user.id, action: ACTIONS.USER_CREATE, entity: 'User', entityId: user.id, metadata: { email, role }, ipAddress: getIp(req) });
    return sendSuccess(res, user, 'User created', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user's name or email
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/:id', authorize('users:update'), updateRules, validate, (req, res, next) => {
  try {
    const user = userService.update(req.params.id, req.body);
    auditLog({ userId: req.user.id, action: ACTIONS.USER_UPDATE, entity: 'User', entityId: req.params.id, metadata: req.body, ipAddress: getIp(req) });
    return sendSuccess(res, user, 'User updated');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}/role:
 *   patch:
 *     summary: Change a user's role
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Cannot change own role
 */
router.patch('/:id/role', authorize('users:update'), roleRules, validate, (req, res, next) => {
  try {
    const user = userService.changeRole(req.params.id, req.body.role, req.user.id);
    auditLog({ userId: req.user.id, action: ACTIONS.USER_ROLE, entity: 'User', entityId: req.params.id, metadata: { new_role: req.body.role }, ipAddress: getIp(req) });
    return sendSuccess(res, user, 'Role updated');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Cannot change own status
 */
router.patch('/:id/status', authorize('users:update'), statusRules, validate, (req, res, next) => {
  try {
    const user = userService.changeStatus(req.params.id, req.body.status, req.user.id);
    auditLog({ userId: req.user.id, action: ACTIONS.USER_STATUS, entity: 'User', entityId: req.params.id, metadata: { new_status: req.body.status }, ipAddress: getIp(req) });
    return sendSuccess(res, user, 'Status updated');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
