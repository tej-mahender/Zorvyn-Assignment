'use strict';

const { setupTestDb, createUser, createRecord, app, request } = require('./helpers');

let admin, analyst, viewer;

beforeAll(async () => {
  await setupTestDb();
  admin   = await createUser({ role: 'ADMIN',   email: 'dash-admin@test.com' });
  analyst = await createUser({ role: 'ANALYST', email: 'dash-analyst@test.com' });
  viewer  = await createUser({ role: 'VIEWER',  email: 'dash-viewer@test.com' });

  // Seed known records for deterministic assertions
  createRecord({ type: 'income',  category: 'Salary',     amount: 5000, date: '2024-01-10', createdById: admin.id });
  createRecord({ type: 'income',  category: 'Freelance',  amount: 1500, date: '2024-02-15', createdById: admin.id });
  createRecord({ type: 'income',  category: 'Investment', amount:  800, date: '2024-03-05', createdById: admin.id });
  createRecord({ type: 'expense', category: 'Rent',       amount: 1200, date: '2024-01-05', createdById: admin.id });
  createRecord({ type: 'expense', category: 'Groceries',  amount:  400, date: '2024-01-20', createdById: admin.id });
  createRecord({ type: 'expense', category: 'Transport',  amount:  150, date: '2024-02-10', createdById: admin.id });
  createRecord({ type: 'expense', category: 'Rent',       amount: 1200, date: '2024-02-05', createdById: admin.id });
  createRecord({ type: 'expense', category: 'Healthcare', amount:  300, date: '2024-03-18', createdById: admin.id });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/summary
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/summary', () => {
  it('all roles can access summary', async () => {
    for (const user of [admin, analyst, viewer]) {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.status).toBe(200);
    }
  });

  it('returns correct financial totals', async () => {
    const res = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty('total_income');
    expect(d).toHaveProperty('total_expenses');
    expect(d).toHaveProperty('net_balance');
    expect(d).toHaveProperty('savings_rate');
    expect(d).toHaveProperty('record_count');

    // net = income - expenses
    expect(d.net_balance).toBeCloseTo(d.total_income - d.total_expenses, 1);
  });

  it('respects dateFrom/dateTo filters', async () => {
    const res = await request(app)
      .get('/dashboard/summary?dateFrom=2024-01-01&dateTo=2024-01-31')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    // Only Jan records: income=5000, expenses=1200+400=1600
    expect(res.body.data.total_income).toBeCloseTo(5000, 0);
    expect(res.body.data.total_expenses).toBeCloseTo(1600, 0);
  });

  it('rejects unauthenticated — 401', async () => {
    const res = await request(app).get('/dashboard/summary');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/category-totals
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/category-totals', () => {
  it('returns categories with totals and percentages', async () => {
    const res = await request(app)
      .get('/dashboard/category-totals')
      .set('Authorization', `Bearer ${analyst.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const first = res.body.data[0];
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('total');
    expect(first).toHaveProperty('percentage');
    expect(first).toHaveProperty('count');
  });

  it('filters by type=expense', async () => {
    const res = await request(app)
      .get('/dashboard/category-totals?type=expense')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('expense'));
  });

  it('filters by type=income', async () => {
    const res = await request(app)
      .get('/dashboard/category-totals?type=income')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('income'));
  });

  it('percentages sum to ~100', async () => {
    const res = await request(app)
      .get('/dashboard/category-totals?type=expense')
      .set('Authorization', `Bearer ${admin.token}`);
    const total = res.body.data.reduce((sum, r) => sum + r.percentage, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/trends/monthly
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/trends/monthly', () => {
  it('returns monthly trend array', async () => {
    const res = await request(app)
      .get('/dashboard/trends/monthly?months=6')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const m = res.body.data[0];
      expect(m).toHaveProperty('month');
      expect(m).toHaveProperty('income');
      expect(m).toHaveProperty('expenses');
      expect(m).toHaveProperty('net');
    }
  });

  it('net = income - expenses per month', async () => {
    const res = await request(app)
      .get('/dashboard/trends/monthly?months=12')
      .set('Authorization', `Bearer ${admin.token}`);
    res.body.data.forEach(m => {
      expect(m.net).toBeCloseTo(m.income - m.expenses, 1);
    });
  });

  it('rejects months > 24 — 422', async () => {
    const res = await request(app)
      .get('/dashboard/trends/monthly?months=99')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/trends/weekly
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/trends/weekly', () => {
  it('returns weekly trend array', async () => {
    const res = await request(app)
      .get('/dashboard/trends/weekly?weeks=4')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/recent-activity
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/recent-activity', () => {
  it('returns recent records', async () => {
    const res = await request(app)
      .get('/dashboard/recent-activity?limit=5')
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('each record has expected fields', async () => {
    const res = await request(app)
      .get('/dashboard/recent-activity')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const r = res.body.data[0];
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('amount');
      expect(r).toHaveProperty('type');
      expect(r).toHaveProperty('category');
      expect(r).toHaveProperty('date');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/top-categories
// ─────────────────────────────────────────────────────────────
describe('GET /dashboard/top-categories', () => {
  it('returns top expense categories', async () => {
    const res = await request(app)
      .get('/dashboard/top-categories?limit=3')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
    if (res.body.data.length > 1) {
      // Should be sorted descending by total
      expect(res.body.data[0].total).toBeGreaterThanOrEqual(res.body.data[1].total);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /audit  (Admin only)
// ─────────────────────────────────────────────────────────────
describe('GET /audit', () => {
  it('ADMIN can access audit logs', async () => {
    const res = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('audit log entries have expected shape', async () => {
    const res = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const entry = res.body.data[0];
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('created_at');
      expect(entry).toHaveProperty('user');
    }
  });

  it('ANALYST cannot access audit logs — 403', async () => {
    const res = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(res.status).toBe(403);
  });

  it('VIEWER cannot access audit logs — 403', async () => {
    const res = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(403);
  });

  it('filters audit logs by action', async () => {
    const res = await request(app)
      .get('/audit?action=LOGIN')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(e => expect(e.action).toContain('LOGIN'));
  });

  it('supports pagination', async () => {
    const res = await request(app)
      .get('/audit?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.limit).toBe(2);
  });
});
