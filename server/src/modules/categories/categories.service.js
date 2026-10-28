const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const list = ({ type, includeInactive }, isAdmin) =>
  prisma.productCategory.findMany({
    where: { ...(type ? { type } : {}), ...(includeInactive === 'true' && isAdmin ? {} : { isActive: true }) },
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });

const create = async (actor, data) => {
  const category = await prisma.productCategory.create({ data: { ...data, slug: slugify(data.name) } });
  return category;
};

const update = async (actor, id, data) => {
  const category = await prisma.productCategory.update({ where: { id }, data: { ...data, ...(data.name ? { slug: slugify(data.name) } : {}) } });
  return category;
};

/** Categories referenced by products or listings are deactivated rather than deleted to keep history intact. */
const remove = async (actor, id) => {
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true, harvestListings: true, mandiLots: true } } },
  });
  if (!category) throw ApiError.notFound('Category not found');
  const inUse = Object.values(category._count).some((n) => n > 0);
  if (inUse) {
    await prisma.productCategory.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.productCategory.delete({ where: { id } });
  }
  return { deleted: !inUse, deactivated: inUse };
};

module.exports = { list, create, update, remove };
