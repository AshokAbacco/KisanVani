// Indian number formatting (lakh/crore grouping) and timezone-aware dates.

const userTimeZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
})();

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 });

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** ₹1,23,456.50 */
export const formatINR = (v, { whole = false } = {}) => (whole ? inrWhole : inr).format(toNumber(v));

/** Compact rupees for chart axes: ₹1.2L, ₹3.4Cr */
export const formatINRCompact = (v) => {
  const n = toNumber(v);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

export const formatNumber = (v) => num.format(toNumber(v));

/** Weight: 0.25 → "250 g", 12.5 → "12.5 kg", 1500 → "1,500 kg" */
export const formatKg = (v, { grams = true } = {}) => {
  const n = toNumber(v);
  if (grams && n > 0 && n < 1) return `${Math.round(n * 1000)} g`;
  return `${num.format(n)} kg`;
};

export const formatDate = (v, opts = {}) =>
  v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: userTimeZone, ...opts }).format(new Date(v)) : '—';

export const formatDateTime = (v) =>
  v
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: userTimeZone }).format(new Date(v))
    : '—';

export const formatTime = (v) => (v ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: userTimeZone }).format(new Date(v)) : '—');

const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
export const timeAgo = (v) => {
  if (!v) return 'never';
  const sec = Math.round((new Date(v).getTime() - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  return rtf.format(Math.round(sec / 86400), 'day');
};

/** yyyy-mm-dd for <input type="date"> in the user's timezone */
export const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: userTimeZone }).format(d);
  return parts;
};

/** yyyy-mm-ddThh:mm for <input type="datetime-local"> */
export const toDateTimeInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const humanize = (s) => (s ? String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '');

const MODE_LABELS = { CASH: 'Cash', UPI: 'UPI', CREDIT: 'Udhar', BANK_TRANSFER: 'Bank transfer' };
/** Payment mode in the words shopkeepers use. */
export const modeLabel = (m) => MODE_LABELS[m] || humanize(m);

/** "1 customer", "3 customers" */
export const plural = (n, word, many = `${word}s`) => `${n ?? 0} ${Number(n) === 1 ? word : many}`;

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export { toNumber, userTimeZone };
