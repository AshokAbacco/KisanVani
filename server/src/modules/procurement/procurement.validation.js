const { z, idParam, quantity, amount, optionalText, reasonBody } = require('../../validators/common');
const { CATEGORY_TYPES } = require('../categories/categories.validation');

const marketQuery = z
  .object({
    categoryType: z.enum(CATEGORY_TYPES).optional(),
    productId: z.string().uuid().optional(),
    district: z.string().trim().max(60).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
  })
  .passthrough();

const createPurchase = z.object({
  supplierId: z.string().uuid(),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantityKg: quantity(), unitCost: amount() }))
    .min(1)
    .max(50),
  notes: optionalText(300),
});

const receivePurchase = z.object({
  items: z.array(z.object({ itemId: z.string().uuid(), receivedQuantityKg: quantity({ allowZero: true }) })).min(1),
});

const purchasePayment = z.object({
  amount: amount(),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  reference: optionalText(80),
});

const purchaseQuery = z.object({ status: z.enum(['ORDERED', 'RECEIVED', 'CANCELLED']).optional(), supplierId: z.string().uuid().optional() }).passthrough();

module.exports = { marketQuery, createPurchase, receivePurchase, purchasePayment, purchaseQuery, idParam, reasonBody };
