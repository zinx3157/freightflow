'use client';

import { useEffect } from 'react';
import { basePath, withBasePath } from '@/lib/basePath';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Don't register on localhost to avoid stale cache during development
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', async () => {
      const swUrl = withBasePath('/sw.js');
      const scope = withBasePath('/');

      try {
        // Older builds registered /sw.js at origin root. On GitHub Pages project sites
        // that leaves mobile/PWA users controlled by the wrong scope, so clear it.
        if (basePath) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            regs
              .filter((reg) => new URL(reg.scope).pathname !== scope)
              .map((reg) => reg.unregister())
          );
        }

        // Clear older FreightFlow caches from the page as well. This helps phones
        // that kept a stale static shell even after the repo was redeployed.
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith('freightflow-')).map((k) => caches.delete(k)));
        }
      } catch {}

      navigator.serviceWorker
        .register(swUrl, { scope })
        .then((reg) => {
          // Check for updates periodically
          setInterval(() => {
            try { reg.update(); } catch {}
          }, 60 * 60 * 1000);

          // If new SW waiting, prompt user (simple toast via custom event)
          if (reg.waiting) {
            window.dispatchEvent(new CustomEvent('ff:toast', {
              detail: { message: 'Update available — refresh to apply', action: 'Refresh', onAction: () => window.location.reload() }
            }));
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('ff:toast', {
                  detail: { message: 'Update available — refresh to apply', action: 'Refresh', onAction: () => window.location.reload() }
                }));
              }
            });
          });

          // Listen for messages (e.g. queue updates from SW)
          navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'queue-changed') {
              window.dispatchEvent(new Event('ff:queue-changed'));
            }
          });
        })
        .catch(() => { /* silent */ });
    });
  }, []);

  return null;
}
