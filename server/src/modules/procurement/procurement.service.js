const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { D, money, qty, sum } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');
const { distanceKm } = require('../../utils/geo');
const { applyStockChange, ensureItem } = require('../inventory/inventory.repository');

/** The buyer's own coordinates (from their profile address) for distance comparison. */
const buyerLocation = async (user) => {
  const key = { SHOPKEEPER: 'shopProfile', MANDI_OWNER: 'mandiProfile' }[user.role];
  if (!key) return null;
  const profile = await prisma[key].findUnique({ where: { userId: user.id }, include: { address: true } });
  return profile?.address?.latitude ? { lat: profile.address.latitude, lng: profile.address.longitude } : null;
};

const priceFilter = (query) =>
  query.minPrice !== undefined || query.maxPrice !== undefined
    ? { pricePerKg: { ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}) } }
    : {};

/** Only ACTIVE listings with remaining quantity from active farmers are visible to buyers. */
const harvestListings = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['pricePerKg', 'harvestAt', 'availableQuantityKg', 'createdAt'], 'createdAt');
  const where = {
    status: 'ACTIVE',
    availableQuantityKg: { gt: 0 },
    farmer: { status: 'ACTIVE' },
    ...(query.categoryType ? { category: { type: query.categoryType } } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
    ...priceFilter(query),
    ...(q.search
      ? { OR: [{ cropName: { contains: q.search, mode: 'insensitive' } }, { variety: { contains: q.search, mode: 'insensitive' } }, { village: { contains: q.search, mode: 'insensitive' } }] }
      : {}),
  };
  const [items, total, me] = await Promise.all([
    prisma.harvestListing.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { farmer: { select: { id: true, name: true, mobile: true, farmerProfile: { select: { farmName: true } } } }, product: { select: { emoji: true, imageUrl: true } }, category: { select: { name: true, type: true } } },
    }),
    prisma.harvestListing.count({ where }),
    buyerLocation(user),
  ]);
  return {
    items: items.map((l) => ({ ...l, distanceKm: me ? distanceKm(me.lat, me.lng, l.latitude, l.longitude) : null })),
    meta: pageMeta(q, total),
  };
};

const harvestListing = async (id) => {
  const l = await prisma.harvestListing.findFirst({
    where: { id, status: 'ACTIVE', farmer: { status: 'ACTIVE' } },
    include: { farmer: { select: { id: true, name: true, mobile: true, farmerProfile: { select: { farmName: true } } } }, product: true, category: true },
  });
  if (!l) throw ApiError.notFound('Listing is not available');
  return l;
};

const mandiLots = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['pricePerKg', 'availableWeightKg', 'createdAt'], 'createdAt');
  const where = {
    status: 'AVAILABLE',
    availableWeightKg: { gt: 0 },
    mandiOwner: { status: 'ACTIVE' },
    ...(query.categoryType ? { category: { type: query.categoryType } } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.district ? { district: { contains: query.district, mode: 'insensitive' } } : {}),
    ...priceFilter(query),
    ...(q.search
      ? { OR: [{ commodityName: { contains: q.search, mode: 'insensitive' } }, { marketYardName: { contains: q.search, mode: 'insensitive' } }, { lotCode: { contains: q.search, mode: 'insensitive' } }] }
      : {}),
  };
  const [items, total, me] = await Promise.all([
    prisma.mandiLot.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { mandiOwner: { select: { id: true, name: true, mobile: true, mandiProfile: { select: { mandiName: true } } } }, product: { select: { emoji: true, imageUrl: true } }, category: { select: { name: true, type: true } } },
    }),
    prisma.mandiLot.count({ where }),
    buyerLocation(user),
  ]);
  return {
    items: items.map((l) => ({ ...l, distanceKm: me ? distanceKm(me.lat, me.lng, l.latitude, l.longitude) : null })),
    meta: pageMeta(q, total),
  };
};

const mandiLot = async (id) => {
  const l = await prisma.mandiLot.findFirst({
    where: { id, status: 'AVAILABLE', mandiOwner: { status: 'ACTIVE' } },
    include: { mandiOwner: { select: { id: true, name: true, mobile: true, mandiProfile: { select: { mandiName: true } } } }, product: true, category: true },
  });
  if (!l) throw ApiError.notFound('Lot is not available');
  return l;
};

// ─── Off-platform supplier purchases ───

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, mobile: true, type: true } },
  items: { include: { product: { select: { name: true, emoji: true } } } },
  payments: { select: { id: true, paymentNumber: true, amount: true, mode: true, createdAt: true } },
};

const getPurchase = async (shopId, id) => {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, shopId }, include: PO_INCLUDE });
  if (!po) throw ApiError.notFound('Purchase not found');
  return po;
};

