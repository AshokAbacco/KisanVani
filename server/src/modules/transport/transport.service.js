const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { notify, notifyMany } = require('../../services/notification.service');
const { D, qty, money } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextDocumentNumber } = require('../../utils/numbering');
const { TRIP_TRANSITIONS, TRIP_TERMINAL_STATUSES, TRIP_ACTIVE_STATUSES } = require('../../constants');
const { tripParties, canViewTrip, canManageTrip, relatedUserIds } = require('../../services/access.service');
const { emitTo, tripRoom } = require('../../sockets/io');
const tracking = require('../tracking/tracking.service');
const orders = require('../orders/orders.service');

const ROLE_BASE = { SHOPKEEPER: '/shop', FARMER: '/farmer', MANDI_OWNER: '/mandi', DRIVER: '/driver', ADMIN: '/admin' };

// ───────────────────────────── Transport requests ─────────────────────────────

const REQUEST_INCLUDE = {
  requester: { select: { id: true, name: true, mobile: true, role: true } },
  order: { select: { id: true, orderNumber: true, status: true, buyerId: true, sellerId: true } },
  trips: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, tripNumber: true, status: true, driver: { select: { name: true, mobile: true } }, vehicle: { select: { registrationNumber: true } } },
  },
};

const canViewRequest = (user, r) =>
  user.role === 'ADMIN' ||
  r.requesterId === user.id ||
  (r.order && [r.order.buyerId, r.order.sellerId].includes(user.id)) ||
  (user.role === 'DRIVER' && (r.status === 'OPEN' || r.trips.some((t) => t.driverId === user.id)));

const getRequest = async (user, id) => {
  const r = await prisma.transportRequest.findUnique({
    where: { id },
    include: { ...REQUEST_INCLUDE, trips: { ...REQUEST_INCLUDE.trips, select: { ...REQUEST_INCLUDE.trips.select, driverId: true } } },
  });
  if (!r || !canViewRequest(user, r)) throw ApiError.notFound('Transport request not found');
  return r;
};

const createRequest = async (user, data) => {
  if (data.orderId) {
    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order || ![order.buyerId, order.sellerId].includes(user.id)) throw ApiError.badRequest('Order not found');
    if (!['ACCEPTED', 'PREPARING', 'READY'].includes(order.status)) throw ApiError.conflict('Transport can be requested once the order is accepted and before it is dispatched');
    const dup = await prisma.transportRequest.findFirst({ where: { orderId: data.orderId, status: { in: ['OPEN', 'ASSIGNED'] } } });
    if (dup) throw ApiError.conflict(`Transport is already requested for this order (${dup.requestNumber})`);
  }

  const request = await prisma.$transaction(async (tx) =>
    tx.transportRequest.create({ data: { ...data, requestNumber: await nextDocumentNumber('TRQ', tx), requesterId: user.id }, include: REQUEST_INCLUDE })
  );

  // Let available drivers with verified vehicles (and admins) know there is a load.
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER', status: 'ACTIVE', driverProfile: { isAvailable: true }, vehicles: { some: { verificationStatus: 'VERIFIED', isActive: true } } },
    select: { id: true },
    take: 100,
  });
  await notifyMany(
    drivers.map((d) => d.id),
    { type: 'TRANSPORT_REQUEST', title: 'New load available', message: `${data.commodity}, ${data.expectedQuantityKg} kg — ${data.pickupAddress} → ${data.dropAddress}`, link: '/driver/assignments' }
  );
  return request;
};

