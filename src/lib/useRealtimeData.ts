'use client';

import { useEffect, useState } from 'react';
import { db } from './store';
import type { DB } from './store';

/**
 * Hook that returns the latest DB snapshot and re-renders whenever any
 * store operation fires an `ff:data-changed` event. This makes all pages
 * stay in sync in real time, like CargoWise but without needing a backend.
 */
export function useRealtimeData(): { data: DB | null; refresh: () => void } {
  const [data, setData] = useState<DB | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(db.getAll());
  }, []);

  useEffect(() => {
    const refresh = () => {
      setData(db.getAll());
      setTick((t) => t + 1);
    };
    window.addEventListener('ff:data-changed', refresh);
    window.addEventListener('storage', refresh);
    // Poll every 30s as a safety net (cross-tab sync)
    const iv = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener('ff:data-changed', refresh);
      window.removeEventListener('storage', refresh);
      clearInterval(iv);
    };
  }, []);

  return { data, refresh: () => setData(db.getAll()) };
}
