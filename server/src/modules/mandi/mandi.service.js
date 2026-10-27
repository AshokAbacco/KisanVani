const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { D, qty, money } = require('../../utils/money');
const { paginate, pageMeta } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');

const LOT_INCLUDE = { product: { select: { name: true, emoji: true, imageUrl: true } }, category: { select: { name: true, type: true } } };
const MAX_IMAGES = 5;

const getOwned = async (ownerId, id) => {
  const lot = await prisma.mandiLot.findFirst({ where: { id, mandiOwnerId: ownerId }, include: LOT_INCLUDE });
  if (!lot) throw ApiError.notFound('Lot not found');
  return lot;
};

const list = async (ownerId, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'pricePerKg', 'availableWeightKg'], 'createdAt');
  const where = {
    mandiOwnerId: ownerId,
    ...(query.status ? { status: query.status } : {}),
    ...(q.search ? { OR: [{ commodityName: { contains: q.search, mode: 'insensitive' } }, { lotCode: { contains: q.search, mode: 'insensitive' } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.mandiLot.findMany({ where, skip, take, orderBy, include: { ...LOT_INCLUDE, _count: { select: { orderItems: true } } } }),
    prisma.mandiLot.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const create = async (user, data) => {
  const product = await prisma.product.findFirst({ where: { id: data.productId, isActive: true } });
  if (!product) throw ApiError.badRequest('Commodity not found in catalogue');
  const { publish, ...rest } = data;
  const profile = await prisma.mandiProfile.findUnique({ where: { userId: user.id }, include: { address: true } });

  const lot = await prisma.$transaction(async (tx) =>
    tx.mandiLot.create({
      data: {
        ...rest,
        lotCode: await nextDocumentNumber('LOT', tx),
        mandiOwnerId: user.id,
        commodityName: product.name,
        categoryId: product.categoryId,
        availableWeightKg: rest.totalWeightKg,
        district: rest.district ?? profile?.address?.district ?? null,
        latitude: rest.latitude ?? profile?.address?.latitude ?? null,
        longitude: rest.longitude ?? profile?.address?.longitude ?? null,
        images: [],
        status: publish ? 'AVAILABLE' : 'DRAFT',
      },
      include: LOT_INCLUDE,
    })
  );
  await audit.record({ actorId: user.id, action: 'LOT_CREATED', entityType: 'MandiLot', entityId: lot.id, metadata: { lotCode: lot.lotCode, weight: rest.totalWeightKg } });
  return lot;
};

const update = async (user, id, data) => {
  const lot = await getOwned(user.id, id);
  if (lot.status === 'CLOSED') throw ApiError.conflict('Closed lots cannot be edited');
  const { totalWeightKg, ...rest } = data;
  await prisma.$transaction(async (tx) => {
    if (totalWeightKg !== undefined) {
      const delta = qty(totalWeightKg).minus(lot.totalWeightKg).toString();
      const changed = await tx.$executeRaw`
        UPDATE mandi_lots SET "totalWeightKg" = ${qty(totalWeightKg).toString()}::numeric,
          "availableWeightKg" = "availableWeightKg" + ${delta}::numeric, "updatedAt" = NOW()
        WHERE id = ${id} AND "availableWeightKg" + ${delta}::numeric >= 0`;
      if (changed !== 1) throw ApiError.unprocessable('Total weight cannot be less than the weight already reserved by orders');
    }
    if (D(rest.minOrderKg ?? lot.minOrderKg).gt(totalWeightKg ?? lot.totalWeightKg)) throw ApiError.unprocessable('Minimum order cannot exceed the total weight');
    if (Object.keys(rest).length) await tx.mandiLot.update({ where: { id }, data: rest });
    const fresh = await tx.mandiLot.findUnique({ where: { id } });
    if (fresh.status === 'SOLD_OUT' && D(fresh.availableWeightKg).gt(0)) await tx.mandiLot.update({ where: { id }, data: { status: 'AVAILABLE' } });
    if (fresh.status === 'AVAILABLE' && D(fresh.availableWeightKg).lte(0)) await tx.mandiLot.update({ where: { id }, data: { status: 'SOLD_OUT' } });
  });
  return getOwned(user.id, id);
};

const STATUS_RULES = { AVAILABLE: ['DRAFT', 'PAUSED'], PAUSED: ['AVAILABLE', 'SOLD_OUT'], CLOSED: ['DRAFT', 'AVAILABLE', 'PAUSED', 'SOLD_OUT'] };

const setStatus = async (user, id, status) => {
  const lot = await getOwned(user.id, id);
  if (!STATUS_RULES[status].includes(lot.status)) throw ApiError.conflict(`Cannot change a ${lot.status} lot to ${status}`);
  if (status === 'AVAILABLE' && D(lot.availableWeightKg).lte(0)) throw ApiError.conflict('No weight left in this lot');
  if (status === 'CLOSED') {
    const open = await prisma.orderItem.count({ where: { mandiLotId: id, order: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED'] } } } });
    if (open) throw ApiError.conflict(`This lot has ${open} open order(s)`);
  }
  await prisma.mandiLot.update({ where: { id }, data: { status } });
  await audit.record({ actorId: user.id, action: `LOT_${status}`, entityType: 'MandiLot', entityId: id });
  return getOwned(user.id, id);
};

const addImages = async (user, id, urls) => {
  const lot = await getOwned(user.id, id);
  if (lot.images.length + urls.length > MAX_IMAGES) throw ApiError.unprocessable(`A lot can have at most ${MAX_IMAGES} photos`);
  await prisma.mandiLot.update({ where: { id }, data: { images: [...lot.images, ...urls] } });
  return getOwned(user.id, id);
};

const removeImage = async (user, id, url) => {
  const lot = await getOwned(user.id, id);
  await prisma.mandiLot.update({ where: { id }, data: { images: lot.images.filter((u) => u !== url) } });
  return getOwned(user.id, id);
};

/** Commodity-level view of the mandi's wholesale stock ("Wholesale Products"). */
const products = async (ownerId) => {
  const rows = await prisma.mandiLot.groupBy({
    by: ['productId', 'commodityName'],
    where: { mandiOwnerId: ownerId, status: { in: ['AVAILABLE', 'PAUSED', 'SOLD_OUT', 'DRAFT'] } },
    _sum: { totalWeightKg: true, availableWeightKg: true },
    _min: { pricePerKg: true },
    _max: { pricePerKg: true },
    _count: { _all: true },
  });
  const meta = await prisma.product.findMany({ where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true, emoji: true, category: { select: { name: true } } } });
  const byId = Object.fromEntries(meta.map((m) => [m.id, m]));
  return rows.map((r) => ({
    productId: r.productId,
    commodityName: r.commodityName,
    emoji: byId[r.productId]?.emoji,
    category: byId[r.productId]?.category?.name,
    lots: r._count._all,
    totalWeightKg: r._sum.totalWeightKg || '0',
    availableWeightKg: r._sum.availableWeightKg || '0',
    minPricePerKg: r._min.pricePerKg,
    maxPricePerKg: r._max.pricePerKg,
  }));
};

/** Farmers and shops the mandi has traded with, with order counts and value. */
const partners = async (ownerId) => {
  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.mobile, u.role, COUNT(o.id)::int AS orders, COALESCE(SUM(o.total), 0) AS value, MAX(o."createdAt") AS "lastOrderAt"
    FROM orders o
    JOIN users u ON u.id = CASE WHEN o."sellerId" = ${ownerId} THEN o."buyerId" ELSE o."sellerId" END
    WHERE (o."sellerId" = ${ownerId} OR o."buyerId" = ${ownerId}) AND o.status NOT IN ('REJECTED', 'CANCELLED')
    GROUP BY u.id ORDER BY value DESC`;
  return rows.map((r) => ({ ...r, value: money(r.value) }));
};

const dashboard = async (ownerId) => {
  const [availableLots, wholesaleOrders, pendingOrders, volume, tradeValue, commission, recentOrders, daily] = await Promise.all([
    prisma.mandiLot.count({ where: { mandiOwnerId: ownerId, status: 'AVAILABLE' } }),
    prisma.order.count({ where: { sellerId: ownerId } }),
    prisma.order.count({ where: { sellerId: ownerId, status: 'PLACED' } }),
    prisma.orderItem.aggregate({ where: { order: { sellerId: ownerId, status: { notIn: ['REJECTED', 'CANCELLED'] } } }, _sum: { quantityKg: true } }),
    prisma.order.aggregate({ where: { sellerId: ownerId, status: { notIn: ['REJECTED', 'CANCELLED'] } }, _sum: { total: true } }),
    // Commission earned on farmer produce bought through the mandi
    prisma.settlement.aggregate({ where: { payerId: ownerId, status: { not: 'CANCELLED' } }, _sum: { commissionAmount: true } }),
    prisma.order.findMany({
      where: { OR: [{ sellerId: ownerId }, { buyerId: ownerId }] },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { buyer: { select: { name: true, role: true } }, seller: { select: { name: true, role: true } }, items: { select: { itemName: true, quantityKg: true } } },
    }),
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM(total), 0) AS value
                     FROM orders WHERE "sellerId" = ${ownerId} AND status NOT IN ('REJECTED','CANCELLED') AND "createdAt" > NOW() - INTERVAL '14 days'
                     GROUP BY 1 ORDER BY 1`,
  ]);
  return {
    cards: {
      availableLots,
      wholesaleOrders,
      pendingOrders,
      totalWholesaleVolumeKg: volume._sum.quantityKg || '0',
      tradeValue: money(tradeValue._sum.total || 0),
      commissionEarned: money(commission._sum.commissionAmount || 0),
    },
    recentOrders,
    dailyTrade: daily.map((d) => ({ day: d.day, orders: d.orders, value: money(d.value) })),
  };
};

const setCommission = async (user, percent) => {
  await prisma.mandiProfile.update({ where: { userId: user.id }, data: { commissionPercent: percent } });
  await audit.record({ actorId: user.id, action: 'COMMISSION_UPDATED', entityType: 'MandiProfile', entityId: user.id, metadata: { percent } });
  return prisma.mandiProfile.findUnique({ where: { userId: user.id } });
};

module.exports = { list, create, update, setStatus, addImages, removeImage, getOwned, products, partners, dashboard, setCommission };