const listRequests = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'preferredPickupAt'], 'createdAt');
  let scope;
  if (user.role === 'ADMIN') scope = {};
  else if (user.role === 'DRIVER') scope = { status: 'OPEN' };
  else scope = { OR: [{ requesterId: user.id }, { order: { buyerId: user.id } }, { order: { sellerId: user.id } }] };

  const where = {
    AND: [
      scope,
      query.status && user.role !== 'DRIVER' ? { status: query.status } : {},
      dateRange(q),
      q.search
        ? { OR: [{ requestNumber: { contains: q.search, mode: 'insensitive' } }, { commodity: { contains: q.search, mode: 'insensitive' } }, { pickupAddress: { contains: q.search, mode: 'insensitive' } }, { dropAddress: { contains: q.search, mode: 'insensitive' } }] }
        : {},
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.transportRequest.findMany({ where, skip, take, orderBy, include: REQUEST_INCLUDE }),
    prisma.transportRequest.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

const cancelRequest = async (user, id, reason) => {
  const r = await getRequest(user, id);
  if (user.role !== 'ADMIN' && r.requesterId !== user.id) throw ApiError.forbidden('Only the requester can cancel this request');
  if (!['OPEN', 'ASSIGNED'].includes(r.status)) throw ApiError.conflict(`Request is already ${r.status.toLowerCase()}`);

  const active = await prisma.trip.findFirst({ where: { transportRequestId: id, status: { in: TRIP_ACTIVE_STATUSES } } });
  if (active && !['ASSIGNED', 'ACCEPTED'].includes(active.status)) throw ApiError.conflict('Goods are already picked up; the trip cannot be cancelled now');

  await prisma.$transaction(async (tx) => {
    await tx.transportRequest.update({ where: { id }, data: { status: 'CANCELLED', notes: [r.notes, `Cancelled: ${reason}`].filter(Boolean).join('\n') } });
    if (active) {
      await tx.trip.update({ where: { id: active.id }, data: { status: 'CANCELLED', statusReason: reason, trackingActive: false } });
      await tx.tripEvent.create({ data: { tripId: active.id, fromStatus: active.status, toStatus: 'CANCELLED', actorId: user.id, note: reason } });
    }
    await audit.record({ actorId: user.id, action: 'TRANSPORT_REQUEST_CANCELLED', entityType: 'TransportRequest', entityId: id, metadata: { reason } }, tx);
  });
  if (active) {
    emitTo(tripRoom(active.id), 'trip:status', { tripId: active.id, status: 'CANCELLED' });
    emitTo(tripRoom(active.id), 'trip:tracking-stopped', { tripId: active.id, status: 'CANCELLED' });
    await notify(active.driverId, { type: 'TRIP_CANCELLED', title: 'Trip cancelled', message: `${r.requestNumber}: ${reason}`, link: `/driver/trips/${active.id}` });
  }
  return getRequest(user, id);
};

// ───────────────────────────── Trips ─────────────────────────────

const TRIP_INCLUDE = {
  driver: { select: { id: true, name: true, mobile: true } },
  vehicle: { select: { id: true, registrationNumber: true, type: true, capacityKg: true, make: true, model: true } },
  assignedBy: { select: { id: true, name: true, role: true } },
  transportRequest: { select: { id: true, requestNumber: true, requesterId: true, requester: { select: { name: true, mobile: true, role: true } } } },
  order: { select: { id: true, orderNumber: true, status: true, buyerId: true, sellerId: true, buyer: { select: { name: true } }, seller: { select: { name: true } } } },
  events: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { name: true, role: true } } } },
  deliveryProofs: { orderBy: { createdAt: 'desc' } },
  payments: { select: { id: true, paymentNumber: true, amount: true, mode: true, createdAt: true } },
};

const getTrip = async (user, id) => {
  const trip = await prisma.trip.findUnique({ where: { id }, include: TRIP_INCLUDE });
  if (!trip || !canViewTrip(user, trip)) throw ApiError.notFound('Trip not found');
  return trip;
};

/** Validates that a driver + vehicle pair can take a load. */
const checkDriverAndVehicle = async (driverId, vehicleId, expectedKg) => {
  const driver = await prisma.user.findFirst({ where: { id: driverId, role: 'DRIVER', status: 'ACTIVE' }, include: { driverProfile: true } });
  if (!driver) throw ApiError.badRequest('Driver not found or not active');
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverId, isActive: true } });
  if (!vehicle) throw ApiError.badRequest('Vehicle does not belong to this driver');
  if (vehicle.verificationStatus !== 'VERIFIED') throw ApiError.conflict('Vehicle is not verified yet');
  if (D(vehicle.capacityKg).lt(expectedKg)) throw ApiError.unprocessable(`Vehicle capacity (${vehicle.capacityKg} kg) is less than the load (${expectedKg} kg)`);
  if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < new Date()) throw ApiError.conflict('Vehicle insurance has expired');
  return { driver, vehicle };
};

