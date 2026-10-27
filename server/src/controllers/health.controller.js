const prisma = require('../config/prisma');

/** Liveness + database readiness probe for load balancers and uptime monitors. */
const health = async (_req, res) => {
  let database = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  res.status(database === 'up' ? 200 : 503).json({
    success: database === 'up',
    data: { status: database === 'up' ? 'ok' : 'degraded', database, uptimeSec: Math.round(process.uptime()), time: new Date().toISOString() },
  });
};

module.exports = { health };
