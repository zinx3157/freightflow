'use client';

import { basePath } from './basePath';

// Returns an absolute URL honoring GitHub Pages basePath.
// Used for share links, portal links, and "open in new tab" URLs
// so they work on both localhost (no basePath) and
// zinx3157.github.io/freightflow (basePath = /freightflow).
export function appUrl(path = '/'): string {
  if (typeof window === 'undefined') return path;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  const fallbackBasePath = window.location.pathname.startsWith('/freightflow') ? '/freightflow' : '';
  const bp = basePath || fallbackBasePath;
  return `${window.location.origin}${bp}${cleanPath}`;
}