const tripDataFromRequest = (r) => ({
  transportRequestId: r.id,
  orderId: r.orderId,
  commodity: r.commodity,
  expectedQuantityKg: r.expectedQuantityKg,
  pickupAddress: r.pickupAddress,
  pickupLat: r.pickupLat,
  pickupLng: r.pickupLng,
  pickupContactName: r.pickupContactName,
  pickupContactPhone: r.pickupContactPhone,
  dropAddress: r.dropAddress,
  dropLat: r.dropLat,
  dropLng: r.dropLng,
  dropContactName: r.dropContactName,
  dropContactPhone: r.dropContactPhone,
});

/** Admin or a mandi owner (for loads they are party to) assigns a driver and vehicle. */
const assignTrip = async (user, { transportRequestId, driverId, vehicleId, transportCharge, estimatedArrivalAt }) => {
  const r = await prisma.transportRequest.findUnique({ where: { id: transportRequestId }, include: { order: true } });
  if (!r) throw ApiError.notFound('Transport request not found');
  if (user.role === 'MANDI_OWNER' && ![r.requesterId, r.order?.buyerId, r.order?.sellerId].includes(user.id)) {
    throw ApiError.forbidden('You can only assign vehicles for your own loads');
  }
  if (r.status !== 'OPEN') throw ApiError.conflict('This request already has a vehicle assigned');
  await checkDriverAndVehicle(driverId, vehicleId, r.expectedQuantityKg);

  const trip = await prisma.$transaction(async (tx) => {
    const claimed = await tx.transportRequest.updateMany({ where: { id: r.id, status: 'OPEN' }, data: { status: 'ASSIGNED' } });
    if (claimed.count !== 1) throw ApiError.conflict('This request was just assigned by someone else');
    const t = await tx.trip.create({
      data: {
        ...tripDataFromRequest(r),
        tripNumber: await nextDocumentNumber('TRP', tx),
        driverId,
        vehicleId,
        assignedById: user.id,
        transportCharge: money(transportCharge),
        estimatedArrivalAt: estimatedArrivalAt || null,
        status: 'ASSIGNED',
        events: { create: { toStatus: 'ASSIGNED', actorId: user.id, note: `Assigned by ${user.name}` } },
      },
    });
    await audit.record({ actorId: user.id, action: 'TRIP_ASSIGNED', entityType: 'Trip', entityId: t.id, metadata: { driverId, vehicleId, transportCharge } }, tx);
    return t;
  });

  await notify(driverId, { type: 'TRIP_ASSIGNED', title: `New trip ${trip.tripNumber}`, message: `${r.commodity}: ${r.pickupAddress} → ${r.dropAddress}. Please accept or reject.`, link: `/driver/trips/${trip.id}` });
  if (r.requesterId !== user.id) await notify(r.requesterId, { type: 'TRIP_ASSIGNED', title: 'Vehicle assigned', message: `${trip.tripNumber} assigned for ${r.requestNumber}`, link: '/transport' });
  return getTrip(user, trip.id);
};

/** A driver takes an open load directly (the trip starts ACCEPTED). */
const claimRequest = async (user, requestId, { vehicleId, transportCharge }) => {
  const r = await prisma.transportRequest.findUnique({ where: { id: requestId } });
  if (!r || r.status !== 'OPEN') throw ApiError.conflict('This load is no longer available');
  await checkDriverAndVehicle(user.id, vehicleId, r.expectedQuantityKg);
  const charge = transportCharge ?? r.offeredCharge;
  if (charge === null || charge === undefined) throw ApiError.unprocessable('Enter your transport charge for this load');

  const trip = await prisma.$transaction(async (tx) => {
    const claimed = await tx.transportRequest.updateMany({ where: { id: r.id, status: 'OPEN' }, data: { status: 'ASSIGNED' } });
    if (claimed.count !== 1) throw ApiError.conflict('Another driver took this load first');
    return tx.trip.create({
      data: {
        ...tripDataFromRequest(r),
        tripNumber: await nextDocumentNumber('TRP', tx),
        driverId: user.id,
        vehicleId,
        transportCharge: money(charge),
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        events: { create: [{ toStatus: 'ASSIGNED', actorId: user.id, note: 'Load claimed by driver' }, { fromStatus: 'ASSIGNED', toStatus: 'ACCEPTED', actorId: user.id }] },
      },
    });
  });
  await notify(r.requesterId, {
    type: 'TRIP_ACCEPTED',
    title: 'Driver found',
    message: `${user.name} accepted ${r.requestNumber} for ₹${money(charge)}`,
    link: '/transport',
  });
  return getTrip(user, trip.id);
};

