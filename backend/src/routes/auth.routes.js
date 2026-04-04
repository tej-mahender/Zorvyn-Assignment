'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/authenticate');
const { register, login } = require('../services/auth.service');
const { auditLog, getIp, ACTIONS } = require('../utils/audit');
const { sendSuccess, sendError } = require('../utils/response');
const { ROLES } = require('../config/roles');

// ─── Validation rules ────────────────────────────────────────────────────────

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role')
    .optional()
    .isIn(Object.values(ROLES))
    .withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account. Default role is VIEWER. Only an ADMIN can assign ADMIN/ANALYST roles at creation.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: "Jane Doe" }
 *               email:    { type: string, format: email, example: "jane@example.com" }
 *               password: { type: string, example: "SecurePass1", minLength: 8 }
 *               role:     { type: string, enum: [VIEWER, ANALYST, ADMIN], default: VIEWER }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already registered
 *       422:
 *         description: Validation errors
 */
router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const { user, token } = await register({ name, email, password, role });
    auditLog({ userId: user.id, action: ACTIONS.REGISTER, entity: 'User', entityId: user.id, ipAddress: getIp(req) });
    return sendSuccess(res, { user, token }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: "admin@finance.dev" }
 *               password: { type: string, example: "Admin@123" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive
 */
router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await login({ email, password });
    auditLog({ userId: user.id, action: ACTIONS.LOGIN, entity: 'User', entityId: user.id, ipAddress: getIp(req) });
    return sendSuccess(res, { user, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Profile fetched');
});

module.exports = router;
