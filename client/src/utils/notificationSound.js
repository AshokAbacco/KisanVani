/**
 * One notification sound for the whole app (orders, chat, everything that arrives in the bell).
 *
 * - Generated with the Web Audio API, so there is no audio file to ship or load.
 * - Each notification id plays at most once: also across open tabs (shared through localStorage),
 *   after reconnects, and when the same event is delivered twice.
 * - Bursts are throttled: ten messages arriving together give one chime, not ten.
 * - Browsers only allow sound after the user has interacted with the page; until then it stays silent.
 */

const STORE_KEY = 'kv_notified_sounds';
const KEEP_MS = 30 * 60 * 1000; // remember played ids for 30 minutes
const MIN_GAP_MS = 1200; // at most one chime per 1.2 s

let ctx = null;
let lastPlayedAt = 0;
const playedHere = new Set();

const audio = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
};

// Unlock audio on the first tap/click/key press (browser autoplay rules).
if (typeof window !== 'undefined') {
  const unlock = () => {
    const c = audio();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, unlock));
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, { passive: true }));
}

const readStore = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const now = Date.now();
    return Object.fromEntries(Object.entries(raw).filter(([, ts]) => now - ts < KEEP_MS));
  } catch {
    return {};
  }
};

const remembered = (key) => !!readStore()[key];

const remember = (key) => {
  try {
    const store = readStore();
    store[key] = Date.now();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable: the in-memory set still prevents repeats in this tab */
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs `fn` in exactly one tab per key. The check-and-mark happens under a browser-wide lock
 * (Web Locks API), so two tabs receiving the same notification at the same instant cannot both win.
 * Tabs in the background wait a moment first, so the tab the user is looking at gets priority.
 */
const once = async (key, fn) => {
  if (playedHere.has(key)) return;
  playedHere.add(key);
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') await sleep(500);
  const decide = () => {
    if (remembered(key)) return false;
    remember(key);
    fn();
    return true;
  };
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    await navigator.locks.request('kv-notification-sound', decide).catch(() => {});
  } else {
    decide();
  }
};

/** A short, soft two-note chime. */
const chime = () => {
  const c = audio();
  if (!c) return false;
  if (c.state === 'suspended') {
    // Allowed once the user has interacted with the page; otherwise the browser keeps it silent.
    c.resume()
      .then(() => c.state === 'running' && tones(c))
      .catch(() => {});
    return true;
  }
  if (c.state !== 'running') return false;
  tones(c);
  return true;
};

const tones = (c) => {
  const t0 = c.currentTime;
  const gain = c.createGain();
  gain.connect(c.destination);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
  [
    [880, 0],
    [1318.5, 0.12],
  ].forEach(([freq, at]) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0 + at);
    osc.connect(gain);
    osc.start(t0 + at);
    osc.stop(t0 + at + 0.32);
  });
};

/**
 * Plays the notification sound for a notification id (or any unique key): once, in one tab.
 * Pass `{ silent: true }` to only mark the id as handled — e.g. when the user is already looking at
 * the conversation the message belongs to — so no other tab chimes for it either.
 */
export const playNotificationSound = (id, { silent = false } = {}) => {
  const key = String(id || `anon:${Date.now()}`);
  return once(key, () => {
    if (silent) return;
    const now = Date.now();
    if (now - lastPlayedAt < MIN_GAP_MS) return;
    lastPlayedAt = now;
    try {
      chime();
    } catch {
      /* sound is best-effort */
    }
  });
};

export default playNotificationSound;