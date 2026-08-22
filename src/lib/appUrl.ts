'use client';

// Returns an absolute URL honoring GitHub Pages basePath.
// Used for share links, portal links, and "open in new tab" URLs
// so they work on both localhost (no basePath) and
// zinx3157.github.io/freightflow (basePath = /freightflow).
export function appUrl(path = '/'): string {
  if (typeof window === 'undefined') return path;
  // read basePath from Next.js runtime where possible
  // NEXT_PUBLIC_BASE_PATH is injected at build time via next.config.ts
  const bp =
    (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ||
    // Fallback: sniff from the deployed base if we're in an iframe/on gh-pages
    (window.location.pathname.startsWith('/freightflow') ? '/freightflow' : '');
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${window.location.origin}${bp}${cleanPath}`;
}
