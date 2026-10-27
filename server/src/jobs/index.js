const prisma = require('../config/prisma');
const logger = require('../config/logger');
const config = require('../config');
const { emitTo, tripRoom } = require('../sockets/io');

const timers = [];

/** Deletes expired/revoked refresh tokens and used reset tokens older than 30 days. */
const cleanupTokens = async () => {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  const [rt, pr] = await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] } }),
    prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] } }),
  ]);
  if (rt.count || pr.count) logger.info(`Token cleanup: ${rt.count} refresh, ${pr.count} reset tokens removed`);
};

/**
 * Marks active trips whose driver has stopped sending GPS as stale and tells watchers,
 * so the UI never presents an old position as live.
 */
const flagStaleTrips = async () => {
  const threshold = new Date(Date.now() - config.tracking.staleAfterSec * 1000);
  const stale = await prisma.trip.findMany({
    where: { trackingActive: true, lastLocationAt: { lt: threshold } },
    select: { id: true, lastLocationAt: true },
  });
  for (const t of stale) emitTo(tripRoom(t.id), 'trip:stale', { tripId: t.id, lastLocationAt: t.lastLocationAt });
};

/**
 * Notifies drivers about vehicle documents that expire within 15 days (once per day per document).
 */
const remindExpiringDocuments = async () => {
  const { notify } = require('../services/notification.service');
  const soon = new Date(Date.now() + 15 * 86_400_000);
  const vehicles = await prisma.vehicle.findMany({
    where: {
      isActive: true,
      OR: [{ insuranceExpiry: { lte: soon } }, { fitnessExpiry: { lte: soon } }, { permitExpiry: { lte: soon } }],
    },
    select: { id: true, driverId: true, registrationNumber: true },
  });
  const since = new Date(Date.now() - 86_400_000);
  for (const v of vehicles) {
    const already = await prisma.notification.findFirst({
      where: { userId: v.driverId, type: 'DOCUMENT_EXPIRY', link: `/driver/vehicles/${v.id}`, createdAt: { gte: since } },
      select: { id: true },
    });
    if (!already) {
      await notify(v.driverId, {
        type: 'DOCUMENT_EXPIRY',
        title: 'Vehicle document expiring',
        message: `A document for ${v.registrationNumber} expires within 15 days. Please renew it.`,
        link: `/driver/vehicles/${v.id}`,
      });
    }
  }
};

const safe = (name, fn) => async () => {
  try {
    await fn();
  } catch (err) {
    logger.error(`Job ${name} failed: ${err.message}`);
  }
};

const startJobs = () => {
  if (config.isTest) return;
  timers.push(setInterval(safe('cleanupTokens', cleanupTokens), 6 * 3_600_000));
  timers.push(setInterval(safe('flagStaleTrips', flagStaleTrips), 60_000));
  timers.push(setInterval(safe('remindExpiringDocuments', remindExpiringDocuments), 12 * 3_600_000));
  setTimeout(safe('remindExpiringDocuments', remindExpiringDocuments), 30_000).unref();
  timers.forEach((t) => t.unref());
};

const stopJobs = () => timers.splice(0).forEach(clearInterval);

module.exports = { startJobs, stopJobs, cleanupTokens, flagStaleTrips, remindExpiringDocuments };
