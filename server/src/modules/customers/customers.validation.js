const { z, idParam, mobile, amount, optionalText } = require('../../validators/common');

const create = z.object({
  name: z.string().trim().min(2).max(100),
  mobile,
  address: optionalText(200),
  creditLimit: amount({ allowZero: true }).default('5000'),
  notes: optionalText(300),
});

const update = create.partial();

const collect = z.object({
  amount: amount(),
  mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  reference: optionalText(80),
  notes: optionalText(200),
});

const listQuery = z.object({ withCredit: z.enum(['true', 'false']).optional() }).passthrough();

module.exports = { create, update, collect, listQuery, idParam };
