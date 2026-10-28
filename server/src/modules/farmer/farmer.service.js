const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { D, qty, money } = require('../../utils/money');
const { paginate, pageMeta } = require('../../utils/pagination');

const LISTING_INCLUDE = { product: { select: { name: true, emoji: true, imageUrl: true } }, category: { select: { name: true, type: true } } };
const MAX_IMAGES = 5;

const getOwned = async (farmerId, id) => {
  const l = await prisma.harvestListing.findFirst({ where: { id, farmerId }, include: LISTING_INCLUDE });
  if (!l) throw ApiError.notFound('Listing not found');
  return l;
};

const list = async (farmerId, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'harvestAt', 'pricePerKg', 'availableQuantityKg'], 'createdAt');
  const where = {
    farmerId,
    ...(query.status ? { status: query.status } : {}),
    ...(q.search ? { OR: [{ cropName: { contains: q.search, mode: 'insensitive' } }, { variety: { contains: q.search, mode: 'insensitive' } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.harvestListing.findMany({ where, skip, take, orderBy, include: { ...LISTING_INCLUDE, _count: { select: { orderItems: true } } } }),
    prisma.harvestListing.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const create = async (user, data) => {
  const product = await prisma.product.findFirst({ where: { id: data.productId, isActive: true } });
  if (!product) throw ApiError.badRequest('Crop not found in catalogue');
  const { publish, ...rest } = data;

  // Default the location to the farmer's profile address when not supplied.
  const profile = await prisma.farmerProfile.findUnique({ where: { userId: user.id }, include: { address: true } });
  const addr = profile?.address;

  const listing = await prisma.harvestListing.create({
    data: {
      ...rest,
      farmerId: user.id,
      cropName: product.name,
      categoryId: product.categoryId,
      availableQuantityKg: rest.totalQuantityKg,
      village: rest.village ?? addr?.village ?? null,
      district: rest.district ?? addr?.district ?? null,
      latitude: rest.latitude ?? addr?.latitude ?? null,
      longitude: rest.longitude ?? addr?.longitude ?? null,
      images: [],
      status: publish ? 'ACTIVE' : 'DRAFT',
    },
    include: LISTING_INCLUDE,
  });
  return listing;
};

/**
 * Updating the total quantity keeps already-ordered quantity intact:
 * available' = available + (newTotal − oldTotal), and it may not drop below zero.
 */
const update = async (user, id, data) => {
  const listing = await getOwned(user.id, id);
  if (listing.status === 'COMPLETED') throw ApiError.conflict('Completed listings cannot be edited');

  const { totalQuantityKg, ...rest } = data;
  await prisma.$transaction(async (tx) => {
    if (totalQuantityKg !== undefined) {
      const delta = qty(totalQuantityKg).minus(listing.totalQuantityKg).toString();
      const changed = await tx.$executeRaw`
        UPDATE harvest_listings
        SET "totalQuantityKg" = ${qty(totalQuantityKg).toString()}::numeric,
            "availableQuantityKg" = "availableQuantityKg" + ${delta}::numeric,
            "updatedAt" = NOW()
        WHERE id = ${id} AND "availableQuantityKg" + ${delta}::numeric >= 0`;
      if (changed !== 1) throw ApiError.unprocessable('Total quantity cannot be less than the quantity already ordered by buyers');
    }
    const minOrder = rest.minOrderKg ?? listing.minOrderKg;
    const total = totalQuantityKg ?? listing.totalQuantityKg;
    if (D(minOrder).gt(total)) throw ApiError.unprocessable('Minimum order cannot exceed the total quantity');
    if (Object.keys(rest).length) await tx.harvestListing.update({ where: { id }, data: rest });

    const fresh = await tx.harvestListing.findUnique({ where: { id } });
    if (fresh.status === 'SOLD_OUT' && D(fresh.availableQuantityKg).gt(0)) await tx.harvestListing.update({ where: { id }, data: { status: 'ACTIVE' } });
    if (fresh.status === 'ACTIVE' && D(fresh.availableQuantityKg).lte(0)) await tx.harvestListing.update({ where: { id }, data: { status: 'SOLD_OUT' } });
  });
  return getOwned(user.id, id);
};

const STATUS_RULES = {
  ACTIVE: ['DRAFT', 'PAUSED'],
  PAUSED: ['ACTIVE', 'SOLD_OUT'],
  COMPLETED: ['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT'],
};

const setStatus = async (user, id, status) => {
  const listing = await getOwned(user.id, id);
  if (!STATUS_RULES[status].includes(listing.status)) throw ApiError.conflict(`Cannot change a ${listing.status} listing to ${status}`);
  if (status === 'ACTIVE' && D(listing.availableQuantityKg).lte(0)) throw ApiError.conflict('No quantity left to publish — update the total quantity first');
  if (status === 'COMPLETED') {
    const open = await prisma.orderItem.count({ where: { harvestListingId: id, order: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED'] } } } });
    if (open) throw ApiError.conflict(`This listing has ${open} open order(s). Complete or reject them first.`);
  }
  await prisma.harvestListing.update({ where: { id }, data: { status } });
  return getOwned(user.id, id);
};

const addImages = async (user, id, urls) => {
  const listing = await getOwned(user.id, id);
  if (listing.images.length + urls.length > MAX_IMAGES) throw ApiError.unprocessable(`A listing can have at most ${MAX_IMAGES} photos`);
  await prisma.harvestListing.update({ where: { id }, data: { images: [...listing.images, ...urls] } });
  return getOwned(user.id, id);
};

const removeImage = async (user, id, url) => {
  const listing = await getOwned(user.id, id);
  await prisma.harvestListing.update({ where: { id }, data: { images: listing.images.filter((u) => u !== url) } });
  return getOwned(user.id, id);
};

/** Crop-wise aggregate of the farmer's listings ("My Crops"). */
const crops = async (farmerId) => {
  const rows = await prisma.harvestListing.groupBy({
    by: ['productId', 'cropName'],
    where: { farmerId },
    _sum: { totalQuantityKg: true, availableQuantityKg: true },
    _count: { _all: true },
    _avg: { pricePerKg: true },
    _max: { harvestAt: true },
  });
  const sold = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { sellerId: farmerId, status: 'RECEIVED' } },
    _sum: { receivedQuantityKg: true, lineTotal: true },
  });
  const soldBy = Object.fromEntries(sold.map((s) => [s.productId, s._sum]));
  const products = await prisma.product.findMany({ where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true, emoji: true } });
  const emoji = Object.fromEntries(products.map((p) => [p.id, p.emoji]));
  return rows
    .map((r) => ({
      productId: r.productId,
      cropName: r.cropName,
      emoji: emoji[r.productId],
      listings: r._count._all,
      totalListedKg: r._sum.totalQuantityKg || '0',
      availableKg: r._sum.availableQuantityKg || '0',
      avgPricePerKg: r._avg.pricePerKg ? money(r._avg.pricePerKg) : '0',
      lastHarvestAt: r._max.harvestAt,
      soldKg: soldBy[r.productId]?.receivedQuantityKg || '0',
    }))
    .sort((a, b) => a.cropName.localeCompare(b.cropName));
};

const dashboard = async (farmerId) => {
  const [activeListings, ordersReceived, pendingOrders, listingsValue, pendingTransport, earnings, recentOrders, monthly] = await Promise.all([
    prisma.harvestListing.count({ where: { farmerId, status: 'ACTIVE' } }),
    prisma.order.count({ where: { sellerId: farmerId } }),
    prisma.order.count({ where: { sellerId: farmerId, status: 'PLACED' } }),
    prisma.$queryRaw`SELECT COALESCE(SUM("totalQuantityKg" * "pricePerKg"), 0) AS total, COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN "availableQuantityKg" * "pricePerKg" ELSE 0 END), 0) AS available
                     FROM harvest_listings WHERE "farmerId" = ${farmerId} AND status <> 'DRAFT'`,
    prisma.transportRequest.count({ where: { requesterId: farmerId, status: { in: ['OPEN', 'ASSIGNED'] } } }),
    prisma.settlement.aggregate({ where: { payeeId: farmerId, status: { not: 'CANCELLED' } }, _sum: { netAmount: true, paidAmount: true } }),
    prisma.order.findMany({
      where: { sellerId: farmerId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { buyer: { select: { name: true, role: true } }, items: { select: { itemName: true, quantityKg: true } } },
    }),
    prisma.$queryRaw`SELECT to_char(date_trunc('month', s."createdAt"), 'YYYY-MM') AS month, SUM(s."netAmount") AS amount
                     FROM settlements s WHERE s."payeeId" = ${farmerId} AND s.status <> 'CANCELLED' AND s."createdAt" > NOW() - INTERVAL '6 months'
                     GROUP BY 1 ORDER BY 1`,
  ]);
  const net = D(earnings._sum.netAmount || 0);
  const paid = D(earnings._sum.paidAmount || 0);
  return {
    cards: {
      activeListings,
      ordersReceived,
      pendingOrders,
      totalHarvestValue: money(listingsValue[0].total),
      availableHarvestValue: money(listingsValue[0].available),
      pendingTransportRequests: pendingTransport,
      totalEarnings: money(net),
      pendingPayments: money(net.minus(paid)),
    },
    recentOrders,
    monthlyEarnings: monthly.map((m) => ({ month: m.month, amount: money(m.amount) })),
  };
};

module.exports = { list, create, update, setStatus, addImages, removeImage, getOwned, crops, dashboard };