const listTrips = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'status', 'deliveredAt'], 'createdAt');
  let scope;
  if (user.role === 'ADMIN') scope = query.driverId ? { driverId: query.driverId } : {};
  else if (user.role === 'DRIVER') scope = { driverId: user.id };
  else scope = { OR: [{ assignedById: user.id }, { transportRequest: { requesterId: user.id } }, { order: { buyerId: user.id } }, { order: { sellerId: user.id } }] };

  const where = {
    AND: [
      scope,
      query.status ? { status: { in: String(query.status).split(',') } } : {},
      dateRange(q),
      q.search
        ? { OR: [{ tripNumber: { contains: q.search, mode: 'insensitive' } }, { commodity: { contains: q.search, mode: 'insensitive' } }, { vehicle: { registrationNumber: { contains: q.search, mode: 'insensitive' } } }, { driver: { name: { contains: q.search, mode: 'insensitive' } } }] }
        : {},
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.trip.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { driver: { select: { name: true, mobile: true } }, vehicle: { select: { registrationNumber: true, type: true } }, order: { select: { orderNumber: true } } },
    }),
    prisma.trip.count({ where }),
  ]);
  return { items, meta: pageMeta(q, total) };
};

/** Requested-to-trip status side effects on the parent transport request. */
const REQUEST_STATUS_AFTER = { REJECTED: 'OPEN', FAILED: 'OPEN', DELIVERED: 'COMPLETED' };

const transitionTrip = async (user, id, input) => {
  const trip = await prisma.trip.findUnique({ where: { id }, include: { transportRequest: { select: { requesterId: true } }, order: { select: { buyerId: true, sellerId: true } } } });
  if (!trip || !canViewTrip(user, trip)) throw ApiError.notFound('Trip not found');

  const { status } = input;
  const rule = TRIP_TRANSITIONS[trip.status]?.[status];
  if (!rule) throw ApiError.conflict(`A trip that is ${trip.status} cannot move to ${status}`);
  const actor = trip.driverId === user.id ? 'DRIVER' : canManageTrip(user, trip) ? 'MANAGER' : null;
  if (!actor || !rule.includes(actor)) throw ApiError.forbidden(`You cannot mark this trip ${status}`);

  const data = { status };
  const now = new Date();
  if (status === 'ACCEPTED') data.acceptedAt = now;
  if (status === 'PICKED_UP') {
    data.pickedUpAt = now;
    data.loadedQuantityKg = qty(input.loadedQuantityKg);
  }
  if (status === 'IN_TRANSIT') data.startedAt = now;
  if (input.estimatedArrivalAt) data.estimatedArrivalAt = input.estimatedArrivalAt;
  if (status === 'DELIVERED') {
    const delivered = qty(input.deliveredQuantityKg);
    if (trip.loadedQuantityKg && delivered.gt(trip.loadedQuantityKg)) throw ApiError.unprocessable(`Delivered quantity cannot exceed the loaded ${trip.loadedQuantityKg} kg`);
    data.deliveredQuantityKg = delivered;
    data.deliveredAt = now;
  }
  if (input.reason) data.statusReason = input.reason;
  if (TRIP_TERMINAL_STATUSES.includes(status)) data.trackingActive = false;

  let orderUpdate = null;
  await prisma.$transaction(async (tx) => {
    const res = await tx.trip.updateMany({ where: { id, status: trip.status }, data });
    if (res.count !== 1) throw ApiError.conflict('The trip was updated by someone else — please refresh');
    await tx.tripEvent.create({ data: { tripId: id, fromStatus: trip.status, toStatus: status, actorId: user.id, note: input.reason } });

    if (trip.transportRequestId) {
      let next = REQUEST_STATUS_AFTER[status];
      // A manager who is not the requester cancelling = reassignment; the requester cancelling = no longer needed.
      if (status === 'CANCELLED') next = trip.transportRequest?.requesterId === user.id ? 'CANCELLED' : 'OPEN';
      if (next) await tx.transportRequest.update({ where: { id: trip.transportRequestId }, data: { status: next } });
    }
    if (status === 'PICKED_UP' || status === 'DELIVERED') {
      orderUpdate = await orders.syncFromTrip(tx, { ...trip, deliveredQuantityKg: data.deliveredQuantityKg }, status, user.id);
    }
    if (status === 'CANCELLED' && actor === 'MANAGER' && user.role === 'ADMIN') {
      await audit.record({ actorId: user.id, action: 'TRIP_CANCELLED_BY_ADMIN', entityType: 'Trip', entityId: id, metadata: { reason: input.reason } }, tx);
    }
  });

  emitTo(tripRoom(id), 'trip:status', { tripId: id, status, at: now });
  if (TRIP_TERMINAL_STATUSES.includes(status)) await tracking.stopTracking(id, status);

  const recipients = relatedUserIds(trip).filter((uid) => uid !== user.id);
  const roles = await prisma.user.findMany({ where: { id: { in: recipients } }, select: { id: true, role: true } });
  for (const r of roles) {
    await notify(r.id, {
      type: `TRIP_${status}`,
      title: `Trip ${trip.tripNumber}: ${status.replace('_', ' ').toLowerCase()}`,
      message: input.reason ? `${user.name}: ${input.reason}` : `${user.name} updated the trip.`,
      link: r.role === 'DRIVER' ? `/driver/trips/${id}` : `${ROLE_BASE[r.role]}/transport/trips/${id}`,
    });
  }
  if (orderUpdate) {
    const ids = [orderUpdate.buyerId, orderUpdate.sellerId];
    const people = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } });
    for (const p of people) {
      await notify(p.id, { type: `ORDER_${orderUpdate.status}`, title: `Order ${orderUpdate.orderNumber} ${orderUpdate.status.toLowerCase()}`, message: `Updated automatically from trip ${trip.tripNumber}`, link: orders.orderLink(p.role, orderUpdate.orderId) });
    }
  }
  return getTrip(user, id);
};

