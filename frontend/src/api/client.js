const BASE = '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
};

// ── Records ──────────────────────────────────────────────────────────────────
export const records = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/records${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/records/${id}`),
  create: (body) => request('/records', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`/records/${id}`, { method: 'DELETE' }),
  categories: () => request('/records/categories'),
};

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboard = {
  summary: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/dashboard/summary${q ? '?' + q : ''}`);
  },
  categoryTotals: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/dashboard/category-totals${q ? '?' + q : ''}`);
  },
  monthlyTrends: (months = 6) => request(`/dashboard/trends/monthly?months=${months}`),
  weeklyTrends: (weeks = 8) => request(`/dashboard/trends/weekly?weeks=${weeks}`),
  recentActivity: (limit = 10) => request(`/dashboard/recent-activity?limit=${limit}`),
  topCategories: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/dashboard/top-categories${q ? '?' + q : ''}`);
  },
};

// ── Users ────────────────────────────────────────────────────────────────────
export const users = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/users${q ? '?' + q : ''}`);
  },
  get: (id) => request(`/users/${id}`),
  create: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  changeRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  changeStatus: (id, status) => request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const audit = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return request(`/audit${q ? '?' + q : ''}`);
  },
};
