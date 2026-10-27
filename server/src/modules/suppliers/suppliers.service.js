const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { paginate, pageMeta } = require('../../utils/pagination');

const list = async (shopId, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['name', 'createdAt'], 'name');
  const where = {
    shopId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.includeInactive === 'true' ? {} : { isActive: true }),
    ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { mobile: { contains: q.search } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.supplier.findMany({ where, skip, take, orderBy, include: { _count: { select: { purchaseOrders: true } } } }),
    prisma.supplier.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const get = async (shopId, id) => {
  const s = await prisma.supplier.findFirst({
    where: { id, shopId },
    include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, poNumber: true, status: true, total: true, amountPaid: true, createdAt: true } } },
  });
  if (!s) throw ApiError.notFound('Supplier not found');
  return s;
};

const create = (shopId, data) => prisma.supplier.create({ data: { ...data, shopId } });

const update = async (shopId, id, data) => {
  await get(shopId, id);
  return prisma.supplier.update({ where: { id }, data });
};

module.exports = { list, get, create, update };
