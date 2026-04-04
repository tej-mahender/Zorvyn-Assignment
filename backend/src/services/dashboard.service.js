'use strict';

const { query, queryOne } = require('../db/database');

/**
 * Overall summary: total income, expenses, net balance, record count.
 */
function getSummary({ dateFrom, dateTo } = {}) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?'); params.push(dateTo); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const totals = queryOne(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
       COUNT(*) AS record_count,
       COUNT(CASE WHEN type = 'income'  THEN 1 END) AS income_count,
       COUNT(CASE WHEN type = 'expense' THEN 1 END) AS expense_count
     FROM financial_records ${where}`,
    params
  );

  const net_balance = totals.total_income - totals.total_expenses;
  const savings_rate = totals.total_income > 0
    ? Math.round((net_balance / totals.total_income) * 10000) / 100
    : 0;

  return {
    total_income:   Math.round(totals.total_income * 100) / 100,
    total_expenses: Math.round(totals.total_expenses * 100) / 100,
    net_balance:    Math.round(net_balance * 100) / 100,
    savings_rate,   // percentage
    record_count:   totals.record_count,
    income_count:   totals.income_count,
    expense_count:  totals.expense_count,
  };
}

/**
 * Category-wise totals, optionally filtered by type (income|expense).
 */
function getCategoryTotals({ type, dateFrom, dateTo } = {}) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  if (type)     { conditions.push('type = ?');    params.push(type); }
  if (dateFrom) { conditions.push('date >= ?');   params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?');   params.push(dateTo); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = query(
    `SELECT category, type,
            ROUND(SUM(amount), 2) AS total,
            COUNT(*) AS count
     FROM financial_records ${where}
     GROUP BY category, type
     ORDER BY total DESC`,
    params
  );

  // Compute grand total for percentage calculation
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return rows.map(r => ({
    category:   r.category,
    type:       r.type,
    total:      r.total,
    count:      r.count,
    percentage: grandTotal > 0
      ? Math.round((r.total / grandTotal) * 10000) / 100
      : 0,
  }));
}

/**
 * Monthly trend data for the last N months.
 */
function getMonthlyTrends({ months = 6 } = {}) {
  const rows = query(
    `SELECT
       strftime('%Y-%m', date) AS month,
       ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS income,
       ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expenses,
       COUNT(*) AS record_count
     FROM financial_records
     WHERE deleted_at IS NULL
       AND date >= date('now', ? || ' months')
     GROUP BY strftime('%Y-%m', date)
     ORDER BY month ASC`,
    [`-${months}`]
  );

  return rows.map(r => ({
    month:        r.month,
    income:       r.income,
    expenses:     r.expenses,
    net:          Math.round((r.income - r.expenses) * 100) / 100,
    record_count: r.record_count,
  }));
}

/**
 * Weekly trend data for the last N weeks.
 */
function getWeeklyTrends({ weeks = 8 } = {}) {
  const rows = query(
    `SELECT
       strftime('%Y-W%W', date) AS week,
       ROUND(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 2) AS income,
       ROUND(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 2) AS expenses,
       COUNT(*) AS record_count
     FROM financial_records
     WHERE deleted_at IS NULL
       AND date >= date('now', ? || ' days')
     GROUP BY strftime('%Y-W%W', date)
     ORDER BY week ASC`,
    [`-${weeks * 7}`]
  );

  return rows.map(r => ({
    week:         r.week,
    income:       r.income,
    expenses:     r.expenses,
    net:          Math.round((r.income - r.expenses) * 100) / 100,
    record_count: r.record_count,
  }));
}

/**
 * Recent activity — latest N records across all types.
 */
function getRecentActivity({ limit = 10 } = {}) {
  const rows = query(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes,
            r.created_at, u.id as user_id, u.name as user_name
     FROM financial_records r
     LEFT JOIN users u ON r.created_by_id = u.id
     WHERE r.deleted_at IS NULL
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [Math.min(limit, 50)]
  );

  return rows.map(r => ({
    id:       r.id,
    amount:   r.amount,
    type:     r.type,
    category: r.category,
    date:     r.date,
    notes:    r.notes,
    created_at: r.created_at,
    created_by: r.user_id ? { id: r.user_id, name: r.user_name } : null,
  }));
}

/**
 * Top spending categories (expenses only).
 */
function getTopCategories({ limit = 5, dateFrom, dateTo } = {}) {
  const conditions = ["deleted_at IS NULL", "type = 'expense'"];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?'); params.push(dateTo); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  return query(
    `SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS count
     FROM financial_records ${where}
     GROUP BY category ORDER BY total DESC LIMIT ?`,
    [...params, limit]
  );
}

module.exports = { getSummary, getCategoryTotals, getMonthlyTrends, getWeeklyTrends, getRecentActivity, getTopCategories };
