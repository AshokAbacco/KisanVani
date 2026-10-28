const { Prisma } = require('../../generated/prisma/client.ts');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { notify } = require('../../services/notification.service');
const { D, qty, money, sum } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');
const { ORDER_TRANSITIONS, ORDER_RELEASES_STOCK, ROLE_LABELS } = require('../../constants');
const { orderRole } = require('../../services/access.service');
const { emitTo, tripRoom } = require('../../sockets/io');
const { applyStockChange, ensureItem } = require('../inventory/inventory.repository');
const settlements = require('../settlements/settlements.service');
const repo = require('./orders.repository');

const ORDER_TYPES = {
  SHOPKEEPER: { HARVEST: 'SHOP_FROM_FARMER', MANDI_LOT: 'SHOP_FROM_MANDI' },
  MANDI_OWNER: { HARVEST: 'MANDI_FROM_FARMER' },
};

const orderLink = (role, id) => {
  const base = { SHOPKEEPER: '/shop', FARMER: '/farmer', MANDI_OWNER: '/mandi', ADMIN: '/admin' }[role] || '';
  return `${base}/orders/${id}`;
};

const getOrder = async (user, id) => {
  const order = await prisma.order.findUnique({ where: { id }, include: repo.ORDER_DETAIL_INCLUDE });
  if (!order || (user.role !== 'ADMIN' && !orderRole(user, order))) throw ApiError.notFound('Order not found');
  return order;
};

const buyerAddress = async (user) => {
  const key = { SHOPKEEPER: 'shopProfile', MANDI_OWNER: 'mandiProfile' }[user.role];
  const p = await prisma[key].findUnique({ where: { userId: user.id }, include: { address: true } });
  const a = p?.address;
  const name = p?.shopName || p?.mandiName;
  return [name, a?.line1, a?.village, a?.city, a?.district, a?.state, a?.pincode].filter(Boolean).join(', ') || null;
};

