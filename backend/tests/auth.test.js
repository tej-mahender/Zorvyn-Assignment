'use strict';

const { setupTestDb, createUser, app, request } = require('./helpers');

beforeAll(async () => {
  await setupTestDb();
});

// ─────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  const validPayload = {
    name: 'Alice Smith',
    email: 'alice@test.com',
    password: 'Secure@123',
  };

  it('registers a new user and returns token + user', async () => {
    const res = await request(app).post('/auth/register').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('alice@test.com');
    expect(res.body.data.user.role).toBe('VIEWER');       // default role
    expect(res.body.data.user).not.toHaveProperty('password'); // never exposed
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app).post('/auth/register').send(validPayload);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing name with 422', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'no-name@test.com',
      password: 'Secure@123',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('rejects weak password with 422', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Bob',
      email: 'bob@test.com',
      password: 'weak',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
  });

  it('rejects invalid email with 422', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Bob',
      email: 'not-an-email',
      password: 'Secure@123',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
  });

  it('rejects invalid role with 422', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Charlie',
      email: 'charlie@test.com',
      password: 'Secure@123',
      role: 'SUPERUSER',
    });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  beforeAll(async () => {
    await createUser({ email: 'login-test@test.com', password: 'Login@123', role: 'VIEWER' });
  });

  it('logs in with correct credentials and returns JWT', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'login-test@test.com',
      password: 'Login@123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe('login-test@test.com');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'login-test@test.com',
      password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-existent email with 401', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@test.com',
      password: 'Login@123',
    });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields with 422', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'login-test@test.com' });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────────────────────
describe('GET /auth/me', () => {
  let token;

  beforeAll(async () => {
    const user = await createUser({ email: 'me-test@test.com', role: 'ANALYST' });
    token = user.token;
  });

  it('returns current user profile', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me-test@test.com');
    expect(res.body.data.user.role).toBe('ANALYST');
  });

  it('rejects request with no token with 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects malformed token with 401', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});
