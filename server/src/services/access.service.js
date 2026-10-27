const prisma = require('../config/prisma');

/** Loads the identities related to a trip (used for permission checks and socket rooms). */
const tripParties = async (tripId, client = prisma) =>
  client.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      status: true,
      driverId: true,
      assignedById: true,
      trackingActive: true,
      lastLocationAt: true,
      transportRequest: { select: { requesterId: true } },
      order: { select: { buyerId: true, sellerId: true } },
    },
  });

const relatedUserIds = (trip) =>
  [trip.driverId, trip.assignedById, trip.transportRequest?.requesterId, trip.order?.buyerId, trip.order?.sellerId].filter(Boolean);

/**
 * A trip (and its live location) is visible to: the driver, whoever assigned it, the transport requester,
 * the buyer and seller of the linked order, and admins. Nobody else.
 */
const canViewTrip = (user, trip) => user.role === 'ADMIN' || relatedUserIds(trip).includes(user.id);

/** Who may cancel or reassign a trip (not the driver; drivers reject instead). */
const canManageTrip = (user, trip) =>
  user.role === 'ADMIN' || [trip.assignedById, trip.transportRequest?.requesterId].filter(Boolean).includes(user.id);

const orderRole = (user, order) => {
  if (order.buyerId === user.id) return 'BUYER';
  if (order.sellerId === user.id) return 'SELLER';
  return null;
};

module.exports = { tripParties, relatedUserIds, canViewTrip, canManageTrip, orderRole };