const createOrder = async (user, input) => {
  const type = ORDER_TYPES[user.role]?.[input.source];
  if (!type) throw ApiError.forbidden(`${ROLE_LABELS[user.role]} accounts cannot place this kind of order`);

  const existing = await prisma.order.findUnique({ where: { buyerId_idempotencyKey: { buyerId: user.id, idempotencyKey: input.idempotencyKey } } });
  if (existing) return { order: await getOrder(user, existing.id), duplicate: true };

  const ids = input.items.map((i) => i.sourceId);
  const sources =
    input.source === 'HARVEST'
      ? (await prisma.harvestListing.findMany({ where: { id: { in: ids } }, include: { farmer: { select: { status: true } } } })).map((l) => ({
          id: l.id,
          sellerId: l.farmerId,
          sellerActive: l.farmer.status === 'ACTIVE',
          onSale: l.status === 'ACTIVE',
          available: l.availableQuantityKg,
          minOrder: l.minOrderKg,
          price: l.pricePerKg,
          productId: l.productId,
          name: [l.cropName, l.variety, l.grade].filter(Boolean).join(' · '),
        }))
      : (await prisma.mandiLot.findMany({ where: { id: { in: ids } }, include: { mandiOwner: { select: { status: true } } } })).map((l) => ({
          id: l.id,
          sellerId: l.mandiOwnerId,
          sellerActive: l.mandiOwner.status === 'ACTIVE',
          onSale: l.status === 'AVAILABLE',
          available: l.availableWeightKg,
          minOrder: l.minOrderKg,
          price: l.pricePerKg,
          productId: l.productId,
          name: `${l.commodityName}${l.grade ? ` · ${l.grade}` : ''} (${l.lotCode})`,
        }));

  if (sources.length !== ids.length) throw ApiError.badRequest('One or more listings were not found');
  const byId = Object.fromEntries(sources.map((s) => [s.id, s]));
  const sellerIds = new Set(sources.map((s) => s.sellerId));
  if (sellerIds.size !== 1) throw ApiError.badRequest('All items in one order must come from the same seller');
  const sellerId = [...sellerIds][0];
  if (sellerId === user.id) throw ApiError.badRequest('You cannot order from your own listing');

  const lines = input.items.map((i) => {
    const s = byId[i.sourceId];
    if (!s.onSale || !s.sellerActive) throw ApiError.conflict(`${s.name} is no longer on sale`);
    const q = qty(i.quantityKg);
    if (q.lt(s.minOrder)) throw ApiError.unprocessable(`Minimum order for ${s.name} is ${D(s.minOrder).toString()} kg`);
    if (q.gt(s.available)) throw ApiError.conflict(`Only ${D(s.available).toString()} kg of ${s.name} is available`);
    return {
      harvestListingId: input.source === 'HARVEST' ? s.id : null,
      mandiLotId: input.source === 'MANDI_LOT' ? s.id : null,
      productId: s.productId,
      itemName: s.name,
      quantityKg: q,
      unitPrice: money(s.price),
      lineTotal: money(q.times(s.price)),
    };
  });
  const subtotal = money(sum(lines.map((l) => l.lineTotal)));

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      for (const l of lines) await repo.reserve(tx, l);
      return tx.order.create({
        data: {
          orderNumber: await nextDocumentNumber('ORD', tx),
          type,
          buyerId: user.id,
          sellerId,
          subtotal,
          total: subtotal,
          deliveryAddress: input.deliveryAddress || (await buyerAddress(user)),
          expectedDeliveryAt: input.expectedDeliveryAt || null,
          notes: input.notes,
          idempotencyKey: input.idempotencyKey,
          items: { create: lines },
          history: { create: { toStatus: 'PLACED', changedById: user.id } },
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const dup = await prisma.order.findUnique({ where: { buyerId_idempotencyKey: { buyerId: user.id, idempotencyKey: input.idempotencyKey } } });
      if (dup) return { order: await getOrder(user, dup.id), duplicate: true };
    }
    throw err;
  }

  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { role: true } });
  await notify(sellerId, {
    type: 'ORDER_PLACED',
    title: `New order ${order.orderNumber}`,
    message: `${user.name} ordered ${lines.map((l) => `${l.quantityKg} kg ${l.itemName}`).join(', ')} worth ₹${subtotal}`,
    link: orderLink(seller.role, order.id),
  });
  return { order: await getOrder(user, order.id), duplicate: false };
};

const listOrders = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'total', 'status'], 'createdAt');
  const scope =
    user.role === 'ADMIN'
      ? {}
      : query.as === 'buyer'
        ? { buyerId: user.id }
        : query.as === 'seller'
          ? { sellerId: user.id }
          : { OR: [{ buyerId: user.id }, { sellerId: user.id }] };
  const where = {
    AND: [
      scope,
      query.status ? { status: { in: String(query.status).split(',') } } : {},
      query.type ? { type: query.type } : {},
      dateRange(q),
      q.search
        ? {
            OR: [
              { orderNumber: { contains: q.search, mode: 'insensitive' } },
              { buyer: { name: { contains: q.search, mode: 'insensitive' } } },
              { seller: { name: { contains: q.search, mode: 'insensitive' } } },
              { items: { some: { itemName: { contains: q.search, mode: 'insensitive' } } } },
            ],
          }
        : {},
    ],
  };
  const [items, total, value] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        buyer: { select: { id: true, name: true, role: true } },
        seller: { select: { id: true, name: true, role: true } },
        items: { select: { itemName: true, quantityKg: true, unitPrice: true, product: { select: { emoji: true } } } },
        trips: { select: { id: true, status: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { total: true } }),
  ]);
  return { items, meta: { ...pageMeta(q, total), totalValue: value._sum.total || '0' } };
};

