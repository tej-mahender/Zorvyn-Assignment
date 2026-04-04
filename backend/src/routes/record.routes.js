'use strict';

const router = require('express').Router();
const { body, query, param } = require('express-validator');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const recordService = require('../services/record.service');
const { auditLog, getIp, ACTIONS } = require('../utils/audit');
const { sendSuccess, sendError, buildPaginationMeta } = require('../utils/response');

router.use(authenticate);

// ─── Validation rules ────────────────────────────────────────────────────────

const createRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number').toFloat(),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('date').isDate({ format: 'YYYY-MM-DD' }).withMessage('Date must be in YYYY-MM-DD format'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes max 1000 chars'),
];

const updateRules = [
  param('id').notEmpty(),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be positive').toFloat(),
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().trim().notEmpty().isLength({ max: 100 }),
  body('date').optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('Date must be YYYY-MM-DD'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

const listRules = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional().isIn(['income', 'expense']),
  query('dateFrom').optional().isDate(),
  query('dateTo').optional().isDate(),
  query('sortBy').optional().isIn(['date', 'amount', 'created_at', 'category']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial records management
 */

/**
 * @swagger
 * /records:
 *   get:
 *     summary: List financial records with filtering, search, and pagination
 *     tags: [Records]
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
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Partial match on category
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date, example: "2024-01-01" }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date, example: "2024-12-31" }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in notes or category
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, created_at, category], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: Paginated list of records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FinancialRecord'
 *                 meta:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', authorize('records:read'), listRules, validate, (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, category, dateFrom, dateTo, search, sortBy, sortOrder } = req.query;
    const { records, total } = recordService.getAll({ page, limit, type, category, dateFrom, dateTo, search, sortBy, sortOrder });
    const meta = buildPaginationMeta(total, page, limit);
    return sendSuccess(res, records, 'Records fetched', 200, meta);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /records/categories:
 *   get:
 *     summary: Get all distinct categories in use
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', authorize('records:read'), (req, res, next) => {
  try {
    const categories = recordService.getCategories();
    return sendSuccess(res, categories, 'Categories fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Get a single record by ID
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record details
 *       404:
 *         description: Not found
 */
router.get('/:id', authorize('records:read'), (req, res, next) => {
  try {
    const record = recordService.getById(req.params.id);
    if (!record) return sendError(res, 'Record not found', 404);
    auditLog({ userId: req.user.id, action: ACTIONS.RECORD_VIEW, entity: 'FinancialRecord', entityId: req.params.id, ipAddress: getIp(req) });
    return sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /records:
 *   post:
 *     summary: Create a financial record (Analyst, Admin)
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:   { type: number, example: 1500.00 }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string, example: "Salary" }
 *               date:     { type: string, format: date, example: "2024-01-15" }
 *               notes:    { type: string, example: "Monthly salary payment" }
 *     responses:
 *       201:
 *         description: Record created
 *       403:
 *         description: Insufficient permissions (VIEWER role)
 *       422:
 *         description: Validation errors
 */
router.post('/', authorize('records:create'), createRules, validate, (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const record = recordService.create({ amount, type, category, date, notes }, req.user.id);
    auditLog({ userId: req.user.id, action: ACTIONS.RECORD_CREATE, entity: 'FinancialRecord', entityId: record.id, metadata: { amount, type, category }, ipAddress: getIp(req) });
    return sendSuccess(res, record, 'Record created', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /records/{id}:
 *   patch:
 *     summary: Update a financial record (Analyst, Admin)
 *     tags: [Records]
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
 *               amount:   { type: number }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date:     { type: string, format: date }
 *               notes:    { type: string }
 *     responses:
 *       200:
 *         description: Record updated
 *       404:
 *         description: Not found
 */
router.patch('/:id', authorize('records:update'), updateRules, validate, (req, res, next) => {
  try {
    const record = recordService.update(req.params.id, req.body);
    auditLog({ userId: req.user.id, action: ACTIONS.RECORD_UPDATE, entity: 'FinancialRecord', entityId: req.params.id, metadata: req.body, ipAddress: getIp(req) });
    return sendSuccess(res, record, 'Record updated');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     summary: Soft-delete a financial record (Analyst, Admin)
 *     description: Marks the record as deleted without removing it from the database.
 *     tags: [Records]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', authorize('records:delete'), (req, res, next) => {
  try {
    recordService.softDelete(req.params.id);
    auditLog({ userId: req.user.id, action: ACTIONS.RECORD_DELETE, entity: 'FinancialRecord', entityId: req.params.id, ipAddress: getIp(req) });
    return sendSuccess(res, null, 'Record deleted');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
