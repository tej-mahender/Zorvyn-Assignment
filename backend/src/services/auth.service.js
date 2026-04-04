'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, run } = require('../db/database');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

async function register({ name, email, password, role = 'VIEWER' }) {
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

  const user = queryOne('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?', [id]);
  const token = generateToken(user);
  return { user, token };
}

async function login({ email, password }) {
  const user = queryOne(
    'SELECT id, name, email, password, role, status, created_at FROM users WHERE email = ?',
    [email]
  );

  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  if (user.status === 'inactive') {
    const err = new Error('Account is inactive. Contact an administrator.');
    err.status = 403;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const { password: _pwd, ...safeUser } = user;
  const token = generateToken(safeUser);
  return { user: safeUser, token };
}

module.exports = { register, login };
