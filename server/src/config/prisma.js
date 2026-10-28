const { PrismaClient } = require('../generated/prisma/client.ts');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('./index');

// Prisma 7 runs its query compiler in WebAssembly and talks to PostgreSQL through the `pg` driver adapter.
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

const prisma = new PrismaClient({
  adapter,
  // Query errors are surfaced through the API error handler (which logs 5xx), so only warnings are logged here.
  log: ['warn'],
});

module.exports = prisma;