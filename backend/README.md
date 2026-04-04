# Finance Dashboard Backend

A production-ready REST API backend for a role-based finance dashboard system. Built with **Node.js**, **Express**, and **SQLite** (via sql.js).

---

## Stack

| Layer        | Choice                          | Reason                                              |
|--------------|---------------------------------|-----------------------------------------------------|
| Runtime      | Node.js 18+                     | Fast, async-first, widely supported                 |
| Framework    | Express.js                      | Minimal, composable, industry standard              |
| Database     | SQLite (via sql.js)             | Zero-setup, file-based, fully SQL-compliant         |
| Auth         | JWT (jsonwebtoken)              | Stateless, scalable, no session store needed        |
| Validation   | express-validator               | Declarative schema-level validation                 |
| API Docs     | Swagger UI (swagger-jsdoc)      | Auto-generated from JSDoc annotations               |
| Security     | bcryptjs + helmet + cors        | Password hashing, HTTP headers, CORS policy         |

> **Database note:** sql.js is a pure-JavaScript SQLite port (WebAssembly). No native build tools required. The database is persisted to `finance.db` on disk after every write. To swap to PostgreSQL or MySQL, replace `src/db/database.js` with a pg/mysql2 pool — all service layer code stays unchanged.

---

## Project Structure

```
finance-backend/
├── src/
│   ├── config/
│   │   ├── roles.js          # Role constants + permission matrix
│   │   └── swagger.js        # OpenAPI/Swagger spec configuration
│   ├── db/
│   │   ├── database.js       # SQL connection, table creation, query helpers
│   │   └── seed.js           # Demo data seeder
│   ├── middleware/
│   │   ├── authenticate.js   # JWT verification → attaches req.user
│   │   ├── authorize.js      # Permission-based RBAC guard (authorize('records:create'))
│   │   ├── validate.js       # express-validator error formatter
│   │   └── errorHandler.js   # Global error handler
│   ├── routes/
│   │   ├── auth.routes.js     # POST /auth/login, /auth/register, GET /auth/me
│   │   ├── user.routes.js     # CRUD /users (Admin only)
│   │   ├── record.routes.js   # CRUD /records (Analyst+, read for Viewer)
│   │   ├── dashboard.routes.js# GET /dashboard/* (all roles)
│   │   └── audit.routes.js    # GET /audit (Admin only)
│   ├── services/
│   │   ├── auth.service.js    # Login, register, token generation
│   │   ├── user.service.js    # User CRUD, role/status management
│   │   ├── record.service.js  # Financial record CRUD with filtering/pagination
│   │   └── dashboard.service.js # Aggregation queries for analytics
│   ├── utils/
│   │   ├── response.js        # sendSuccess(), sendError(), buildPaginationMeta()
│   │   └── audit.js           # auditLog() helper + action constants
│   ├── app.js                 # Express app setup, route mounting
│   └── index.js               # Server entry point
├── .env                       # Environment variables
├── finance.db                 # SQLite database (created on first run)
└── README.md
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The `.env` file is pre-configured for local development:

```env
PORT=3000
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
NODE_ENV=development
```

### 3. Seed demo data

```bash
npm run seed
```

Creates 3 demo users and 71 financial records spanning 90 days.

### 4. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Open API docs

Visit **http://localhost:3000/api-docs** for interactive Swagger UI.

---

## Demo Credentials

| Email                  | Password     | Role    | Permissions                          |
|------------------------|--------------|---------|--------------------------------------|
| admin@finance.dev      | Admin@123    | ADMIN   | Full access including user management |
| analyst@finance.dev    | Analyst@123  | ANALYST | Full CRUD on records + dashboard      |
| viewer@finance.dev     | Viewer@123   | VIEWER  | Read-only access to records + dashboard |

---

## API Reference

### Authentication

| Method | Endpoint          | Auth | Description                  |
|--------|-------------------|------|------------------------------|
| POST   | `/auth/register`  | ❌   | Register a new user          |
| POST   | `/auth/login`     | ❌   | Login, returns JWT token     |
| GET    | `/auth/me`        | ✅   | Get current user profile     |

**Login response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "Admin User", "email": "admin@finance.dev", "role": "ADMIN" },
    "token": "eyJhbGci..."
  }
}
```

Use the token in all subsequent requests:
```
Authorization: Bearer <token>
```

---

### Financial Records

| Method | Endpoint             | VIEWER | ANALYST | ADMIN | Description                          |
|--------|----------------------|:------:|:-------:|:-----:|--------------------------------------|
| GET    | `/records`           | ✅     | ✅      | ✅    | List records (paginated + filtered)  |
| GET    | `/records/categories`| ✅     | ✅      | ✅    | All distinct categories in use       |
| GET    | `/records/:id`       | ✅     | ✅      | ✅    | Get a single record                  |
| POST   | `/records`           | ❌     | ✅      | ✅    | Create a record                      |
| PATCH  | `/records/:id`       | ❌     | ✅      | ✅    | Update a record (partial)            |
| DELETE | `/records/:id`       | ❌     | ✅      | ✅    | Soft delete a record                 |

**Query parameters for `GET /records`:**

