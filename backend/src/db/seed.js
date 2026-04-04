require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { initDb, run, queryOne } = require('./database');

const CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Rent', 'Utilities', 'Groceries', 'Transport', 'Entertainment', 'Healthcare', 'Education'];

function randomBetween(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

async function seed() {
  await initDb();

  console.log('🌱 Seeding database...');

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = [
    { id: uuidv4(), name: 'Admin User',   email: 'admin@finance.dev',   password: 'Admin@123',   role: 'ADMIN'   },
    { id: uuidv4(), name: 'Alice Analyst',email: 'analyst@finance.dev',  password: 'Analyst@123', role: 'ANALYST' },
    { id: uuidv4(), name: 'Victor Viewer',email: 'viewer@finance.dev',   password: 'Viewer@123',  role: 'VIEWER'  },
  ];

  for (const u of users) {
    const exists = queryOne('SELECT id FROM users WHERE email = ?', [u.email]);
    if (exists) { console.log(`  ⚠️  User ${u.email} already exists, skipping`); continue; }

    const hash = bcrypt.hashSync(u.password, 10);
    run(
      `INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      [u.id, u.name, u.email, hash, u.role]
    );
    console.log(`  ✅ Created ${u.role}: ${u.email} / ${u.password}`);
  }

  // ── Financial Records (90 days of data) ───────────────────────────────────
  const adminUser = queryOne(`SELECT id FROM users WHERE role = 'ADMIN'`);
  if (!adminUser) { console.error('No admin user found'); process.exit(1); }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const recordCount = queryOne('SELECT COUNT(*) as count FROM financial_records WHERE deleted_at IS NULL');
  if (recordCount.count > 0) {
    console.log(`  ⚠️  Records already exist (${recordCount.count}), skipping`);
  } else {
    const records = [];

    // Fixed monthly income
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      records.push({ type: 'income', amount: 8500, category: 'Salary',    date: d.toISOString().split('T')[0], notes: 'Monthly salary' });
      records.push({ type: 'income', amount: randomBetween(500,2000), category: 'Freelance', date: d.toISOString().split('T')[0], notes: 'Freelance project' });
    }

    // Random expenses over 90 days
    for (let i = 0; i < 60; i++) {
      const expenseCategories = ['Rent','Utilities','Groceries','Transport','Entertainment','Healthcare','Education'];
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const amountMap = { Rent: [1200,1500], Utilities:[80,200], Groceries:[50,300], Transport:[20,150], Entertainment:[30,200], Healthcare:[100,800], Education:[200,1000] };
      const [min, max] = amountMap[cat];
      records.push({ type: 'expense', amount: randomBetween(min, max), category: cat, date: randomDate(ninetyDaysAgo, now), notes: `${cat} expense` });
    }

    // Investment income
    for (let i = 0; i < 5; i++) {
      records.push({ type: 'income', amount: randomBetween(200, 1500), category: 'Investment', date: randomDate(ninetyDaysAgo, now), notes: 'Investment returns' });
    }

    for (const r of records) {
      run(
        `INSERT INTO financial_records (id, amount, type, category, date, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), r.amount, r.type, r.category, r.date, r.notes, adminUser.id]
      );
    }
    console.log(`  ✅ Created ${records.length} financial records`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('  Demo credentials:');
  console.log('  admin@finance.dev   / Admin@123   (ADMIN)');
  console.log('  analyst@finance.dev / Analyst@123 (ANALYST)');
  console.log('  viewer@finance.dev  / Viewer@123  (VIEWER)');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
