const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const settings = require('../../services/settings.service');
const { D, money } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');

const statusFor = (paid, net) => (D(paid).gte(net) ? 'PAID' : D(paid).gt(0) ? 'PARTIAL' : 'PENDING');

/**
 * Creates the settlement for a received order.
 *  gross       = Σ received qty × agreed unit price
 *  commission  = mandi commission (mandi buying from a farmer on commission) + platform fee (setting)
 *  net         = gross − commission  → what the buyer owes the seller
 * Advance payments already recorded on the order are carried over.
 */
const createForOrder = async (tx, order, gross) => {
  let commissionPct = D(0);
  if (order.type === 'MANDI_FROM_FARMER') {
    const mp = await tx.mandiProfile.findUnique({ where: { userId: order.buyerId }, select: { commissionPercent: true } });
    commissionPct = commissionPct.plus(mp?.commissionPercent || 0);
  }
  commissionPct = commissionPct.plus((await settings.get('orders.platformFeePercent')) || 0);

  const commission = money(D(gross).times(commissionPct).div(100));
  const net = money(D(gross).minus(commission));
  const paid = money(order.amountPaid);
  const status = statusFor(paid, net);

  return tx.settlement.create({
    data: {
      settlementNumber: await nextDocumentNumber('STL', tx),
      orderId: order.id,
      payerId: order.buyerId,
      payeeId: order.sellerId,
      grossAmount: money(gross),
      commissionAmount: commission,
      netAmount: net,
      paidAmount: paid,
      status,
      paidAt: status === 'PAID' ? new Date() : null,
    },
  });
};

/** Re-computes a settlement after a payment on its order. */
const applyPayment = async (tx, orderId) => {
  const s = await tx.settlement.findUnique({ where: { orderId } });
  if (!s) return null;
  const order = await tx.order.findUnique({ where: { id: orderId }, select: { amountPaid: true } });
  const status = statusFor(order.amountPaid, s.netAmount);
  return tx.settlement.update({
    where: { id: s.id },
    data: { paidAmount: order.amountPaid, status, paidAt: status === 'PAID' && !s.paidAt ? new Date() : s.paidAt },
  });
};

const list = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'netAmount', 'status'], 'createdAt');
  const scope =
    user.role === 'ADMIN'
      ? {}
      : query.as === 'payer'
        ? { payerId: user.id }
        : query.as === 'payee'
          ? { payeeId: user.id }
          : { OR: [{ payerId: user.id }, { payeeId: user.id }] };
  const where = {
    AND: [
      scope,
      query.status ? { status: query.status } : {},
      dateRange(q),
      q.search ? { OR: [{ settlementNumber: { contains: q.search, mode: 'insensitive' } }, { order: { orderNumber: { contains: q.search, mode: 'insensitive' } } }] } : {},
    ],
  };
  const [items, total, sums] = await prisma.$transaction([
    prisma.settlement.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        order: { select: { id: true, orderNumber: true, type: true } },
        payer: { select: { id: true, name: true, role: true } },
        payee: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.settlement.count({ where }),
    prisma.settlement.aggregate({ where, _sum: { grossAmount: true, commissionAmount: true, netAmount: true, paidAmount: true } }),
  ]);
  const s = sums._sum;
  return {
    items,
    meta: {
      ...pageMeta(q, total),
      totals: {
        gross: money(s.grossAmount || 0),
        commission: money(s.commissionAmount || 0),
        net: money(s.netAmount || 0),
        paid: money(s.paidAmount || 0),
        outstanding: money(D(s.netAmount || 0).minus(s.paidAmount || 0)),
      },
    },
  };
};

const get = async (user, id) => {
  const s = await prisma.settlement.findUnique({
    where: { id },
    include: {
      order: { include: { items: true, payments: { orderBy: { createdAt: 'desc' } } } },
      payer: { select: { id: true, name: true, mobile: true, role: true } },
      payee: { select: { id: true, name: true, mobile: true, role: true } },
    },
  });
  if (!s || (user.role !== 'ADMIN' && ![s.payerId, s.payeeId].includes(user.id))) throw ApiError.notFound('Settlement not found');
  return s;
};

module.exports = { createForOrder, applyPayment, list, get, statusFor };
