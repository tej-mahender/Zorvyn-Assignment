const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description: `
## Finance Dashboard Backend

A role-based REST API for managing financial records, users, and analytics.

### Roles & Permissions

| Permission         | VIEWER | ANALYST | ADMIN |
|--------------------|:------:|:-------:|:-----:|
| View Records       | ✅     | ✅      | ✅    |
| Create Records     | ❌     | ✅      | ✅    |
| Update Records     | ❌     | ✅      | ✅    |
| Delete Records     | ❌     | ✅      | ✅    |
| View Dashboard     | ✅     | ✅      | ✅    |
| Manage Users       | ❌     | ❌      | ✅    |
| View Audit Logs    | ❌     | ❌      | ✅    |

### Authentication
All endpoints (except \`/auth/login\` and \`/auth/register\`) require a JWT token.

Include it in the header: \`Authorization: Bearer <token>\`

### Demo Credentials (after seeding)
- **Admin:** admin@finance.dev / Admin@123
- **Analyst:** analyst@finance.dev / Analyst@123
- **Viewer:** viewer@finance.dev / Viewer@123
      `,
      contact: { name: 'Finance API Support' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors:  { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page:      { type: 'integer' },
            limit:     { type: 'integer' },
            total:     { type: 'integer' },
            totalPages:{ type: 'integer' },
            hasNext:   { type: 'boolean' },
            hasPrev:   { type: 'boolean' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            name:       { type: 'string' },
            email:      { type: 'string', format: 'email' },
            role:       { type: 'string', enum: ['VIEWER','ANALYST','ADMIN'] },
            status:     { type: 'string', enum: ['active','inactive'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        FinancialRecord: {
          type: 'object',
          properties: {
            id:          { type: 'string', format: 'uuid' },
            amount:      { type: 'number', example: 1500.00 },
            type:        { type: 'string', enum: ['income','expense'] },
            category:    { type: 'string', example: 'Salary' },
            date:        { type: 'string', format: 'date', example: '2024-01-15' },
            notes:       { type: 'string', example: 'Monthly salary' },
            created_by:  {
              type: 'object',
              properties: {
                id:   { type: 'string' },
                name: { type: 'string' },
              },
            },
            created_at:  { type: 'string', format: 'date-time' },
            updated_at:  { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            action:     { type: 'string' },
            entity:     { type: 'string' },
            entity_id:  { type: 'string' },
            metadata:   { type: 'object' },
            ip_address: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            user: {
              type: 'object',
              properties: {
                id:    { type: 'string' },
                name:  { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