/** Cancels transport that is no longer needed when an order is rejected/cancelled. */
const cancelLinkedTransport = async (tx, orderId, actorId, reason) => {
  await tx.transportRequest.updateMany({ where: { orderId, status: 'OPEN' }, data: { status: 'CANCELLED' } });
  const trips = await tx.trip.findMany({ where: { orderId, status: { in: ['ASSIGNED', 'ACCEPTED'] } }, select: { id: true, status: true, driverId: true, transportRequestId: true } });
  for (const t of trips) {
    await tx.trip.update({ where: { id: t.id }, data: { status: 'CANCELLED', statusReason: `Order cancelled: ${reason}`, trackingActive: false } });
    await tx.tripEvent.create({ data: { tripId: t.id, fromStatus: t.status, toStatus: 'CANCELLED', actorId, note: `Order cancelled: ${reason}` } });
    if (t.transportRequestId) await tx.transportRequest.update({ where: { id: t.transportRequestId }, data: { status: 'CANCELLED' } });
  }
  return trips;
};

const transition = async (user, id, { status, reason, items }) => {
  const order = await getOrder(user, id);
  const allowed = ORDER_TRANSITIONS[order.status]?.[status];
  if (!allowed) throw ApiError.conflict(`An order that is ${order.status} cannot be moved to ${status}`);
  // Admins may only cancel (moderation), never act on behalf of a party in any other step.
  const isAdminCancel = user.role === 'ADMIN' && status === 'CANCELLED';
  const actor = isAdminCancel ? 'ADMIN' : orderRole(user, order);
  if (!isAdminCancel && (!actor || !allowed.includes(actor))) {
    throw ApiError.forbidden(`Only the ${allowed.join(' or ').toLowerCase()} can mark this order ${status}`);
  }

  let delivered = null;
  if (status === 'DELIVERED') {
    const map = new Map((items || []).map((i) => [i.itemId, qty(i.deliveredQuantityKg)]));
    delivered = order.items.map((it) => {
      const q = map.has(it.id) ? map.get(it.id) : qty(it.quantityKg);
      if (q.gt(it.quantityKg)) throw ApiError.unprocessable(`Delivered quantity for ${it.itemName} cannot exceed the ordered ${D(it.quantityKg)} kg`);
      return { id: it.id, q };
    });
  }

  let cancelledTrips = [];
  await prisma.$transaction(async (tx) => {
    const data = { status };
    if (status === 'REJECTED') data.rejectionReason = reason;
    if (status === 'CANCELLED') data.cancelReason = reason;
    const res = await tx.order.updateMany({ where: { id, status: order.status }, data });
    if (res.count !== 1) throw ApiError.conflict('The order was updated by someone else — please refresh');

    if (ORDER_RELEASES_STOCK.includes(status)) {
      for (const it of order.items) await repo.release(tx, it);
      cancelledTrips = await cancelLinkedTransport(tx, id, user.id, reason);
    }
    if (delivered) {
      for (const d of delivered) await tx.orderItem.update({ where: { id: d.id }, data: { deliveredQuantityKg: d.q } });
    }
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: status, changedById: user.id, note: reason } });
  });

  for (const t of cancelledTrips) {
    emitTo(tripRoom(t.id), 'trip:status', { tripId: t.id, status: 'CANCELLED' });
    emitTo(tripRoom(t.id), 'trip:tracking-stopped', { tripId: t.id, status: 'CANCELLED' });
    await notify(t.driverId, { type: 'TRIP_CANCELLED', title: 'Trip cancelled', message: `The order for this trip was cancelled: ${reason}`, link: `/driver/trips/${t.id}` });
  }

  const other = actor === 'BUYER' ? order.seller : order.buyer;
  const recipients = user.role === 'ADMIN' ? [order.buyer, order.seller] : [other];
  for (const r of recipients) {
    await notify(r.id, {
      type: `ORDER_${status}`,
      title: `Order ${order.orderNumber} ${status.toLowerCase().replace('_', ' ')}`,
      message: reason ? `${user.name}: ${reason}` : `${user.name} updated the order to ${status.toLowerCase()}.`,
      link: orderLink(r.role, id),
    });
  }
  return getOrder(user, id);
};

