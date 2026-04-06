# Finance Dashboard — React Frontend

A production-grade React frontend for the Finance Dashboard Backend API.

## Stack

| Layer       | Choice                    |
|-------------|---------------------------|
| Framework   | React 18 + React Router 6 |
| Build tool  | Vite 5                    |
| Charts      | Recharts                  |
| Icons       | Lucide React              |
| Fonts       | Syne · DM Mono · Instrument Serif |

## Quick Start

### 1. Start the backend first

The frontend proxies all API calls to `http://localhost:3000`.

```bash
cd ../finance-backend
npm install
npm run seed
npm start
```

### 2. Install and run the frontend

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

## Pages & Features

### Login (`/login`)
- Email + password login via `POST /auth/login`
- One-click demo credential fill buttons (Admin / Analyst / Viewer)
- JWT stored in localStorage, auto-restored on refresh

### Dashboard (`/dashboard`)
- Summary cards: total income, expenses, net balance, savings rate — `GET /dashboard/summary`
- Monthly income vs expense area chart — `GET /dashboard/trends/monthly`
- Expense breakdown pie chart — `GET /dashboard/category-totals`
- Weekly activity bar chart — `GET /dashboard/trends/weekly`
- Top spending categories with progress bars — `GET /dashboard/top-categories`
- Recent activity table — `GET /dashboard/recent-activity`
- Date range filter applies to all widgets simultaneously

### Records (`/records`)
- Paginated table — `GET /records`
- Filters: type, category, date range, full-text search
- Sortable columns: date, amount, category
- Create record modal — `POST /records` (Analyst, Admin)
- Edit record modal — `PATCH /records/:id` (Analyst, Admin)
- Delete with confirm — `DELETE /records/:id` (Analyst, Admin)
- Category autocomplete from `GET /records/categories`
- Viewers see all records but cannot create/edit/delete

### Users (`/users`) — Admin only
- User cards with role and status badges
- Search, filter by role/status — `GET /users`
- Create user modal — `POST /users`
- Edit name/email modal — `PATCH /users/:id`
- Change role modal — `PATCH /users/:id/role`
- Activate/deactivate toggle — `PATCH /users/:id/status`
- Self-protection: cannot change own role or status

### Audit Log (`/audit`) — Admin only
- Timeline of all system events — `GET /audit`
- Filter by action type, entity, date range
- Click to expand metadata (e.g. new role value)
- Relative + absolute timestamps
- Colour-coded action badges

## Role-Based UI

The UI adapts to the logged-in user's role:

| Feature          | VIEWER | ANALYST | ADMIN |
|------------------|:------:|:-------:|:-----:|
| Dashboard        | ✓      | ✓       | ✓     |
| View Records     | ✓      | ✓       | ✓     |
| Create/Edit/Delete Records | — | ✓   | ✓     |
| Users page       | —      | —       | ✓     |
| Audit Log        | —      | —       | ✓     |

Nav items not accessible to the current role are hidden automatically.

## Project Structure

```
src/
├── api/
│   └── client.js         # All API calls (auth, records, dashboard, users, audit)
├── context/
│   └── AuthContext.jsx   # Global auth state + can() permission helper
├── components/
│   └── Layout.jsx        # Sidebar nav + outlet
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── RecordsPage.jsx
│   ├── UsersPage.jsx
│   └── AuditPage.jsx
├── App.jsx               # Router + Protected route wrapper
├── main.jsx
└── index.css             # Design system (CSS variables, shared components)
```
