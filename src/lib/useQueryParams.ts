'use client';

import { useEffect, useState } from 'react';

/**
 * Simple hook to read URL search params from window.location without requiring
 * a Suspense boundary (unlike Next.js's useSearchParams). Works fully client-side.
 */
export function useQueryParams() {
  const [params, setParams] = useState<URLSearchParams>(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  });

  useEffect(() => {
    const handler = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', handler);
    // Also listen to Next.js client-side navigations
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      // @ts-ignore
      const r = origPush.apply(this, args);
      handler();
      return r;
    };
    history.replaceState = function (...args) {
      // @ts-ignore
      const r = origReplace.apply(this, args);
      handler();
      return r;
    };
    return () => {
      window.removeEventListener('popstate', handler);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return params;
}

export function useQueryParam(key: string): string | null {
  const params = useQueryParams();
  return params.get(key);
}
