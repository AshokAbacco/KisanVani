const { z, idParam, quantity, amount, optionalText } = require('../../validators/common');
const { CATEGORY_TYPES } = require('../categories/categories.validation');

const create = z.object({
  productId: z.string().uuid(),
  sellingPricePerKg: amount(),
  costPricePerKg: amount({ allowZero: true }).optional().nullable(),
  openingQuantityKg: quantity({ allowZero: true }).default('0'),
  lowStockThresholdKg: quantity({ allowZero: true }).default('5'),
});

const update = z.object({
  sellingPricePerKg: amount().optional(),
  costPricePerKg: amount({ allowZero: true }).optional().nullable(),
  lowStockThresholdKg: quantity({ allowZero: true }).optional(),
  isActive: z.boolean().optional(),
});

const adjust = z.object({
  type: z.enum(['ADJUSTMENT', 'WASTAGE']),
  direction: z.enum(['IN', 'OUT']),
  quantityKg: quantity(),
  note: z.string().trim().min(3, 'Please describe the reason').max(300),
});

const listQuery = z
  .object({
    categoryType: z.enum(CATEGORY_TYPES).optional(),
    lowStock: z.enum(['true', 'false']).optional(),
    includeInactive: z.enum(['true', 'false']).optional(),
  })
  .passthrough();

const txnQuery = z.object({ inventoryItemId: z.string().uuid().optional(), type: z.string().optional() }).passthrough();

module.exports = { create, update, adjust, listQuery, txnQuery, idParam, optionalText };
