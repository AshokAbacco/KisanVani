const prisma = require('../../config/prisma');
const config = require('../../config');
const ApiError = require('../../utils/ApiError');
const { TRIP_TRACKABLE_STATUSES, TRIP_ACTIVE_STATUSES } = require('../../constants');
const { emitTo, tripRoom } = require('../../sockets/io');
const { tripParties, canViewTrip } = require('../../services/access.service');
const settings = require('../../services/settings.service');
const v = require('./tracking.validation');

const staleAfterMs = async () => Number((await settings.get('tracking.staleAfterSec')) || config.tracking.staleAfterSec) * 1000;

const isStale = (lastLocationAt, thresholdMs) => !lastLocationAt || Date.now() - new Date(lastLocationAt).getTime() > thresholdMs;

/**
 * Stores a GPS point from the assigned driver of an active trip and broadcasts it to the trip room.
 * Enforces: driver ownership, trackable status, minimum interval between points, sane timestamps.
 */
const recordLocation = async (user, payload) => {
  const data = v.socketLocation.parse(payload);
  const trip = await prisma.trip.findUnique({
    where: { id: data.tripId },
    select: { id: true, driverId: true, status: true, lastLocationAt: true },
  });
  if (!trip || trip.driverId !== user.id) throw ApiError.notFound('Trip not found');
  if (!TRIP_TRACKABLE_STATUSES.includes(trip.status)) {
    throw new ApiError(409, 'Location sharing is only allowed while a trip is active', 'TRACKING_NOT_ALLOWED');
  }

  const now = new Date();
  const minGapMs = config.tracking.minIntervalSec * 1000;
  if (trip.lastLocationAt && now - trip.lastLocationAt < minGapMs) {
    throw new ApiError(429, `Location updates are limited to one every ${config.tracking.minIntervalSec}s`, 'RATE_LIMITED');
  }

  let recordedAt = data.recordedAt || now;
  if (recordedAt > new Date(now.getTime() + 60_000) || recordedAt < new Date(now.getTime() - 10 * 60_000)) recordedAt = now;

  // Conditional update guards against two concurrent writers racing past the interval check.
  const updated = await prisma.trip.updateMany({
    where: {
      id: trip.id,
      status: { in: TRIP_TRACKABLE_STATUSES },
      OR: [{ lastLocationAt: null }, { lastLocationAt: { lte: new Date(now.getTime() - minGapMs) } }],
    },
    data: { lastLat: data.latitude, lastLng: data.longitude, lastLocationAt: now, trackingActive: true },
  });
  if (updated.count !== 1) throw new ApiError(429, 'Location update rejected (too frequent)', 'RATE_LIMITED');

  const point = await prisma.tripLocation.create({
    data: {
      tripId: trip.id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracyM: data.accuracy ?? null,
      speedMps: data.speed ?? null,
      heading: data.heading ?? null,
      recordedAt,
    },
  });

  emitTo(tripRoom(trip.id), 'trip:location', {
    tripId: trip.id,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy ?? null,
    speed: data.speed ?? null,
    heading: data.heading ?? null,
    recordedAt: point.recordedAt,
    receivedAt: now,
  });
  return point;
};

/** Called when a trip leaves the trackable states. */
const stopTracking = async (tripId, status, client = prisma) => {
  await client.trip.update({ where: { id: tripId }, data: { trackingActive: false } });
  emitTo(tripRoom(tripId), 'trip:tracking-stopped', { tripId, status });
};

const snapshot = async (tripId) => {
  const t = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      tripNumber: true,
      status: true,
      trackingActive: true,
      lastLat: true,
      lastLng: true,
      lastLocationAt: true,
      pickupAddress: true,
      pickupLat: true,
      pickupLng: true,
      dropAddress: true,
      dropLat: true,
      dropLng: true,
      estimatedArrivalAt: true,
    },
  });
  if (!t) return null;
  const threshold = await staleAfterMs();
  return { ...t, isStale: isStale(t.lastLocationAt, threshold), staleAfterSec: threshold / 1000 };
};

const assertCanView = async (user, tripId) => {
  const trip = await tripParties(tripId);
  if (!trip || !canViewTrip(user, trip)) throw ApiError.notFound('Trip not found');
  return trip;
};

const getLocations = async (user, tripId, { limit, since }) => {
  await assertCanView(user, tripId);
  const points = await prisma.tripLocation.findMany({
    where: { tripId, ...(since ? { recordedAt: { gt: since } } : {}) },
    orderBy: { recordedAt: 'desc' },
    take: limit,
    select: { latitude: true, longitude: true, accuracyM: true, speedMps: true, heading: true, recordedAt: true },
  });
  return { snapshot: await snapshot(tripId), points: points.reverse() };
};

/** Active trips with their latest known position, scoped to what the user may see. */
const activeTrips = async (user) => {
  const scope =
    user.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { driverId: user.id },
            { assignedById: user.id },
            { transportRequest: { requesterId: user.id } },
            { order: { buyerId: user.id } },
            { order: { sellerId: user.id } },
          ],
        };
  const trips = await prisma.trip.findMany({
    where: { status: { in: TRIP_ACTIVE_STATUSES }, ...scope },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      tripNumber: true,
      status: true,
      commodity: true,
      trackingActive: true,
      lastLat: true,
      lastLng: true,
      lastLocationAt: true,
      pickupAddress: true,
      pickupLat: true,
      pickupLng: true,
      dropAddress: true,
      dropLat: true,
      dropLng: true,
      estimatedArrivalAt: true,
      driver: { select: { id: true, name: true, mobile: true } },
      vehicle: { select: { registrationNumber: true, type: true } },
    },
  });
  const threshold = await staleAfterMs();
  return trips.map((t) => ({ ...t, isStale: isStale(t.lastLocationAt, threshold) }));
};

module.exports = { recordLocation, stopTracking, snapshot, getLocations, activeTrips, assertCanView };
