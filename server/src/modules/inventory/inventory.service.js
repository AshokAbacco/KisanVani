const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { D, qty } = require('../../utils/money');
const repo = require('./inventory.repository');

const ITEM_INCLUDE = { product: { include: { category: true } } };

const getOwned = async (shopId, id) => {
  const item = await prisma.inventoryItem.findFirst({ where: { id, shopId }, include: ITEM_INCLUDE });
  if (!item) throw ApiError.notFound('Stock item not found');
  return item;
};

const list = async (shopId, query) => {
  const { q, skip, take } = paginate(query, ['updatedAt'], 'updatedAt');
  const where = {
    shopId,
    ...(query.includeInactive === 'true' ? {} : { isActive: true }),
    ...(query.categoryType ? { product: { category: { type: query.categoryType } } } : {}),
    ...(q.search
      ? {
          product: {
            ...(query.categoryType ? { category: { type: query.categoryType } } : {}),
            OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { localName: { contains: q.search, mode: 'insensitive' } }],
          },
        }
      : {}),
  };

  // Low-stock compares two columns, which Prisma cannot express directly; filter after fetching ids.
  if (query.lowStock === 'true') {
    const rows = await prisma.$queryRaw`SELECT id FROM inventory_items WHERE "shopId" = ${shopId} AND "isActive" = true AND "quantityKg" <= "lowStockThresholdKg"`;
    where.id = { in: rows.map((r) => r.id) };
  }

  const sortMap = {
    name: { product: { name: q.sortOrder } },
    quantityKg: { quantityKg: q.sortOrder },
    sellingPricePerKg: { sellingPricePerKg: q.sortOrder },
    updatedAt: { updatedAt: q.sortOrder },
  };
  const orderBy = sortMap[q.sortBy] || { product: { name: 'asc' } };

  const [items, total] = await prisma.$transaction([
    prisma.inventoryItem.findMany({ where, skip, take, orderBy, include: ITEM_INCLUDE }),
    prisma.inventoryItem.count({ where }),
  ]);
  return {
    items: items.map((i) => ({ ...i, isLowStock: D(i.quantityKg).lte(i.lowStockThresholdKg) })),
    meta: pageMeta(q, total),
  };
};

const create = async (user, data) => {
  const product = await prisma.product.findFirst({ where: { id: data.productId, isActive: true } });
  if (!product) throw ApiError.badRequest('Product not found in catalogue');

  return prisma.$transaction(async (tx) => {
    const exists = await tx.inventoryItem.findUnique({ where: { shopId_productId: { shopId: user.id, productId: data.productId } } });
    if (exists) throw ApiError.conflict(`${product.name} is already in your stock master`);
    const item = await tx.inventoryItem.create({
      data: {
        shopId: user.id,
        productId: data.productId,
        sellingPricePerKg: data.sellingPricePerKg,
        costPricePerKg: data.costPricePerKg ?? null,
        lowStockThresholdKg: data.lowStockThresholdKg,
        quantityKg: 0,
      },
    });
    if (D(data.openingQuantityKg).gt(0)) {
      await repo.applyStockChange(tx, {
        inventoryItemId: item.id,
        change: data.openingQuantityKg,
        type: 'OPENING',
        referenceType: 'InventoryItem',
        referenceId: item.id,
        note: 'Opening stock',
        userId: user.id,
      });
    }
    return tx.inventoryItem.findUnique({ where: { id: item.id }, include: ITEM_INCLUDE });
  });
};

const update = async (user, id, data) => {
  await getOwned(user.id, id);
  const item = await prisma.inventoryItem.update({ where: { id }, data, include: ITEM_INCLUDE });
  return item;
};

const adjust = async (user, id, { type, direction, quantityKg, note }) => {
  await getOwned(user.id, id);
  if (type === 'WASTAGE' && direction !== 'OUT') throw ApiError.badRequest('Wastage always reduces stock');
  const change = direction === 'OUT' ? qty(quantityKg).negated() : qty(quantityKg);
  await prisma.$transaction(async (tx) => {
    await repo.applyStockChange(tx, { inventoryItemId: id, change, type, referenceType: 'Manual', note, userId: user.id });
  });
  return getOwned(user.id, id);
};

const transactions = async (shopId, query) => {
  const { q, skip, take } = paginate(query, ['createdAt'], 'createdAt');
  const where = {
    inventoryItem: { shopId },
    ...(query.inventoryItemId ? { inventoryItemId: query.inventoryItemId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...dateRange(q),
  };
  const [items, total] = await prisma.$transaction([
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { inventoryItem: { select: { product: { select: { name: true, emoji: true } } } }, createdBy: { select: { name: true } } },
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

module.exports = { list, create, update, adjust, transactions, getOwned };
