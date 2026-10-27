const { z } = require('zod');
const { tripRoom } = require('./io');
const { tripParties, canViewTrip } = require('../services/access.service');
const tracking = require('../modules/tracking/tracking.service');

const subscribeSchema = z.object({ tripId: z.string().uuid() });

/**
 * Events (client → server)
 *   trip:subscribe   { tripId }                        → ack { ok, trip?: latest snapshot, error? }
 *   trip:unsubscribe { tripId }
 *   trip:location    { tripId, latitude, longitude, accuracy?, speed?, heading?, recordedAt? } (driver only)
 * Events (server → client)
 *   trip:location  { tripId, latitude, longitude, recordedAt, ... }
 *   trip:status    { tripId, status, ... }
 *   trip:tracking-stopped { tripId, status }
 *   trip:stale     { tripId, lastLocationAt }
 *   notification:new
 */
module.exports = (io, socket) => {
  const { user } = socket.data;

  socket.on('trip:subscribe', async (payload, ack = () => {}) => {
    const parsed = subscribeSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: 'Invalid trip id' });
    const trip = await tripParties(parsed.data.tripId).catch(() => null);
    // Same response for "missing" and "forbidden" so ids cannot be probed.
    if (!trip || !canViewTrip(user, trip)) return ack({ ok: false, error: 'Trip not available' });
    socket.join(tripRoom(trip.id));
    ack({ ok: true, trip: await tracking.snapshot(trip.id) });
  });

  socket.on('trip:unsubscribe', (payload) => {
    const parsed = subscribeSchema.safeParse(payload);
    if (parsed.success) socket.leave(tripRoom(parsed.data.tripId));
  });

  socket.on('trip:location', async (payload, ack = () => {}) => {
    if (user.role !== 'DRIVER') return ack({ ok: false, error: 'Only drivers can share location' });
    try {
      const point = await tracking.recordLocation(user, payload);
      ack({ ok: true, recordedAt: point.recordedAt });
    } catch (err) {
      ack({ ok: false, error: err.message, code: err.code });
    }
  });
};
