'use strict';

const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../db/database');

/**
 * Get all non-deleted records with filtering, search, and pagination.
 */
function getAll({ page = 1, limit = 20, type, category, dateFrom, dateTo, search, sortBy = 'date', sortOrder = 'DESC' }) {
  const conditions = ['r.deleted_at IS NULL'];
  const params = [];

  if (type)     { conditions.push('r.type = ?');         params.push(type); }
  if (category) { conditions.push('r.category LIKE ?');  params.push(`%${category}%`); }
  if (dateFrom) { conditions.push('r.date >= ?');        params.push(dateFrom); }
  if (dateTo)   { conditions.push('r.date <= ?');        params.push(dateTo); }
  if (search)   {
    conditions.push('(r.notes LIKE ? OR r.category LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  // Whitelist sort columns to prevent SQL injection
  const allowedSort = { date: 'r.date', amount: 'r.amount', created_at: 'r.created_at', category: 'r.category' };
  const orderCol = allowedSort[sortBy] || 'r.date';
  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countRow = queryOne(
    `SELECT COUNT(*) as total FROM financial_records r ${where}`, params
  );
  const total = countRow.total;

  const offset = (page - 1) * limit;
  const rows = query(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes,
            r.created_at, r.updated_at,
            u.id as user_id, u.name as user_name
     FROM financial_records r
     LEFT JOIN users u ON r.created_by_id = u.id
     ${where}
     ORDER BY ${orderCol} ${orderDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const records = rows.map(formatRecord);
  return { records, total };
}

function getById(id) {
  const row = queryOne(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes,
            r.created_at, r.updated_at, r.deleted_at,
            u.id as user_id, u.name as user_name
     FROM financial_records r
     LEFT JOIN users u ON r.created_by_id = u.id
     WHERE r.id = ? AND r.deleted_at IS NULL`,
    [id]
  );
  if (!row) return null;
  return formatRecord(row);
}

function create({ amount, type, category, date, notes }, createdById) {
  const id = uuidv4();
  run(
    `INSERT INTO financial_records (id, amount, type, category, date, notes, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, amount, type, category, date, notes || null, createdById]
  );
  return getById(id);
}

function update(id, { amount, type, category, date, notes }) {
  const existing = getById(id);
  if (!existing) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }

  const newAmount   = amount   ?? existing.amount;
  const newType     = type     ?? existing.type;
  const newCategory = category ?? existing.category;
  const newDate     = date     ?? existing.date;
  const newNotes    = notes    !== undefined ? notes : existing.notes;

  run(
    `UPDATE financial_records
     SET amount = ?, type = ?, category = ?, date = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND deleted_at IS NULL`,
    [newAmount, newType, newCategory, newDate, newNotes, id]
  );
  return getById(id);
}

function softDelete(id) {
  const existing = getById(id);
  if (!existing) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }
  run(
    `UPDATE financial_records SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    [id]
  );
  return true;
}

function getCategories() {
  return query(
    `SELECT DISTINCT category FROM financial_records WHERE deleted_at IS NULL ORDER BY category`
  ).map(r => r.category);
}

function formatRecord(row) {
  return {
    id:       row.id,
    amount:   row.amount,
    type:     row.type,
    category: row.category,
    date:     row.date,
    notes:    row.notes,
    created_by: row.user_id ? { id: row.user_id, name: row.user_name } : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = { getAll, getById, create, update, softDelete, getCategories };
