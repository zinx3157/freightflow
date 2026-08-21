/* FreightFlow Beta 8 — Service Worker
 * Offline shell + stale-while-revalidate for static assets.
 */

const CACHE = 'freightflow-b8-v2';
const APP_SHELL = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache service worker itself
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // HTML navigations: network-first with cached-shell fallback (so clicking new routes works offline)
  if (req.mode === 'navigate' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('/').then((root) => root || caches.match('/index.html')))
        )
    );
    return;
  }

  // Static assets: cache-first with network update (stale-while-revalidate)
  if (url.pathname.startsWith('/_next/') || /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp|json)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
