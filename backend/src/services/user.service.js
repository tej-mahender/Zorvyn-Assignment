'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../db/database');
const { ROLES } = require('../config/roles');

function safeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

function getAll({ page = 1, limit = 20, role, status, search }) {
  let conditions = [];
  let params = [];

  if (role)   { conditions.push('role = ?');   params.push(role); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = queryOne(`SELECT COUNT(*) as total FROM users ${where}`, params);
  const total = countRow.total;

  const offset = (page - 1) * limit;
  const rows = query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows, total };
}

function getById(id) {
  return queryOne(
    'SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
}

async function create({ name, email, password, role = ROLES.VIEWER }) {
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  run(
    `INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, 'active')`,
    [id, name, email, hash, role]
  );
  return getById(id);
}

function update(id, { name, email }) {
  const user = getById(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Check email uniqueness if changing
  if (email && email !== user.email) {
    const dup = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (dup) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }
  }

  const newName  = name  ?? user.name;
  const newEmail = email ?? user.email;
  run(
    `UPDATE users SET name = ?, email = ?, updated_at = datetime('now') WHERE id = ?`,
    [newName, newEmail, id]
  );
  return getById(id);
}

function changeRole(id, role, requestingUserId) {
  if (id === requestingUserId) {
    const err = new Error('You cannot change your own role');
    err.status = 400;
    throw err;
  }
  const user = getById(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  run(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [role, id]);
  return getById(id);
}

function changeStatus(id, status, requestingUserId) {
  if (id === requestingUserId) {
    const err = new Error('You cannot change your own status');
    err.status = 400;
    throw err;
  }
  const user = getById(id);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  run(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
  return getById(id);
}

module.exports = { getAll, getById, create, update, changeRole, changeStatus };
