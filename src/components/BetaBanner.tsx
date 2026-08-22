'use client';

import { useState, useEffect } from 'react';
import { X, Rocket, WifiOff } from 'lucide-react';

const BANNER_KEY = 'ff_beta_banner_hide_b9_5';

export default function BetaBanner() {
  const [hidden, setHidden] = useState(true);
  const [zen, setZen] = useState(false);
  const [online, setOnline] = useState(true);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const syncMobile = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    syncMobile();
    window.addEventListener('resize', syncMobile);

    const v = localStorage.getItem(BANNER_KEY);
    if (v !== '1') setHidden(false);

    const syncZen = () => setZen(document.documentElement.classList.contains('ff-zen'));
    syncZen();
    window.addEventListener('ff:zen-changed', syncZen);

    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    return () => {
      window.removeEventListener('resize', syncMobile);
      window.removeEventListener('ff:zen-changed', syncZen);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Phones already have tight vertical space and a bottom navigation bar. The
  // beta announcement was forcing the app into a clipped/static viewport on
  // every tap/route change, so it is desktop/tablet-only now.
  if (hidden || zen || isMobile) return null;

  return (
    <div className="hidden md:flex bg-gradient-to-r from-brand via-indigo-600 to-violet-600 text-white text-sm py-2 px-4 items-center justify-center gap-3 relative z-40 overflow-hidden">
      <Rocket className="w-4 h-4 animate-pulse shrink-0" />
      <span className="font-bold shrink-0">FreightFlow BETA 9.5 "Customer Portal" 🇲🇬</span>
      <span className="text-white/90 truncate min-w-0">
        — External customer portal · Magic links · One-click quote accept · Document approvals · Mobile-first portal
      </span>
      {!online && (
        <span className="inline-flex items-center gap-1 bg-rose-500/80 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse shrink-0">
          <WifiOff className="w-3 h-3" /> OFFLINE
        </span>
      )}
      <button
        onClick={() => { setHidden(true); localStorage.setItem(BANNER_KEY, '1'); }}
        className="ml-1 hover:bg-white/20 rounded p-1 shrink-0"
        title="Dismiss"
        aria-label="Dismiss beta banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
