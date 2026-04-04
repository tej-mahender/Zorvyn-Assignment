'use strict';

const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const dashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');

router.use(authenticate, authorize('dashboard:read'));

const dateRangeRules = [
  query('dateFrom').optional().isDate().withMessage('dateFrom must be YYYY-MM-DD'),
  query('dateTo').optional().isDate().withMessage('dateTo must be YYYY-MM-DD'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Analytics and summary endpoints (all authenticated roles)
 */

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     summary: Overall financial summary
 *     description: Returns total income, total expenses, net balance, savings rate, and record counts.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date, example: "2024-01-01" }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date, example: "2024-12-31" }
 *     responses:
 *       200:
 *         description: Summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_income:   { type: number }
 *                 total_expenses: { type: number }
 *                 net_balance:    { type: number }
 *                 savings_rate:   { type: number, description: "Percentage of income saved" }
 *                 record_count:   { type: integer }
 *                 income_count:   { type: integer }
 *                 expense_count:  { type: integer }
 */
router.get('/summary', dateRangeRules, validate, (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = dashboardService.getSummary({ dateFrom, dateTo });
    return sendSuccess(res, data, 'Summary fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dashboard/category-totals:
 *   get:
 *     summary: Income and expense totals grouped by category
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *         description: Filter by record type
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Category totals with percentages
 */
router.get('/category-totals', [
  ...dateRangeRules,
  query('type').optional().isIn(['income', 'expense']),
], validate, (req, res, next) => {
  try {
    const { type, dateFrom, dateTo } = req.query;
    const data = dashboardService.getCategoryTotals({ type, dateFrom, dateTo });
    return sendSuccess(res, data, 'Category totals fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dashboard/trends/monthly:
 *   get:
 *     summary: Monthly income vs expense trends
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, minimum: 1, maximum: 24 }
 *         description: Number of past months to include
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get('/trends/monthly', [
  query('months').optional().isInt({ min: 1, max: 24 }).toInt(),
], validate, (req, res, next) => {
  try {
    const months = req.query.months || 6;
    const data = dashboardService.getMonthlyTrends({ months });
    return sendSuccess(res, data, 'Monthly trends fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dashboard/trends/weekly:
 *   get:
 *     summary: Weekly income vs expense trends
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema: { type: integer, default: 8, minimum: 1, maximum: 52 }
 *     responses:
 *       200:
 *         description: Weekly trend data
 */
router.get('/trends/weekly', [
  query('weeks').optional().isInt({ min: 1, max: 52 }).toInt(),
], validate, (req, res, next) => {
  try {
    const weeks = req.query.weeks || 8;
    const data = dashboardService.getWeeklyTrends({ weeks });
    return sendSuccess(res, data, 'Weekly trends fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dashboard/recent-activity:
 *   get:
 *     summary: Most recent financial records
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Recent activity list
 */
router.get('/recent-activity', [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
], validate, (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const data = dashboardService.getRecentActivity({ limit });
    return sendSuccess(res, data, 'Recent activity fetched');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dashboard/top-categories:
 *   get:
 *     summary: Top spending categories by total expense amount
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5, maximum: 20 }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Top spending categories
 */
router.get('/top-categories', [
  ...dateRangeRules,
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt(),
], validate, (req, res, next) => {
  try {
    const { limit = 5, dateFrom, dateTo } = req.query;
    const data = dashboardService.getTopCategories({ limit, dateFrom, dateTo });
    return sendSuccess(res, data, 'Top categories fetched');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
