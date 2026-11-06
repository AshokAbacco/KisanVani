import { translate } from '../../i18n';

/**
 * System notification for an incoming call while KisanVani is in the background (another app or tab
 * is in front, or the screen is off). It uses the phone's notification sound and vibration at the
 * user's own notification volume.
 *
 * Websites cannot use the phone's real ringtone or ringer volume — only an installed native app can.
 * Notes: needs HTTPS and the user's permission; on iPhone only when KisanVani is added to the Home Screen.
 */

const supported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

let registration = null;
const getRegistration = async () => {
  if (!supported()) return null;
  try {
    registration ||= await navigator.serviceWorker.register('/call-sw.js', { scope: '/' });
    return registration;
  } catch {
    return null;
  }
};

/** Ask once, from a click (browsers only show the permission prompt after a user action). */
export const askCallAlerts = () => {
  if (!supported()) return;
  getRegistration();
  if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
};

const tagOf = (callId) => `kv-call-${callId}`;

/** Shows the notification when the page isn't visible. Returns a function that removes it. */
export const showIncomingAlert = ({ callId, caller, type }) => {
  if (!supported() || Notification.permission !== 'granted' || document.visibilityState === 'visible') return () => {};
  let closed = false;
  const shown = getRegistration().then(async (reg) => {
    if (!reg || closed) return;
    const ready = await navigator.serviceWorker.ready.catch(() => reg);
    await ready.showNotification(caller.name, {
      body: type === 'VIDEO' ? translate('calls.incomingVideo', 'Incoming video call') : translate('calls.incomingVoice', 'Incoming voice call'),
      tag: tagOf(callId), // several tabs → one notification
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [500, 200, 500, 200, 500, 200, 500],
      icon: caller.avatarUrl || '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: window.location.href },
    });
  }).catch(() => {});
  return () => {
    closed = true;
    shown.then(() => registration?.getNotifications({ tag: tagOf(callId) }).then((list) => list.forEach((n) => n.close())).catch(() => {}));
  };
};