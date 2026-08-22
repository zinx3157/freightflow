/* FreightFlow Service Worker — Beta 9.5.1
 * Cache-first for static assets, network-first for HTML with offline shell fallback.
 * Scope-aware so mobile/PWA works at root and under /freightflow/ on GitHub Pages.
 */
const CACHE = 'freightflow-b9-6-live-apis-docs-mobile-v9';
const RUNTIME = 'freightflow-runtime-live-apis-docs-mobile-v9';

const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const basePath = scopePath === '' ? '' : scopePath;
const OFFLINE_URL = `${basePath}/`;
const PRECACHE_URLS = [
  `${basePath}/`,
  `${basePath}/manifest.json`,
  `${basePath}/icon-192.svg`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // Clean every older FreightFlow cache, including caches created by a
          // previous root-scoped or wrongly-scoped mobile install.
          .filter((k) => k.startsWith('freightflow-') && k !== CACHE && k !== RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (basePath && !url.pathname.startsWith(`${basePath}/`)) return;

  // HTML navigations: network-first with offline shell fallback.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets: stale-while-revalidate, scoped to this app.
  if (/\.(js|css|woff2?|ttf|png|jpe?g|gif|svg|webp|ico|json)$/.test(url.pathname) ||
      url.pathname.includes('/_next/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data && event.data.type === 'queue-changed') {
    self.clients.matchAll().then((clients) =>
      clients.forEach((c) => c.postMessage({ type: 'queue-changed' }))
    );
  }
});

// Web Push Notifications
self.addEventListener('push', (event) => {
  let payload = { title: 'FreightFlow', body: 'You have a new update', tag: 'ff-default' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    try { payload.body = event.data.text(); } catch {}
  }
  const title = payload.title || 'FreightFlow';
  const options = {
    body: payload.body || '',
    icon: `${basePath}/icon-192.svg`,
    badge: `${basePath}/icon-192.svg`,
    tag: payload.tag || 'ff-default',
    data: payload.data || { url: `${basePath}/` },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || `${basePath}/`;
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url === targetUrl && 'focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});
