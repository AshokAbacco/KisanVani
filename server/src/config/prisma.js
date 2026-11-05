const { PrismaClient } = require('../generated/prisma/client.ts');
const { PrismaPg } = require('@prisma/adapter-pg');
const config = require('./index');

/**
 * Prisma 7 runs its query compiler in WebAssembly and talks to PostgreSQL through the `pg` driver adapter.
 *
 * Pool settings matter a lot when the database is far away (every round trip costs 100–250 ms):
 * - Opening a connection (TCP + TLS + login) takes several round trips, so connections stay open
 *   for minutes instead of pg's default of closing them after 10 s idle.
 * - keepAlive stops routers/proxies from silently dropping idle connections.
 * - Enough connections that the queries of one page can run side by side.
 */
const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
  max: Number(process.env.DB_POOL_MAX) || 15,
  idleTimeoutMillis: 5 * 60 * 1000,
  connectionTimeoutMillis: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

const prisma = new PrismaClient({
  adapter,
  // Query errors are surfaced through the API error handler (which logs 5xx), so only warnings are logged here.
  log: ['warn'],
});

/** Opens a few pool connections up front so the first visitors don't pay for the connection setup. */
prisma.warmUp = (count = 4) => Promise.all(Array.from({ length: count }, () => prisma.$queryRaw`SELECT 1`.catch(() => null)));

module.exports = prisma;