| Parameter  | Type   | Example        | Description                              |
|------------|--------|----------------|------------------------------------------|
| `page`     | int    | `1`            | Page number (default: 1)                 |
| `limit`    | int    | `20`           | Items per page (max: 100)                |
| `type`     | string | `income`       | Filter by `income` or `expense`          |
| `category` | string | `Salary`       | Partial match on category                |
| `dateFrom` | date   | `2024-01-01`   | Records on or after this date            |
| `dateTo`   | date   | `2024-12-31`   | Records on or before this date           |
| `search`   | string | `rent`         | Search in notes and category             |
| `sortBy`   | string | `amount`       | `date`, `amount`, `created_at`, `category`|
| `sortOrder`| string | `ASC`          | `ASC` or `DESC`                          |

**Create record body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "Salary",
  "date": "2024-01-15",
  "notes": "Monthly salary"
}
```

---

### Dashboard Analytics

All endpoints accessible to all authenticated roles.

| Method | Endpoint                       | Description                                   |
|--------|--------------------------------|-----------------------------------------------|
| GET    | `/dashboard/summary`           | Total income, expenses, net balance, savings rate |
| GET    | `/dashboard/category-totals`   | Totals grouped by category + percentage share |
| GET    | `/dashboard/trends/monthly`    | Monthly income vs expenses (last N months)    |
| GET    | `/dashboard/trends/weekly`     | Weekly income vs expenses (last N weeks)      |
| GET    | `/dashboard/recent-activity`   | Latest N financial records                    |
| GET    | `/dashboard/top-categories`    | Top expense categories by total amount        |

**Example — `/dashboard/summary`:**
```json
{
  "total_income": 33539.92,
  "total_expenses": 20558.95,
  "net_balance": 12980.97,
  "savings_rate": 38.7,
  "record_count": 71,
  "income_count": 11,
  "expense_count": 60
}
```

Dashboard endpoints support optional `dateFrom` / `dateTo` query parameters for time-range filtering.

---

### User Management (Admin only)

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/users`              | List users (filterable, paginated) |
| GET    | `/users/:id`          | Get user by ID                     |
| POST   | `/users`              | Create a user                      |
| PATCH  | `/users/:id`          | Update name/email                  |
| PATCH  | `/users/:id/role`     | Change role                        |
| PATCH  | `/users/:id/status`   | Activate or deactivate             |

---

### Audit Logs (Admin only)

| Method | Endpoint  | Description                             |
|--------|-----------|-----------------------------------------|
| GET    | `/audit`  | Paginated audit log with filters        |

**Query parameters:** `userId`, `action`, `entity`, `dateFrom`, `dateTo`, `page`, `limit`

Every sensitive action (login, register, create/update/delete record, role/status changes) is automatically logged with the user, action type, affected entity, IP address, and metadata.

---

## Role & Permission System

Permissions are defined in `src/config/roles.js` as a declarative matrix:

```js
const PERMISSIONS = {
  'records:read':   ['VIEWER', 'ANALYST', 'ADMIN'],
  'records:create': ['ANALYST', 'ADMIN'],
  'records:update': ['ANALYST', 'ADMIN'],
  'records:delete': ['ANALYST', 'ADMIN'],
  'dashboard:read': ['VIEWER', 'ANALYST', 'ADMIN'],
  'audit:read':     ['ADMIN'],
  'users:read':     ['ADMIN'],
  'users:create':   ['ADMIN'],
  'users:update':   ['ADMIN'],
};
```

Applied per-route using the `authorize()` middleware:

```js
router.post('/', authenticate, authorize('records:create'), handler);
```

---

## Error Handling

All errors follow a consistent shape:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "amount", "message": "Amount must be a positive number", "value": -50 },
    { "field": "type",   "message": "Type must be income or expense",   "value": "bad" }
  ]
}
```

| Status | Meaning                              |
|--------|--------------------------------------|
| 200    | OK                                   |
| 201    | Created                              |
| 400    | Bad request / business rule violation|
| 401    | Missing or invalid JWT               |
| 403    | Authenticated but insufficient role  |
| 404    | Resource not found                   |
| 409    | Conflict (duplicate email, etc.)     |
| 422    | Validation error (field-level)       |
| 500    | Internal server error                |

---

## Design Decisions & Assumptions

1. **Soft delete on records.** Records are never physically removed — `deleted_at` is set instead. This preserves audit history and allows potential recovery. The audit log also records who deleted what.

2. **Analyst has full record CRUD.** Based on the clarification provided: Analysts can create, update, and delete financial records, but cannot manage users or view audit logs.

3. **Registration is open by default.** `/auth/register` defaults new users to the `VIEWER` role. An Admin can assign elevated roles at creation via `POST /users` or change roles post-creation via `PATCH /users/:id/role`.

4. **Admins cannot change their own role or status.** Guards are in place to prevent self-lockout.

5. **Audit logging is fire-and-forget.** Failures in audit logging are caught and logged to console but never propagate to the API response — the main operation always completes.

6. **SQLite for zero-setup evaluation.** The database choice is intentionally lightweight. The service layer uses raw SQL via simple helper functions (`query`, `queryOne`, `run`), making it straightforward to swap the underlying driver for PostgreSQL (pg) or MySQL (mysql2) without touching any route or service logic.

7. **Password policy enforced at registration.** Minimum 8 characters, at least one uppercase letter, at least one number.

8. **Pagination capped at 100 per page.** Prevents accidental large data dumps.

---

## Health Check

```
GET /health
```
```json
{
  "status": "ok",
  "service": "finance-backend",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```
