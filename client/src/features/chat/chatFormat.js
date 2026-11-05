import { formatDate, formatTime } from '../../utils/format';
import { translate } from '../../i18n';

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

const daysAgo = (d) => {
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((start(new Date()) - start(new Date(d))) / 86400000);
};

/** "Today", "Yesterday", or a date — for the separators between days in a conversation. */
export const dayLabel = (d) => {
  const n = daysAgo(d);
  if (n === 0) return translate('chat.today', 'Today');
  if (n === 1) return translate('chat.yesterday', 'Yesterday');
  return formatDate(d);
};

/** Time shown in the chat list: a clock time today, "Yesterday", or a short date. */
export const listTime = (d) => {
  if (!d) return '';
  const n = daysAgo(d);
  if (n === 0) return formatTime(d);
  if (n === 1) return translate('chat.yesterday', 'Yesterday');
  return formatDate(d, { year: '2-digit', month: '2-digit' });
};

export const sameDay = (a, b) => dayKey(a) === dayKey(b);

const RANK = { SENT: 0, DELIVERED: 1, READ: 2 };
/** Status only ever moves forward: sent → delivered → read. */
export const upgradeStatus = (current, next) => ((RANK[next] ?? 0) > (RANK[current] ?? 0) ? next : current);

/** "online", "typing…", "last seen today at 4:10 pm" or "offline". */
export const presenceText = (person, typing) => {
  if (typing) return translate('chat.typing', 'typing…');
  if (!person) return '';
  if (person.online) return translate('chat.online', 'online');
  if (person.lastSeenAt) return translate('chat.lastSeen', 'last seen {when}', { when: `${dayLabel(person.lastSeenAt).toLowerCase()} ${formatTime(person.lastSeenAt)}` });
  return translate('chat.offline', 'offline');
};
