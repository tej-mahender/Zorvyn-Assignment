'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { sendError } = require('./utils/response');

// Routes
const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const recordRoutes    = require('./routes/record.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditRoutes     = require('./routes/audit.routes');

const app = express();

// ─── Security & Logging ──────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: "*",
  }),
);app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body Parsing ────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Swagger Docs ────────────────────────────────────────────────────────────

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Finance API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
    swaggerOptions: { persistAuthorization: true },
  })
);

// Expose raw OpenAPI JSON
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'finance-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/auth',      authRoutes);
app.use('/users',     userRoutes);
app.use('/records',   recordRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/audit',     auditRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404);
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
