const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../finance.db');

let db = null;
let inMemoryMode = false;

/**
 * Initialize the SQLite database.
 * Pass { memory: true } for isolated in-memory DB (used in tests).
 */
async function initDb({ memory = false } = {}) {
  inMemoryMode = memory;
  const SQL = await initSqlJs();

  if (memory) {
    // Completely fresh in-memory DB — no file I/O
    db = new SQL.Database();
  } else if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL for better concurrency
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');

  createTables();
  if (!memory) persist(); // only persist to disk in non-test mode
  if (!memory) console.log('✅ Database initialized');
  return db;
}

/**
 * Persist in-memory db to file after every write.
 * No-op in test (memory) mode.
 */
function persist() {
  if (inMemoryMode) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Create all tables if they don't exist.
 */
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'VIEWER'   CHECK(role IN ('VIEWER','ANALYST','ADMIN')),
      status      TEXT NOT NULL DEFAULT 'active'   CHECK(status IN ('active','inactive')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id            TEXT PRIMARY KEY,
      amount        REAL NOT NULL CHECK(amount > 0),
      type          TEXT NOT NULL                   CHECK(type IN ('income','expense')),
      category      TEXT NOT NULL,
      date          TEXT NOT NULL,
      notes         TEXT,
      created_by_id TEXT NOT NULL REFERENCES users(id),
      deleted_at    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      action     TEXT NOT NULL,
      entity     TEXT,
      entity_id  TEXT,
      metadata   TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Indexes for common queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_type     ON financial_records(type);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_category ON financial_records(category);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_date     ON financial_records(date);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_records_deleted  ON financial_records(deleted_at);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs(user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at);`);
}

/**
 * Execute a query and return all rows as objects.
 */
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Execute a single-row query.
 */
function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

/**
 * Execute a write statement (INSERT/UPDATE/DELETE).
 * Automatically persists DB to disk.
 */
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

/**
 * Execute multiple statements in a transaction.
 */
function transaction(fn) {
  db.run('BEGIN TRANSACTION;');
  try {
    fn();
    db.run('COMMIT;');
    persist();
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

module.exports = { initDb, query, queryOne, run, transaction };
