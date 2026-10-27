const { z } = require('zod');

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().max(40).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().trim().max(100).optional(),
    status: z.string().trim().max(40).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .passthrough();

/**
 * Builds Prisma pagination args from a validated query. Sorting is restricted to an allow-list.
 * @param {object} query - req.query
 * @param {string[]} sortable - allowed sort fields
 * @param {string} defaultSort
 */
const paginate = (query, sortable = ['createdAt'], defaultSort = 'createdAt') => {
  const q = listQuerySchema.parse(query);
  const sortBy = sortable.includes(q.sortBy) ? q.sortBy : defaultSort;
  return {
    q,
    skip: (q.page - 1) * q.limit,
    take: q.limit,
    orderBy: { [sortBy]: q.sortOrder },
  };
};

const pageMeta = (q, total) => ({
  page: q.page,
  limit: q.limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / q.limit)),
});

/** Date-range filter for a timestamp column. `to` is inclusive of the whole day. */
const dateRange = (q, field = 'createdAt') => {
  if (!q.from && !q.to) return {};
  const range = {};
  if (q.from) range.gte = q.from;
  if (q.to) {
    const end = new Date(q.to);
    end.setUTCHours(23, 59, 59, 999);
    range.lte = end;
  }
  return { [field]: range };
};

module.exports = { paginate, pageMeta, dateRange, listQuerySchema };
