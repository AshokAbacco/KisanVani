/**
 * Call sounds made with the Web Audio API (no audio files to download):
 *  - ringtone: the receiver's phone ringing (plus vibration on phones that support it);
 *  - ringback: what the caller hears while waiting.
 * Browsers only allow sound after the user has interacted with the page; until then they stay silent.
 * With several tabs open, only one tab rings (a browser-wide lock), so the user doesn't hear an echo.
 */

let ctx = null;
const audio = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, unlock));
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
}

/**
 * Loud output chain for the ringtone: a limiter lets it play at full volume without distorting on
 * small phone speakers. (Web pages always play at the phone's MEDIA volume — the system ringtone and
 * ringer volume are not available to websites.)
 */
let loudOut = null;
const loud = (c) => {
  if (loudOut && loudOut.context === c) return loudOut;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-6, c.currentTime);
  limiter.knee.setValueAtTime(0, c.currentTime);
  limiter.ratio.setValueAtTime(20, c.currentTime);
  limiter.attack.setValueAtTime(0.002, c.currentTime);
  limiter.release.setValueAtTime(0.1, c.currentTime);
  const master = c.createGain();
  master.gain.setValueAtTime(1, c.currentTime);
  limiter.connect(master);
  master.connect(c.destination);
  loudOut = limiter;
  return loudOut;
};

const beep = (c, freqs, at, length, volume, { type = 'sine', out = c.destination } = {}) => {
  const gain = c.createGain();
  gain.connect(out);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.03);
  gain.gain.setValueAtTime(volume, at + length - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  freqs.forEach((f) => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, at);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + length + 0.02);
  });
};

/** Repeats `pattern` every `everyMs` until the returned function is called. */
const loop = (pattern, everyMs, vibrate) => {
  let stopped = false;
  let timer = null;
  const tick = () => {
    if (stopped) return;
    const c = audio();
    if (c && c.state === 'running') pattern(c, c.currentTime + 0.02);
    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate && document.visibilityState === 'visible') navigator.vibrate(vibrate);
    timer = setTimeout(tick, everyMs);
  };
  tick();
  return () => {
    stopped = true;
    clearTimeout(timer);
    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0);
  };
};

const ring = (c, t) => {
  // A loud, bright phone-style ring: a quick rising four-note phrase, played twice.
  // 1–2.5 kHz is where phone speakers are loudest; triangle waves add harmonics that cut through noise.
  const out = loud(c);
  const notes = [1047, 1319, 1568, 2093];
  [0, 0.75].forEach((phrase) => {
    notes.forEach((f, i) => beep(c, [f, f * 1.005], t + phrase + i * 0.11, 0.16, 0.9, { type: 'triangle', out }));
  });
};

const ringback = (c, t) => beep(c, [440, 480], t, 1.2, 0.12); // classic "tuuut"

/** Incoming call ringtone, in one tab only. Returns stop(). */
export const startRingtone = () => {
  let stopped = false;
  let stopSound = null;
  const play = () => {
    if (stopped) return Promise.resolve();
    stopSound = loop(ring, 2400, [500, 200, 500, 200, 500]);
    return new Promise((resolve) => {
      const wait = setInterval(() => {
        if (stopped) {
          clearInterval(wait);
          resolve();
        }
      }, 200);
    });
  };
  if (typeof navigator !== 'undefined' && navigator.locks?.request) navigator.locks.request('kv-ringtone', play).catch(() => {});
  else play();
  return () => {
    stopped = true;
    stopSound?.();
  };
};

/** Caller's ringback tone. Returns stop(). */
export const startRingback = () => loop(ringback, 3000);

/** Short "call ended" tone. */
export const playHangupTone = () => {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + 0.02;
  beep(c, [480], t, 0.18, 0.06);
  beep(c, [380], t + 0.22, 0.25, 0.06);
};