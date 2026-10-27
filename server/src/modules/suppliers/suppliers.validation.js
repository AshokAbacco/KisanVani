const { z, idParam, mobile, optionalText } = require('../../validators/common');

const create = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: mobile.optional().nullable().or(z.literal('').transform(() => null)),
  type: z.enum(['FARMER', 'MANDI', 'WHOLESALER', 'OTHER']).default('OTHER'),
  address: optionalText(200),
  gstin: optionalText(20),
  notes: optionalText(300),
  isActive: z.boolean().optional(),
});

const update = create.partial();

module.exports = { create, update, idParam };
