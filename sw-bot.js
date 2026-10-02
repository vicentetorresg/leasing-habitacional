self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let data = { title: 'Llave Propia', body: 'Nuevo mensaje recibido' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-pwa.png',
      badge: '/icon-pwa.png',
      tag: data.tag || 'bot-ia-msg',
      renotify: true,
      data: { phone: data.phone || '' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const phone = e.notification.data?.phone || '';
  const targetUrl = phone ? `/bot-ia.html?phone=${phone}` : '/bot-ia.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes('bot-ia')) {
          c.postMessage({ type: 'open-conversation', phone });
          return c.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
