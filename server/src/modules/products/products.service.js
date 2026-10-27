const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { paginate, pageMeta } = require('../../utils/pagination');

const list = async (query, isAdmin) => {
  const { q, skip, take, orderBy } = paginate(query, ['name', 'createdAt'], 'name');
  const where = {
    ...(query.includeInactive === 'true' && isAdmin ? {} : { isActive: true }),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.categoryType ? { category: { type: query.categoryType } } : {}),
    ...(q.search
      ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { localName: { contains: q.search, mode: 'insensitive' } }] }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, skip, take, orderBy: query.sortBy ? orderBy : { name: 'asc' }, include: { category: true } }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const get = async (id) => {
  const p = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!p) throw ApiError.notFound('Product not found');
  return p;
};

const create = async (actor, data) => {
  const p = await prisma.product.create({ data, include: { category: true } });
  await audit.record({ actorId: actor.id, action: 'PRODUCT_CREATED', entityType: 'Product', entityId: p.id, metadata: data });
  return p;
};

const update = async (actor, id, data) => {
  const p = await prisma.product.update({ where: { id }, data, include: { category: true } });
  await audit.record({ actorId: actor.id, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: id, metadata: data });
  return p;
};

const setImage = async (actor, id, url) => {
  const p = await prisma.product.update({ where: { id }, data: { imageUrl: url }, include: { category: true } });
  await audit.record({ actorId: actor.id, action: 'PRODUCT_IMAGE_UPDATED', entityType: 'Product', entityId: id });
  return p;
};

module.exports = { list, get, create, update, setImage };
