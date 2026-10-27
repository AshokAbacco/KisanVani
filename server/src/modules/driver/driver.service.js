const prisma = require('../../config/prisma');
const { D, money } = require('../../utils/money');
const { TRIP_ACTIVE_STATUSES } = require('../../constants');

const dashboard = async (driverId) => {
  const [byStatus, earnings, vehicles, currentTrips, openLoads, weekly] = await Promise.all([
    prisma.trip.groupBy({ by: ['status'], where: { driverId }, _count: { _all: true } }),
    prisma.trip.aggregate({ where: { driverId, status: 'DELIVERED' }, _sum: { transportCharge: true, amountPaid: true } }),
    prisma.vehicle.findMany({ where: { driverId }, select: { id: true, registrationNumber: true, type: true, verificationStatus: true, insuranceExpiry: true, fitnessExpiry: true, permitExpiry: true } }),
    prisma.trip.findMany({
      where: { driverId, status: { in: TRIP_ACTIVE_STATUSES } },
      orderBy: { updatedAt: 'desc' },
      include: { vehicle: { select: { registrationNumber: true } } },
    }),
    prisma.transportRequest.count({ where: { status: 'OPEN' } }),
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "deliveredAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS trips, COALESCE(SUM("transportCharge"), 0) AS amount
                     FROM trips WHERE "driverId" = ${driverId} AND status = 'DELIVERED' AND "deliveredAt" > NOW() - INTERVAL '14 days'
                     GROUP BY 1 ORDER BY 1`,
  ]);
  const count = (s) => byStatus.filter((b) => [].concat(s).includes(b.status)).reduce((a, b) => a + b._count._all, 0);
  const total = D(earnings._sum.transportCharge || 0);
  const paid = D(earnings._sum.amountPaid || 0);
  return {
    cards: {
      assignedTrips: count(['ASSIGNED', 'ACCEPTED']),
      inTransit: count(['PICKED_UP', 'IN_TRANSIT']),
      completedTrips: count('DELIVERED'),
      totalEarnings: money(total),
      pendingEarnings: money(total.minus(paid)),
      openLoads,
    },
    vehicles,
    currentTrips,
    dailyEarnings: weekly.map((w) => ({ day: w.day, trips: w.trips, amount: money(w.amount) })),
  };
};

const earnings = async (driverId) => {
  const [trips, monthly, payments] = await Promise.all([
    prisma.trip.findMany({
      where: { driverId, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      take: 200,
      select: { id: true, tripNumber: true, commodity: true, deliveredAt: true, transportCharge: true, amountPaid: true, pickupAddress: true, dropAddress: true },
    }),
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "deliveredAt"), 'YYYY-MM') AS month, COUNT(*)::int AS trips, COALESCE(SUM("transportCharge"), 0) AS earned, COALESCE(SUM("amountPaid"), 0) AS received
                     FROM trips WHERE "driverId" = ${driverId} AND status = 'DELIVERED' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    prisma.payment.findMany({
      where: { payeeId: driverId, purpose: 'TRANSPORT' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { payer: { select: { name: true } }, trip: { select: { tripNumber: true } } },
    }),
  ]);
  const earned = trips.reduce((a, t) => a.plus(t.transportCharge), D(0));
  const received = trips.reduce((a, t) => a.plus(t.amountPaid), D(0));
  return {
    totals: { earned: money(earned), received: money(received), pending: money(earned.minus(received)), trips: trips.length },
    monthly: monthly.map((m) => ({ month: m.month, trips: m.trips, earned: money(m.earned), received: money(m.received) })),
    trips,
    payments,
  };
};

module.exports = { dashboard, earnings };