/**
 * Buyer confirms what actually arrived. In one transaction:
 *  - the order moves DELIVERED → RECEIVED (guarded, so it can only happen once)
 *  - a shop's inventory increases by the received quantities (purchase-receipt workflow)
 *  - a settlement is created for the seller based on received quantities.
 */
const receive = async (user, id, { items, notes }) => {
  const order = await getOrder(user, id);
  if (order.buyerId !== user.id) throw ApiError.forbidden('Only the buyer can confirm receipt');
  if (order.status !== 'DELIVERED') throw ApiError.conflict('The order must be marked delivered before you confirm receipt');

  const map = new Map(items.map((i) => [i.itemId, qty(i.receivedQuantityKg)]));
  const received = order.items.map((it) => {
    if (!map.has(it.id)) throw ApiError.badRequest(`Enter the received quantity for ${it.itemName}`);
    const q = map.get(it.id);
    const cap = D(it.deliveredQuantityKg ?? it.quantityKg);
    if (q.gt(cap)) throw ApiError.unprocessable(`Received quantity for ${it.itemName} cannot exceed the delivered ${cap} kg`);
    return { ...it, receivedQ: q, value: money(q.times(it.unitPrice)) };
  });

  await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id, status: 'DELIVERED' }, data: { status: 'RECEIVED', receivedAt: new Date() } });
    if (res.count !== 1) throw ApiError.conflict('Receipt was already confirmed');

    for (const r of received) {
      await tx.orderItem.update({ where: { id: r.id }, data: { receivedQuantityKg: r.receivedQ } });
      if (user.role === 'SHOPKEEPER' && r.receivedQ.gt(0)) {
        const inv = await ensureItem(tx, user.id, r.productId, r.unitPrice);
        await applyStockChange(tx, {
          inventoryItemId: inv.id,
          change: r.receivedQ,
          type: 'ORDER_RECEIPT',
          referenceType: 'Order',
          referenceId: id,
          note: `${order.orderNumber} from ${order.seller.name}`,
          userId: user.id,
        });
      }
    }
    const gross = money(sum(received.map((r) => r.value)));
    await settlements.createForOrder(tx, order, gross);
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: 'DELIVERED', toStatus: 'RECEIVED', changedById: user.id, note: notes } });
  });

  await notify(order.sellerId, {
    type: 'ORDER_RECEIVED',
    title: `Order ${order.orderNumber} received`,
    message: `${user.name} confirmed receipt. A settlement has been created.`,
    link: orderLink(order.seller.role, id),
  });
  return getOrder(user, id);
};

/** Called by the transport module so order progress follows the physical trip. */
const syncFromTrip = async (tx, trip, tripStatus, actorId) => {
  if (!trip.orderId) return null;
  const order = await tx.order.findUnique({ where: { id: trip.orderId }, include: { items: true } });
  if (!order) return null;
  const moves = { PICKED_UP: { from: ['READY', 'PREPARING', 'ACCEPTED'], to: 'DISPATCHED' }, DELIVERED: { from: ['DISPATCHED'], to: 'DELIVERED' } }[tripStatus];
  if (!moves || !moves.from.includes(order.status)) return null;
  const res = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: moves.to } });
  if (res.count !== 1) return null;
  if (moves.to === 'DELIVERED' && order.items.length === 1 && trip.deliveredQuantityKg) {
    const q = D(trip.deliveredQuantityKg).lte(order.items[0].quantityKg) ? trip.deliveredQuantityKg : order.items[0].quantityKg;
    await tx.orderItem.update({ where: { id: order.items[0].id }, data: { deliveredQuantityKg: q } });
  }
  await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: moves.to, changedById: actorId, note: `Trip ${trip.tripNumber} ${tripStatus.toLowerCase().replace('_', ' ')}` } });
  return { orderId: order.id, buyerId: order.buyerId, sellerId: order.sellerId, orderNumber: order.orderNumber, status: moves.to };
};

module.exports = { createOrder, listOrders, getOrder, transition, receive, syncFromTrip, orderLink };