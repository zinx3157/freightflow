'use client';

import { useEffect } from 'react';

// Registers the PWA service worker after the app has loaded.
// Gracefully no-ops in unsupported browsers or dev/preview envs.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol === 'file:') return;
    // Don't register on localhost dev (avoids caching stale Turbopack chunks during dev)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* quiet: unsupported env, preview sandbox without SW scope, etc. */
      });
    });
  }, []);

  return null;
}
