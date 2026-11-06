/*
 * KisanVani service worker — only used to show the "incoming call" system notification
 * (with the phone's own notification sound and vibration) while the site is in the background.
 * It caches nothing and does not change how pages load.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Tapping the notification brings KisanVani to the front, where the call screen is ringing.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
      if (tab) return tab.focus();
      return self.clients.openWindow(url);
    })()
  );
});