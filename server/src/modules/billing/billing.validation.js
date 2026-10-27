const { z, idParam, quantity, amount, mobile, optionalText, reasonBody } = require('../../validators/common');

const createInvoice = z
  .object({
    idempotencyKey: z.string().uuid('A unique bill id is required'),
    items: z
      .array(z.object({ inventoryItemId: z.string().uuid(), quantityKg: quantity({ max: 10000 }) }))
      .min(1, 'Add at least one item to the bill')
      .max(100),
    discount: amount({ allowZero: true }).default('0'),
    paymentMode: z.enum(['CASH', 'UPI', 'CREDIT']),
    amountPaid: amount({ allowZero: true }).optional(),
    paymentReference: optionalText(80),
    customerName: optionalText(100),
    customerMobile: mobile.optional().nullable().or(z.literal('').transform(() => null)),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMode === 'CREDIT' && (!v.customerMobile || !v.customerName)) {
      ctx.addIssue({ code: 'custom', path: ['customerMobile'], message: 'Customer name and mobile are required for credit (udhar) bills' });
    }
  });

const listQuery = z
  .object({
    paymentMode: z.enum(['CASH', 'UPI', 'CREDIT']).optional(),
    status: z.enum(['COMPLETED', 'CANCELLED']).optional(),
    customerId: z.string().uuid().optional(),
  })
  .passthrough();

module.exports = { createInvoice, listQuery, idParam, reasonBody };