/** Driver uploads proof of delivery. If the trip is in transit this also completes the delivery. */
const addProof = async (user, id, body, fileUrl) => {
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.driverId !== user.id) throw ApiError.notFound('Trip not found');
  if (!['IN_TRANSIT', 'DELIVERED'].includes(trip.status)) throw ApiError.conflict('Proof of delivery can be added once the trip is in transit');
  await prisma.deliveryProof.create({
    data: { tripId: id, fileUrl, receiverName: body.receiverName, receiverMobile: body.receiverMobile, deliveredQuantityKg: qty(body.deliveredQuantityKg), notes: body.notes, uploadedById: user.id },
  });
  if (trip.status === 'IN_TRANSIT') {
    return transitionTrip(user, id, { status: 'DELIVERED', deliveredQuantityKg: body.deliveredQuantityKg, reason: body.notes });
  }
  return getTrip(user, id);
};

/** Drivers who can be assigned right now, for the admin / mandi assignment screen. */
const availableDrivers = async (query) => {
  const minCapacity = query.minCapacityKg ? D(query.minCapacityKg) : null;
  const drivers = await prisma.user.findMany({
    where: { role: 'DRIVER', status: 'ACTIVE', driverProfile: { isAvailable: true } },
    select: {
      id: true,
      name: true,
      mobile: true,
      driverProfile: { select: { experienceYrs: true, address: { select: { district: true } } } },
      vehicles: {
        where: { verificationStatus: 'VERIFIED', isActive: true, ...(minCapacity ? { capacityKg: { gte: minCapacity } } : {}) },
        select: { id: true, registrationNumber: true, type: true, capacityKg: true },
      },
      _count: { select: { driverTrips: { where: { status: { in: TRIP_ACTIVE_STATUSES } } } } },
    },
    orderBy: { name: 'asc' },
  });
  return drivers.filter((d) => d.vehicles.length).map((d) => ({ ...d, activeTrips: d._count.driverTrips }));
};

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  cancelRequest,
  assignTrip,
  claimRequest,
  listTrips,
  getTrip,
  transitionTrip,
  addProof,
  availableDrivers,
  tripParties,
};
