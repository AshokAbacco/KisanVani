const { z, idParam, quantity, optionalText, optionalDate } = require('../../validators/common');

const createOrder = z.object({
  idempotencyKey: z.string().uuid(),
  source: z.enum(['HARVEST', 'MANDI_LOT']),
  items: z
    .array(z.object({ sourceId: z.string().uuid(), quantityKg: quantity({ max: 1000000 }) }))
    .min(1)
    .max(20)
    .refine((items) => new Set(items.map((i) => i.sourceId)).size === items.length, 'Each listing can appear only once per order'),
  deliveryAddress: optionalText(300),
  expectedDeliveryAt: optionalDate,
  notes: optionalText(500),
});

const transition = z
  .object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED']),
    reason: optionalText(500),
    items: z.array(z.object({ itemId: z.string().uuid(), deliveredQuantityKg: quantity({ allowZero: true }) })).optional(),
  })
  .superRefine((v, ctx) => {
    if (['REJECTED', 'CANCELLED'].includes(v.status) && (!v.reason || v.reason.length < 3)) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Please give a reason' });
    }
  });

const receive = z.object({
  items: z.array(z.object({ itemId: z.string().uuid(), receivedQuantityKg: quantity({ allowZero: true }) })).min(1),
  notes: optionalText(300),
});

const listQuery = z
  .object({
    as: z.enum(['buyer', 'seller']).optional(),
    type: z.enum(['SHOP_FROM_FARMER', 'SHOP_FROM_MANDI', 'MANDI_FROM_FARMER']).optional(),
  })
  .passthrough();

module.exports = { createOrder, transition, receive, listQuery, idParam };
