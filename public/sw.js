// Service worker do Auronfit — só cuida de Web Push (sem cache/offline por enquanto).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Auronfit', body: event.data.text() };
  }

  const title = payload.title || 'Auronfit';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/web-app-manifest-192x192.png',
    badge: payload.badge || '/favicon-96x96.png',
    data: { url: payload.url || '/' },
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      const client = clientsArr[0];
      if (client) {
        client.navigate(url);
        return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
