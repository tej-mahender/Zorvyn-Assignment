'use strict';

/**
 * Shared test setup utilities.
 * Uses an isolated in-memory SQLite instance per test suite — no disk I/O.
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── Point database to :memory: before anything loads ─────────────────────────
process.env.NODE_ENV  = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Patch the database module to use in-memory storage for tests
const db = require('../src/db/database');
const app = require('../src/app');

/**
 * Call this in beforeAll() to initialise a clean in-memory DB.
 */
async function setupTestDb() {
  await db.initDb({ memory: true });
}

/**
 * Seed a user directly into the DB and return their record + a JWT token.
 */
async function createUser({ name = 'Test User', email, password = 'Test@1234', role = 'VIEWER' } = {}) {
  email = email || `${role.toLowerCase()}-${uuidv4().slice(0,6)}@test.com`;
  const hash = await bcrypt.hash(password, 1); // low cost for speed
  const id = uuidv4();

  db.run(
    `INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, 'active')`,
    [id, name, email, hash, role]
  );

  // Login to get a real token
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });

  return {
    id,
    name,
    email,
    role,
    password,
    token: res.body.data.token,
  };
}

/**
 * Seed a financial record and return it.
 */
function createRecord({ amount = 1000, type = 'income', category = 'Salary', date = '2024-06-15', notes = null, createdById }) {
  const id = uuidv4();
  db.run(
    `INSERT INTO financial_records (id, amount, type, category, date, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, amount, type, category, date, notes, createdById]
  );
  return { id, amount, type, category, date, notes };
}

module.exports = { setupTestDb, createUser, createRecord, app, request };
