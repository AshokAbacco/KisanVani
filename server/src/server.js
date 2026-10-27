const http = require('node:http');
const config = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const app = require('./app');
const { initSockets } = require('./sockets');
const { startJobs, stopJobs } = require('./jobs');

const server = http.createServer(app);
const io = initSockets(server);

const start = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Connected to PostgreSQL');
  } catch (err) {
    logger.error(`Cannot connect to PostgreSQL. Check DATABASE_URL in server/.env (${err.message})`);
    process.exit(1);
  }
  server.listen(config.port, () => {
    logger.info(`KisanVani API listening on http://localhost:${config.port} (${config.env})`);
  });
  startJobs();
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down`);
  stopJobs();
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));

start();
