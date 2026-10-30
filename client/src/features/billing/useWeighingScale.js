import { useCallback, useEffect, useRef, useState } from 'react';
import { translate } from '../../i18n';

/**
 * Optional weighing-scale integration through the Web Serial API (Chrome / Edge, HTTPS or localhost).
 * Most retail scales with RS-232/USB output stream lines such as "ST,GS,+  1.250kg" or "0.500 KG".
 * We parse the last number on each line; a reading in grams ("g") is converted to kilograms.
 * Manual entry always works without this.
 */
export const parseScaleLine = (line) => {
  const m = String(line).match(/([-+]?\d+(?:\.\d+)?)\s*(kg|g)?/i);
  if (!m) return null;
  let kg = Number(m[1]);
  if (!Number.isFinite(kg) || kg < 0) return null;
  if (m[2] && m[2].toLowerCase() === 'g') kg /= 1000;
  return Math.round(kg * 1000) / 1000;
};

export const useWeighingScale = ({ enabled, baudRate = 9600 }) => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [connected, setConnected] = useState(false);
  const [reading, setReading] = useState(null);
  const [error, setError] = useState(null);
  const port = useRef(null);
  const reader = useRef(null);
  const stopRef = useRef(false);

  const disconnect = useCallback(async () => {
    stopRef.current = true;
    try {
      await reader.current?.cancel();
    } catch {
      /* already closed */
    }
    try {
      await port.current?.close();
    } catch {
      /* already closed */
    }
    reader.current = null;
    port.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!supported) return setError(translate('scale.unsupported', 'This browser cannot talk to a scale. Use Chrome or Edge, or type the weight.'));
    setError(null);
    try {
      port.current = await navigator.serial.requestPort();
      await port.current.open({ baudRate });
      setConnected(true);
      stopRef.current = false;
      const decoder = new TextDecoderStream();
      port.current.readable.pipeTo(decoder.writable).catch(() => {});
      reader.current = decoder.readable.getReader();
      let buffer = '';
      while (!stopRef.current) {
        const { value, done } = await reader.current.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n|\r/);
        buffer = lines.pop() || '';
        for (const l of lines) {
          const kg = parseScaleLine(l);
          if (kg !== null) setReading({ kg, at: Date.now() });
        }
      }
    } catch (e) {
      if (e?.name !== 'NotFoundError') setError(translate('scale.failed', 'Scale connection failed: {error}', { error: e.message }));
      await disconnect();
    }
    return undefined;
  }, [supported, baudRate, disconnect]);

  useEffect(() => () => {
    disconnect();
  }, [disconnect]);

  return { available: enabled && supported, supported, enabled, connected, reading, error, connect, disconnect };
};

export default useWeighingScale;
