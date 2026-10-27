const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { notify } = require('../../services/notification.service');
const { D, money } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');
const settlements = require('../settlements/settlements.service');

const PAYMENT_INCLUDE = {
  payer: { select: { id: true, name: true, role: true } },
  payee: { select: { id: true, name: true, role: true } },
  recordedBy: { select: { name: true } },
  order: { select: { id: true, orderNumber: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
  customer: { select: { id: true, name: true } },
  purchaseOrder: { select: { id: true, poNumber: true } },
  trip: { select: { id: true, tripNumber: true } },
};

const list = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'amount'], 'createdAt');
  const scope =
    user.role === 'ADMIN'
      ? {}
      : query.as === 'payer'
        ? { payerId: user.id }
        : query.as === 'payee'
          ? { payeeId: user.id }
          : { OR: [{ payerId: user.id }, { payeeId: user.id }, { recordedById: user.id }] };
  const where = {
    AND: [
      scope,
      query.purpose ? { purpose: query.purpose } : {},
      query.mode ? { mode: query.mode } : {},
      query.status ? { status: query.status } : {},
      dateRange(q),
      q.search ? { OR: [{ paymentNumber: { contains: q.search, mode: 'insensitive' } }, { reference: { contains: q.search, mode: 'insensitive' } }] } : {},
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, skip, take, orderBy, include: PAYMENT_INCLUDE }),
    prisma.payment.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

/**
 * Buyer pays the seller for a platform order. The order row is locked (SELECT … FOR UPDATE) so two
 * simultaneous payments cannot together exceed what is owed.
 */
const payOrder = async (user, orderId, { amount, mode, reference, notes }) => {
  const amt = money(amount);
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT id, "buyerId", "sellerId", status, total, "amountPaid", "orderNumber" FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = rows[0];
    if (!order || order.buyerId !== user.id) throw ApiError.notFound('Order not found');
    if (['REJECTED', 'CANCELLED'].includes(order.status)) throw ApiError.conflict('This order was not completed');

    const settlement = await tx.settlement.findUnique({ where: { orderId } });
    const due = money(D(settlement ? settlement.netAmount : order.total).minus(order.amountPaid));
    if (due.lte(0)) throw ApiError.conflict('Nothing is due on this order');
    if (amt.gt(due)) throw ApiError.unprocessable(`Amount exceeds the balance due of ₹${due}`);

    const newPaid = money(D(order.amountPaid).plus(amt));
    const target = settlement ? settlement.netAmount : order.total;
    await tx.order.update({
      where: { id: orderId },
      data: { amountPaid: newPaid, paymentStatus: newPaid.gte(target) ? 'PAID' : 'PARTIAL' },
    });
    const payment = await tx.payment.create({
      data: {
        paymentNumber: await nextDocumentNumber('PAY', tx),
        purpose: 'ORDER',
        amount: amt,
        mode,
        reference,
        notes,
        payerId: user.id,
        payeeId: order.sellerId,
        recordedById: user.id,
        orderId,
      },
    });
    await settlements.applyPayment(tx, orderId);
    await audit.record({ actorId: user.id, action: 'ORDER_PAYMENT', entityType: 'Order', entityId: orderId, metadata: { amount: amt.toString(), mode, paymentNumber: payment.paymentNumber } }, tx);
    return { payment, order };
  });

  await notify(result.order.sellerId, {
    type: 'PAYMENT_RECEIVED',
    title: 'Payment recorded',
    message: `${user.name} recorded a payment of ₹${amt} for order ${result.order.orderNumber}`,
    link: '/payments',
  });
  return prisma.payment.findUnique({ where: { id: result.payment.id }, include: PAYMENT_INCLUDE });
};

/** The party that requested or assigned a delivered trip pays the driver's transport charge. */
const payTrip = async (user, tripId, { amount, mode, reference, notes }) => {
  const amt = money(amount);
  const result = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`SELECT t.id, t."driverId", t."assignedById", t.status, t."transportCharge", t."amountPaid", t."tripNumber", tr."requesterId"
                                     FROM trips t LEFT JOIN transport_requests tr ON tr.id = t."transportRequestId"
                                     WHERE t.id = ${tripId} FOR UPDATE OF t`;
    const trip = rows[0];
    if (!trip || ![trip.assignedById, trip.requesterId].includes(user.id)) throw ApiError.notFound('Trip not found');
    if (trip.status !== 'DELIVERED') throw ApiError.conflict('Transport charges are paid after delivery');
    const due = money(D(trip.transportCharge).minus(trip.amountPaid));
    if (due.lte(0)) throw ApiError.conflict('Transport charge is already fully paid');
    if (amt.gt(due)) throw ApiError.unprocessable(`Amount exceeds the balance due of ₹${due}`);

    await tx.trip.update({ where: { id: tripId }, data: { amountPaid: { increment: amt } } });
    const payment = await tx.payment.create({
      data: {
        paymentNumber: await nextDocumentNumber('PAY', tx),
        purpose: 'TRANSPORT',
        amount: amt,
        mode,
        reference,
        notes,
        payerId: user.id,
        payeeId: trip.driverId,
        recordedById: user.id,
        tripId,
      },
    });
    await audit.record({ actorId: user.id, action: 'TRANSPORT_PAYMENT', entityType: 'Trip', entityId: tripId, metadata: { amount: amt.toString(), mode } }, tx);
    return { payment, trip };
  });
  await notify(result.trip.driverId, {
    type: 'PAYMENT_RECEIVED',
    title: 'Transport payment received',
    message: `₹${amt} recorded for trip ${result.trip.tripNumber}`,
    link: '/driver/earnings',
  });
  return prisma.payment.findUnique({ where: { id: result.payment.id }, include: PAYMENT_INCLUDE });
};

/** Money in / out for the current user over the last 30 days, split by purpose. */
const summary = async (user) => {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [inflow, outflow] = await Promise.all([
    prisma.payment.groupBy({ by: ['purpose'], where: { payeeId: user.id, status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ['purpose'], where: { payerId: user.id, status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const fmt = (rows) => rows.map((r) => ({ purpose: r.purpose, amount: money(r._sum.amount || 0), count: r._count._all }));
  return { since, inflow: fmt(inflow), outflow: fmt(outflow) };
};

module.exports = { list, payOrder, payTrip, summary };
