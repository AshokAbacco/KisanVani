const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { money } = require('../../utils/money');
const { paginate, pageMeta } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');

const list = async (shopId, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['name', 'creditBalance', 'createdAt'], 'name');
  const where = {
    shopId,
    ...(query.withCredit === 'true' ? { creditBalance: { gt: 0 } } : {}),
    ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { mobile: { contains: q.search } }] } : {}),
  };
  const [items, total, outstanding] = await prisma.$transaction([
    prisma.customer.findMany({ where, skip, take, orderBy, include: { _count: { select: { invoices: true } } } }),
    prisma.customer.count({ where }),
    prisma.customer.aggregate({ where: { shopId }, _sum: { creditBalance: true } }),
  ]);
  return { items, meta: { ...pageMeta(q, total), totalOutstanding: outstanding._sum.creditBalance || '0' } };
};

const getOwned = async (shopId, id) => {
  const c = await prisma.customer.findFirst({ where: { id, shopId } });
  if (!c) throw ApiError.notFound('Customer not found');
  return c;
};

/** Customer with a chronological khata (credit ledger) built from credit bills and collections. */
const get = async (shopId, id) => {
  const customer = await getOwned(shopId, id);
  const [invoices, payments] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { customerId: id, shopId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, invoiceNumber: true, total: true, amountPaid: true, creditAmount: true, paymentMode: true, status: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { customerId: id, purpose: 'CREDIT_COLLECTION' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, paymentNumber: true, amount: true, mode: true, reference: true, status: true, createdAt: true },
    }),
  ]);
  const ledger = [
    ...invoices
      .filter((i) => Number(i.creditAmount) > 0)
      .map((i) => ({ date: i.createdAt, type: i.status === 'CANCELLED' ? 'CREDIT_REVERSED' : 'CREDIT_SALE', reference: i.invoiceNumber, debit: i.status === 'CANCELLED' ? '0' : i.creditAmount, credit: '0', invoiceId: i.id })),
    ...payments.map((p) => ({ date: p.createdAt, type: 'COLLECTION', reference: p.paymentNumber, debit: '0', credit: p.amount, mode: p.mode })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  return { ...customer, invoices, payments, ledger };
};

const create = (shopId, data) => prisma.customer.create({ data: { ...data, shopId } });

const update = async (shopId, id, data) => {
  await getOwned(shopId, id);
  return prisma.customer.update({ where: { id }, data });
};

/** Records a udhar repayment. The balance is reduced with a guarded update so it can never go negative. */
const collect = async (user, id, { amount, mode, reference, notes }) => {
  const customer = await getOwned(user.id, id);
  const amt = money(amount);
  const payment = await prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE customers SET "creditBalance" = "creditBalance" - ${amt.toString()}::numeric, "updatedAt" = NOW()
      WHERE id = ${id} AND "creditBalance" >= ${amt.toString()}::numeric`;
    if (updated !== 1) throw ApiError.unprocessable(`Amount exceeds the outstanding balance of ₹${customer.creditBalance}`);
    const p = await tx.payment.create({
      data: {
        paymentNumber: await nextDocumentNumber('PAY', tx),
        purpose: 'CREDIT_COLLECTION',
        amount: amt,
        mode,
        reference,
        notes,
        payeeId: user.id,
        recordedById: user.id,
        customerId: id,
      },
    });
    await audit.record({ actorId: user.id, action: 'CREDIT_COLLECTED', entityType: 'Customer', entityId: id, metadata: { amount: amt.toString(), mode } }, tx);
    return p;
  });
  return { payment, customer: await getOwned(user.id, id) };
};

module.exports = { list, get, create, update, collect };
