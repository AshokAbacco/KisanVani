const { z, idParam } = require('../../validators/common');

const CATEGORY_TYPES = ['VEGETABLE', 'FRUIT', 'LEAFY_GREEN', 'GRAIN', 'PULSE', 'SPICE', 'OTHER'];

const create = z.object({
  name: z.string().trim().min(2).max(60),
  type: z.enum(CATEGORY_TYPES),
  isActive: z.boolean().default(true),
});

const update = create.partial();

const listQuery = z.object({
  type: z.enum(CATEGORY_TYPES).optional(),
  includeInactive: z.enum(['true', 'false']).optional(),
});

module.exports = { create, update, listQuery, idParam, CATEGORY_TYPES };
