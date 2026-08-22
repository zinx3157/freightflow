/* FreightFlow Service Worker — Beta 9
 * Cache-first for static assets, network-first for HTML with offline shell fallback.
 * Base-path aware (works at root AND under /freightflow/ on GitHub Pages).
 */
const CACHE = 'freightflow-b9-2-v1';
const RUNTIME = 'freightflow-b9-runtime';

const basePath = self.registration?.scope?.includes('/freightflow') ? '/freightflow' : '';
const OFFLINE_URL = basePath + '/';
const PRECACHE_URLS = [
  basePath + '/',
  basePath + '/manifest.json',
  basePath + '/icon-192.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // HTML navigations: network-first with offline shell fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): stale-while-revalidate
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

  // Default: network-first with cache fallback
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