const listPurchases = async (shopId, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'total'], 'createdAt');
  const where = {
    shopId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...dateRange(q),
    ...(q.search ? { OR: [{ poNumber: { contains: q.search, mode: 'insensitive' } }, { supplier: { name: { contains: q.search, mode: 'insensitive' } } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({ where, skip, take, orderBy, include: { supplier: { select: { name: true } }, _count: { select: { items: true } } } }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const createPurchase = async (user, { supplierId, items, notes }) => {
  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, shopId: user.id, isActive: true } });
  if (!supplier) throw ApiError.badRequest('Supplier not found');
  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) }, isActive: true }, select: { id: true } });
  if (products.length !== new Set(items.map((i) => i.productId)).size) throw ApiError.badRequest('Unknown product in purchase');

  const lines = items.map((i) => ({ productId: i.productId, quantityKg: qty(i.quantityKg), unitCost: money(i.unitCost), lineTotal: money(qty(i.quantityKg).times(i.unitCost)) }));
  const total = money(sum(lines.map((l) => l.lineTotal)));

  const po = await prisma.$transaction(async (tx) =>
    tx.purchaseOrder.create({
      data: { poNumber: await nextDocumentNumber('PO', tx), shopId: user.id, supplierId, total, notes, items: { create: lines } },
    })
  );
  return getPurchase(user.id, po.id);
};

/**
 * Purchase receipt: stock increases only by the quantities actually received, in one transaction,
 * and only once (status guard ORDERED → RECEIVED).
 */
const receivePurchase = async (user, id, { items }) => {
  const po = await getPurchase(user.id, id);
  if (po.status !== 'ORDERED') throw ApiError.conflict(`Purchase is already ${po.status.toLowerCase()}`);
  const received = new Map(items.map((i) => [i.itemId, qty(i.receivedQuantityKg)]));
  for (const it of po.items) {
    if (!received.has(it.id)) throw ApiError.badRequest('Enter the received quantity for every item');
    if (received.get(it.id).gt(D(it.quantityKg).times(1.1))) {
      throw ApiError.unprocessable(`Received quantity for ${it.product.name} is more than 10% above the ordered quantity`);
    }
  }

  await prisma.$transaction(async (tx) => {
    const res = await tx.purchaseOrder.updateMany({ where: { id, status: 'ORDERED' }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    if (res.count !== 1) throw ApiError.conflict('Purchase was already received');
    let newTotal = D(0);
    for (const it of po.items) {
      const rq = received.get(it.id);
      const lineTotal = money(rq.times(it.unitCost));
      newTotal = newTotal.plus(lineTotal);
      await tx.purchaseOrderItem.update({ where: { id: it.id }, data: { receivedQuantityKg: rq, lineTotal } });
      if (rq.gt(0)) {
        const inv = await ensureItem(tx, user.id, it.productId, it.unitCost);
        await applyStockChange(tx, { inventoryItemId: inv.id, change: rq, type: 'PURCHASE_RECEIPT', referenceType: 'PurchaseOrder', referenceId: id, userId: user.id });
      }
    }
    await tx.purchaseOrder.update({ where: { id }, data: { total: money(newTotal) } });
    await audit.record({ actorId: user.id, action: 'PURCHASE_RECEIVED', entityType: 'PurchaseOrder', entityId: id, metadata: { total: money(newTotal).toString() } }, tx);
  });
  return getPurchase(user.id, id);
};

const cancelPurchase = async (user, id, reason) => {
  const po = await getPurchase(user.id, id);
  if (po.status !== 'ORDERED') throw ApiError.conflict('Only purchases that are not yet received can be cancelled');
  if (D(po.amountPaid).gt(0)) throw ApiError.conflict('This purchase has payments recorded against it');
  await prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED', notes: [po.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n') } });
  await audit.record({ actorId: user.id, action: 'PURCHASE_CANCELLED', entityType: 'PurchaseOrder', entityId: id, metadata: { reason } });
  return getPurchase(user.id, id);
};

const payPurchase = async (user, id, { amount, mode, reference }) => {
  const po = await getPurchase(user.id, id);
  if (po.status === 'CANCELLED') throw ApiError.conflict('Cannot pay a cancelled purchase');
  const amt = money(amount);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE purchase_orders SET "amountPaid" = "amountPaid" + ${amt.toString()}::numeric, "updatedAt" = NOW()
      WHERE id = ${id} AND "amountPaid" + ${amt.toString()}::numeric <= total`;
    if (updated !== 1) throw ApiError.unprocessable(`Payment exceeds the balance due of ₹${money(D(po.total).minus(po.amountPaid))}`);
    await tx.payment.create({
      data: {
        paymentNumber: await nextDocumentNumber('PAY', tx),
        purpose: 'SUPPLIER_PURCHASE',
        amount: amt,
        mode,
        reference,
        payerId: user.id,
        recordedById: user.id,
        purchaseOrderId: id,
        notes: `Payment to ${po.supplier.name}`,
      },
    });
  });
  return getPurchase(user.id, id);
};

module.exports = {
  harvestListings,
  harvestListing,
  mandiLots,
  mandiLot,
  listPurchases,
  getPurchase,
  createPurchase,
  receivePurchase,
  cancelPurchase,
  payPurchase,
};
