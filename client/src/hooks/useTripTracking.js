import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { trackingApi } from '../services';
import { useSettings } from '../context/SettingsContext';

/**
 * Watches a trip's live location. Loads the stored path once, then joins the trip room.
 * The server decides whether this user may subscribe; unrelated users get `denied`.
 * `isStale` is recomputed every few seconds so an old fix is never shown as live.
 */
export const useTripTracking = (tripId, { enabled = true } = {}) => {
  const settings = useSettings();
  const staleAfterMs = Number(settings['tracking.staleAfterSec'] || 120) * 1000;
  const [state, setState] = useState({ snapshot: null, points: [], connected: false, denied: false, stopped: false, loading: true });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!tripId || !enabled) return undefined;
    let alive = true;
    const socket = getSocket();

    trackingApi
      .locations(tripId, { limit: 500 })
      .then((res) => alive && setState((s) => ({ ...s, snapshot: res.snapshot, points: res.points, loading: false })))
      .catch(() => alive && setState((s) => ({ ...s, denied: true, loading: false })));

    const subscribe = () =>
      socket.emit('trip:subscribe', { tripId }, (ack) => {
        if (!alive) return;
        if (ack?.ok) setState((s) => ({ ...s, connected: true, snapshot: ack.trip ? { ...s.snapshot, ...ack.trip } : s.snapshot }));
        else setState((s) => ({ ...s, connected: false, denied: true }));
      });

    const onLocation = (p) => {
      if (p.tripId !== tripId) return;
      setState((s) => ({
        ...s,
        points: [...s.points.slice(-499), { latitude: p.latitude, longitude: p.longitude, recordedAt: p.recordedAt, speedMps: p.speed }],
        snapshot: { ...s.snapshot, lastLat: p.latitude, lastLng: p.longitude, lastLocationAt: p.receivedAt || p.recordedAt, trackingActive: true },
      }));
    };
    const onStatus = (p) => p.tripId === tripId && setState((s) => ({ ...s, snapshot: { ...s.snapshot, status: p.status } }));
    const onStopped = (p) => p.tripId === tripId && setState((s) => ({ ...s, stopped: true, snapshot: { ...s.snapshot, status: p.status, trackingActive: false } }));
    const onDisconnect = () => setState((s) => ({ ...s, connected: false }));

    if (socket.connected) subscribe();
    socket.on('connect', subscribe);
    socket.on('disconnect', onDisconnect);
    socket.on('trip:location', onLocation);
    socket.on('trip:status', onStatus);
    socket.on('trip:tracking-stopped', onStopped);
    const tick = setInterval(() => setNow(Date.now()), 5000);

    return () => {
      alive = false;
      clearInterval(tick);
      socket.emit('trip:unsubscribe', { tripId });
      socket.off('connect', subscribe);
      socket.off('disconnect', onDisconnect);
      socket.off('trip:location', onLocation);
      socket.off('trip:status', onStatus);
      socket.off('trip:tracking-stopped', onStopped);
    };
  }, [tripId, enabled]);

  const last = state.snapshot?.lastLocationAt ? new Date(state.snapshot.lastLocationAt).getTime() : null;
  const isStale = !last || now - last > staleAfterMs;
  return { ...state, isStale, staleAfterSec: staleAfterMs / 1000 };
};

export default useTripTracking;
