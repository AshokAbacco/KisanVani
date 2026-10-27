const { z, idParam, optionalText } = require('../../validators/common');
const { CATEGORY_TYPES } = require('../categories/categories.validation');

const create = z.object({
  name: z.string().trim().min(2).max(80),
  localName: optionalText(80),
  categoryId: z.string().uuid(),
  emoji: optionalText(8),
  unit: z.string().trim().max(10).default('kg'),
  isActive: z.boolean().default(true),
});

const update = create.partial();

const listQuery = z
  .object({
    categoryId: z.string().uuid().optional(),
    categoryType: z.enum(CATEGORY_TYPES).optional(),
    includeInactive: z.enum(['true', 'false']).optional(),
  })
  .passthrough();

module.exports = { create, update, listQuery, idParam };
