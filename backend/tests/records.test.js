'use strict';

const { setupTestDb, createUser, createRecord, app, request } = require('./helpers');

let admin, analyst, viewer;
let recordId;

beforeAll(async () => {
  await setupTestDb();
  admin   = await createUser({ role: 'ADMIN',   email: 'records-admin@test.com' });
  analyst = await createUser({ role: 'ANALYST', email: 'records-analyst@test.com' });
  viewer  = await createUser({ role: 'VIEWER',  email: 'records-viewer@test.com' });
});

// ─────────────────────────────────────────────────────────────
// POST /records  — create
// ─────────────────────────────────────────────────────────────
describe('POST /records', () => {
  const payload = {
    amount: 2500,
    type: 'income',
    category: 'Salary',
    date: '2024-03-01',
    notes: 'March salary',
  };

  it('ADMIN can create a record', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(2500);
    expect(res.body.data.type).toBe('income');
    expect(res.body.data.category).toBe('Salary');
    recordId = res.body.data.id;
  });

  it('ANALYST can create a record', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ ...payload, category: 'Freelance', amount: 800 });

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe('Freelance');
  });

  it('VIEWER cannot create a record — 403', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects negative amount — 422', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...payload, amount: -100 });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'amount')).toBe(true);
  });

  it('rejects invalid type — 422', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...payload, type: 'transfer' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid date format — 422', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...payload, date: '15/03/2024' });
    expect(res.status).toBe(422);
  });

  it('rejects missing category — 422', async () => {
    const res = await request(app)
      .post('/records')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 100, type: 'income', date: '2024-01-01' });
    expect(res.status).toBe(422);
  });

  it('rejects unauthenticated request — 401', async () => {
    const res = await request(app).post('/records').send(payload);
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /records  — list with filters
// ─────────────────────────────────────────────────────────────
describe('GET /records', () => {
  beforeAll(async () => {
    // Seed a few records for filter tests
    createRecord({ type: 'expense', category: 'Rent',      amount: 1200, date: '2024-01-10', createdById: admin.id });
    createRecord({ type: 'expense', category: 'Groceries', amount:  300, date: '2024-02-05', createdById: admin.id });
    createRecord({ type: 'income',  category: 'Investment', amount: 500, date: '2024-03-20', createdById: admin.id });
  });

  it('VIEWER can list records', async () => {
    const res = await request(app)
      .get('/records')
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('returns pagination meta', async () => {
    const res = await request(app)
      .get('/records?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.meta).toHaveProperty('hasNext');
  });

  it('filters by type=expense', async () => {
    const res = await request(app)
      .get('/records?type=expense')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('expense'));
  });

  it('filters by type=income', async () => {
    const res = await request(app)
      .get('/records?type=income')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('income'));
  });

  it('filters by category partial match', async () => {
    const res = await request(app)
      .get('/records?category=Rent')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.category.toLowerCase()).toContain('rent'));
  });

  it('filters by dateFrom / dateTo', async () => {
    const res = await request(app)
      .get('/records?dateFrom=2024-01-01&dateTo=2024-01-31')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(r => {
      expect(r.date >= '2024-01-01').toBe(true);
      expect(r.date <= '2024-01-31').toBe(true);
    });
  });

  it('searches by notes/category keyword', async () => {
    createRecord({ type: 'expense', category: 'Entertainment', notes: 'Netflix subscription', amount: 15, date: '2024-04-01', createdById: admin.id });

    const res = await request(app)
      .get('/records?search=Netflix')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('sorts by amount ASC', async () => {
    const res = await request(app)
      .get('/records?sortBy=amount&sortOrder=ASC')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    const amounts = res.body.data.map(r => r.amount);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i - 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /records/:id
// ─────────────────────────────────────────────────────────────
describe('GET /records/:id', () => {
  it('returns a specific record by ID', async () => {
    const res = await request(app)
      .get(`/records/${recordId}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(recordId);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/records/non-existent-id-xyz')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /records/:id  — update
// ─────────────────────────────────────────────────────────────
describe('PATCH /records/:id', () => {
  it('ADMIN can update a record', async () => {
    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 3000, notes: 'Updated salary' });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(3000);
    expect(res.body.data.notes).toBe('Updated salary');
  });

  it('ANALYST can update a record', async () => {
    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ category: 'Bonus' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('Bonus');
  });

  it('VIEWER cannot update a record — 403', async () => {
    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ amount: 9999 });
    expect(res.status).toBe(403);
  });

  it('rejects invalid amount on update — 422', async () => {
    const res = await request(app)
      .patch(`/records/${recordId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 0 });
    expect(res.status).toBe(422);
  });

  it('returns 404 for unknown record', async () => {
    const res = await request(app)
      .patch('/records/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 100 });
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /records/:id  — soft delete
// ─────────────────────────────────────────────────────────────
describe('DELETE /records/:id', () => {
  let deleteTargetId;

  beforeAll(async () => {
    const r = createRecord({ type: 'expense', category: 'ToDelete', amount: 50, date: '2024-05-01', createdById: admin.id });
    deleteTargetId = r.id;
  });

  it('VIEWER cannot delete — 403', async () => {
    const res = await request(app)
      .delete(`/records/${deleteTargetId}`)
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(403);
  });

  it('ANALYST can delete a record', async () => {
    const res = await request(app)
      .delete(`/records/${deleteTargetId}`)
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('deleted record no longer appears in list or GET', async () => {
    const res = await request(app)
      .get(`/records/${deleteTargetId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 on deleting already-deleted record', async () => {
    const res = await request(app)
      .delete(`/records/${deleteTargetId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /records/categories
// ─────────────────────────────────────────────────────────────
describe('GET /records/categories', () => {
  it('returns a list of distinct categories', async () => {
    const res = await request(app)
      .get('/records/categories')
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
