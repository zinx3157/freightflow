'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Cloud } from 'lucide-react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Count queued offline ops (service worker stores them in a queue we increment locally)
  useEffect(() => {
    const refresh = () => {
      try {
        const q = parseInt(localStorage.getItem('ff_offline_queue_count') || '0', 10);
        setQueued(q);
      } catch { setQueued(0); }
    };
    refresh();
    window.addEventListener('ff:queue-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('ff:queue-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [online]);

  if (online && queued === 0) return null;

  return (
    <div
      className={`sticky top-0 z-40 w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
        online ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800'
               : 'bg-rose-600 text-white'
      }`}
    >
      {online ? (
        <>
          <Cloud className="w-3.5 h-3.5" />
          Back online — syncing {queued} queued {queued === 1 ? 'change' : 'changes'}…
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 ff-offline-dot" />
          You're offline. Changes are saved locally and will sync when reconnected.
        </>
      )}
    </div>
  );
}
