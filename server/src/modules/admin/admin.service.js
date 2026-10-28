const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { notify } = require('../../services/notification.service');
const { money } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { TRIP_ACTIVE_STATUSES } = require('../../constants');
const authRepo = require('../auth/auth.repository');
const authService = require('../auth/auth.service');
const reports = require('../reports/reports.service');

const dashboard = async (query) => {
  const [roles, vehicles, verifiedVehicles, orders, tradeValue, posSales, activeTrips, pendingApprovals, pendingVehicles] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: { notIn: ['REJECTED', 'CANCELLED'] } }, _sum: { total: true } }),
    prisma.salesInvoice.aggregate({ where: { status: 'COMPLETED' }, _sum: { total: true } }),
    prisma.trip.count({ where: { status: { in: TRIP_ACTIVE_STATUSES } } }),
    prisma.user.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.vehicle.count({ where: { verificationStatus: 'PENDING' } }),
  ]);
  const byRole = Object.fromEntries(roles.map((r) => [r.role, r._count._all]));
  const charts = await reports.summary({ role: 'ADMIN' }, query);
  return {
    cards: {
      farmers: byRole.FARMER || 0,
      shopkeepers: byRole.SHOPKEEPER || 0,
      mandiOwners: byRole.MANDI_OWNER || 0,
      drivers: byRole.DRIVER || 0,
      vehicles,
      verifiedVehicles,
      orders,
      tradeValue: money(tradeValue._sum.total || 0),
      posSales: money(posSales._sum.total || 0),
      activeTrips,
      pendingApprovals,
      pendingVehicles,
    },
    charts,
  };
};

const listUsers = async (query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'name', 'lastLoginAt', 'status'], 'createdAt');
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...dateRange(q),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' } },
            { mobile: { contains: q.search } },
            { email: { contains: q.search, mode: 'insensitive' } },
            { shopProfile: { shopName: { contains: q.search, mode: 'insensitive' } } },
            { mandiProfile: { mandiName: { contains: q.search, mode: 'insensitive' } } },
            { farmerProfile: { farmName: { contains: q.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        ...authRepo.SAFE_USER_SELECT,
        shopProfile: { select: { shopName: true, address: { select: { district: true } } } },
        farmerProfile: { select: { farmName: true, address: { select: { village: true, district: true } } } },
        mandiProfile: { select: { mandiName: true, marketYardName: true, address: { select: { district: true } } } },
        driverProfile: { select: { licenseNumber: true, isAvailable: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

/** Role-specific activity numbers shown on the admin user detail page. */
const activityFor = async (user) => {
  const id = user.id;
  switch (user.role) {
    case 'SHOPKEEPER': {
      const [sales, invoices, orders, stock] = await Promise.all([
        prisma.salesInvoice.aggregate({ where: { shopId: id, status: 'COMPLETED' }, _sum: { total: true } }),
        prisma.salesInvoice.count({ where: { shopId: id } }),
        prisma.order.count({ where: { buyerId: id } }),
        prisma.inventoryItem.count({ where: { shopId: id } }),
      ]);
      return { totalSales: money(sales._sum.total || 0), invoices, procurementOrders: orders, stockItems: stock };
    }
    case 'FARMER': {
      const [listings, orders, earned] = await Promise.all([
        prisma.harvestListing.count({ where: { farmerId: id } }),
        prisma.order.count({ where: { sellerId: id } }),
        prisma.settlement.aggregate({ where: { payeeId: id }, _sum: { netAmount: true } }),
      ]);
      return { listings, ordersReceived: orders, earnings: money(earned._sum.netAmount || 0) };
    }
    case 'MANDI_OWNER': {
      const [lots, sold, bought] = await Promise.all([
        prisma.mandiLot.count({ where: { mandiOwnerId: id } }),
        prisma.order.count({ where: { sellerId: id } }),
        prisma.order.count({ where: { buyerId: id } }),
      ]);
      return { lots, wholesaleOrders: sold, farmerProcurementOrders: bought };
    }
    case 'DRIVER': {
      const [trips, delivered, vehicles] = await Promise.all([
        prisma.trip.count({ where: { driverId: id } }),
        prisma.trip.aggregate({ where: { driverId: id, status: 'DELIVERED' }, _count: { _all: true }, _sum: { transportCharge: true } }),
        prisma.vehicle.findMany({ where: { driverId: id }, select: { id: true, registrationNumber: true, type: true, verificationStatus: true } }),
      ]);
      return { trips, deliveredTrips: delivered._count._all, earnings: money(delivered._sum.transportCharge || 0), vehicles };
    }
    default:
      return {};
  }
};

const getUser = async (id) => {
  const user = await authRepo.findWithProfile(id);
  if (!user) throw ApiError.notFound('User not found');
  const [activity, sessions] = await Promise.all([
    activityFor(user),
    prisma.refreshToken.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  return { ...user, activity, activeSessions: sessions };
};

const createUser = async (admin, input, ip) => {
  const user = await authService.createUserWithProfile(input, { status: 'ACTIVE', actorId: admin.id, action: 'USER_CREATED_BY_ADMIN', ip });
  return getUser(user.id);
};

const updateUser = async (admin, id, data, _ip) => {
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw ApiError.notFound('User not found');
  await prisma.user.update({ where: { id }, data });
  return getUser(id);
};

const setStatus = async (admin, id, { status, reason }, _ip) => {
  if (id === admin.id) throw ApiError.badRequest('You cannot change your own account status');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'ADMIN' && status !== 'ACTIVE') {
    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (activeAdmins <= 1) throw ApiError.conflict('At least one active admin is required');
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { status, statusReason: reason || null } });
    if (status !== 'ACTIVE') await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  if (status === 'ACTIVE' && user.status === 'PENDING_APPROVAL') {
    await notify(id, { type: 'ACCOUNT_APPROVED', title: 'Account approved', message: 'Welcome to KisanVani! Your account is now active.', link: '/' });
  }
  return getUser(id);
};

const revokeSessions = async (admin, id, _ip) => {
  const res = await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  return { revoked: res.count };
};

module.exports = { dashboard, listUsers, getUser, createUser, updateUser, setStatus, revokeSessions };
