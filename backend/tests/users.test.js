'use strict';

const { setupTestDb, createUser, app, request } = require('./helpers');

let admin, analyst, viewer;
let createdUserId;

beforeAll(async () => {
  await setupTestDb();
  admin   = await createUser({ role: 'ADMIN',   email: 'um-admin@test.com' });
  analyst = await createUser({ role: 'ANALYST', email: 'um-analyst@test.com' });
  viewer  = await createUser({ role: 'VIEWER',  email: 'um-viewer@test.com' });
});

// ─────────────────────────────────────────────────────────────
// GET /users
// ─────────────────────────────────────────────────────────────
describe('GET /users', () => {
  it('ADMIN can list users', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  it('ANALYST cannot list users — 403', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(res.status).toBe(403);
  });

  it('VIEWER cannot list users — 403', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(403);
  });

  it('supports filtering by role', async () => {
    const res = await request(app)
      .get('/users?role=VIEWER')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(u => expect(u.role).toBe('VIEWER'));
  });

  it('supports search by name/email', async () => {
    const res = await request(app)
      .get('/users?search=um-admin')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some(u => u.email === 'um-admin@test.com')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /users
// ─────────────────────────────────────────────────────────────
describe('POST /users', () => {
  const newUser = {
    name: 'New Employee',
    email: 'newemployee@test.com',
    password: 'NewPass@1',
    role: 'ANALYST',
  };

  it('ADMIN can create a user', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('newemployee@test.com');
    expect(res.body.data.role).toBe('ANALYST');
    expect(res.body.data).not.toHaveProperty('password');
    createdUserId = res.body.data.id;
  });

  it('rejects duplicate email — 409', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(newUser);
    expect(res.status).toBe(409);
  });

  it('ANALYST cannot create users — 403', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ name: 'X', email: 'x@test.com', password: 'Pass@1234' });
    expect(res.status).toBe(403);
  });

  it('validates required fields — 422', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Missing email' });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /users/:id
// ─────────────────────────────────────────────────────────────
describe('GET /users/:id', () => {
  it('ADMIN can fetch a user by ID', async () => {
    const res = await request(app)
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdUserId);
  });

  it('returns 404 for unknown ID', async () => {
    const res = await request(app)
      .get('/users/does-not-exist')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /users/:id
// ─────────────────────────────────────────────────────────────
describe('PATCH /users/:id', () => {
  it('ADMIN can update name', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('rejects duplicate email on update — 409', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ email: 'um-viewer@test.com' }); // already taken
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /users/:id/role
// ─────────────────────────────────────────────────────────────
describe('PATCH /users/:id/role', () => {
  it('ADMIN can change a user role', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'VIEWER' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('VIEWER');
  });

  it('rejects invalid role value — 422', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'SUPERADMIN' });
    expect(res.status).toBe(422);
  });

  it('admin cannot change their own role — 400', async () => {
    const res = await request(app)
      .patch(`/users/${admin.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'VIEWER' });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /users/:id/status
// ─────────────────────────────────────────────────────────────
describe('PATCH /users/:id/status', () => {
  it('ADMIN can deactivate a user', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });

  it('deactivated user cannot login — 403', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'newemployee@test.com',
      password: 'NewPass@1',
    });
    expect(res.status).toBe(403);
  });

  it('ADMIN can reactivate a user', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('admin cannot change their own status — 400', async () => {
    const res = await request(app)
      .patch(`/users/${admin.id}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid status value — 422', async () => {
    const res = await request(app)
      .patch(`/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'suspended' });
    expect(res.status).toBe(422);
  });
});
