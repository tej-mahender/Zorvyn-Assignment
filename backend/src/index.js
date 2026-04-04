'use strict';

require('dotenv').config();
const { initDb } = require('./db/database');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server   → http://localhost:${PORT}`);
      console.log(`API Docs → http://localhost:${PORT}/api-docs`);
      console.log(`Health   → http://localhost:${PORT}/health `);
      console.log('Run `npm run seed` to load demo data ');
      console.log('');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
