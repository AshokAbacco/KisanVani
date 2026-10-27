import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import { trackingApi } from '../services';
import { useSettings } from '../context/SettingsContext';

/**
 * Driver-side GPS sharing for one trip. Only runs after the driver explicitly starts it, asks the browser for
 * permission, and sends at most one point per configured interval (socket first, REST fallback).
 * It stops automatically when `active` becomes false (trip ended) or the component unmounts.
 */
export const useLocationSharing = (tripId, active) => {
  const settings = useSettings();
  const intervalMs = Math.max(Number(settings['tracking.locationIntervalSec'] || 15), Number(settings['tracking.minIntervalSec'] || 5)) * 1000;
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSent, setLastSent] = useState(null);
  const [lastFix, setLastFix] = useState(null);
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  const stop = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
  }, []);

  const send = useCallback(
    async (pos) => {
      const now = Date.now();
      setLastFix(pos);
      if (now - lastSentAt.current < intervalMs) return;
      lastSentAt.current = now;
      const payload = {
        tripId,
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        accuracy: pos.coords.accuracy ?? null,
        speed: pos.coords.speed ?? null,
        heading: pos.coords.heading ?? null,
        recordedAt: new Date(pos.timestamp).toISOString(),
      };
      const socket = getSocket();
      const viaRest = () => trackingApi.post(tripId, payload).then(() => setLastSent(new Date()));
      try {
        if (socket.connected) {
          const ack = await socket.timeout(8000).emitWithAck('trip:location', payload);
          if (ack?.ok) {
            setLastSent(new Date());
            setError(null);
          } else if (ack?.code === 'TRACKING_NOT_ALLOWED') {
            setError(ack.error);
            stop();
          } else if (ack?.code !== 'RATE_LIMITED') setError(ack?.error || 'Location not accepted');
        } else {
          await viaRest();
          setError(null);
        }
      } catch {
        try {
          await viaRest();
          setError(null);
        } catch (e) {
          setError(e.response?.data?.error?.message || 'Could not send location — will retry');
        }
      }
    },
    [tripId, intervalMs, stop]
  );

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('This device or browser does not support location sharing.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Location needs a secure (HTTPS or localhost) connection.');
      return;
    }
    setError(null);
    lastSentAt.current = 0;
    watchId.current = navigator.geolocation.watchPosition(
      send,
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? 'Location permission was denied. Allow it in your browser settings to share your trip.' : 'Waiting for a GPS signal…');
        if (err.code === err.PERMISSION_DENIED) stop();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    );
    setSharing(true);
  }, [send, stop]);

  useEffect(() => {
    if (!active) stop();
  }, [active, stop]);
  useEffect(() => stop, [stop]);

  return { sharing, start, stop, error, lastSent, lastFix, intervalSec: intervalMs / 1000 };
};

export default useLocationSharing;
