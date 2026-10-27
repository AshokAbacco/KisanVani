const { z, amount, optionalText } = require('../../validators/common');

const recordPayment = z.object({
  amount: amount(),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  reference: optionalText(80),
  notes: optionalText(200),
});

const orderParam = z.object({ orderId: z.string().uuid() });
const tripParam = z.object({ tripId: z.string().uuid() });

const listQuery = z
  .object({
    purpose: z.enum(['SALE_INVOICE', 'CREDIT_COLLECTION', 'ORDER', 'SUPPLIER_PURCHASE', 'TRANSPORT']).optional(),
    mode: z.enum(['CASH', 'UPI', 'CREDIT', 'BANK_TRANSFER']).optional(),
    as: z.enum(['payer', 'payee']).optional(),
  })
  .passthrough();

module.exports = { recordPayment, orderParam, tripParam, listQuery };
