'use client';

import { useState, useEffect } from 'react';
import { X, Flame, Rocket, Smartphone, Wifi, WifiOff } from 'lucide-react';

export default function BetaBanner() {
  const [hidden, setHidden] = useState(true);
  const [zen, setZen] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem('ff_beta_banner_hide_b9_4');
    if (v !== '1') setHidden(false);
    const sync = () => setZen(document.documentElement.classList.contains('ff-zen'));
    sync();
    window.addEventListener('ff:zen-changed', sync);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('ff:zen-changed', sync);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (hidden || zen) return null;
  return (
    <div className="bg-gradient-to-r from-brand via-indigo-600 to-violet-600 text-white text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center justify-center gap-2 sm:gap-3 relative z-40">
      <Rocket className="w-4 h-4 animate-pulse shrink-0" />
      <span className="font-bold shrink-0">FreightFlow BETA 9.4 "Mobile Pro" 🇲🇬</span>
      <span className="hidden sm:inline text-white/90">
        — 📸 Real camera POD · 🗺️ Google/Waze Navigate · 🔔 Web Push · 🧾 OOBO RSA e-invoices · 🏢 Multi-company · 💹 Profitability drill-down · 🔄 Realtime sync
      </span>
      <span className="sm:hidden text-white/90 flex items-center gap-1">
        <Smartphone className="w-3 h-3" /> Camera · Nav · Push
      </span>
      {!online && (
        <span className="inline-flex items-center gap-1 bg-rose-500/80 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
          <WifiOff className="w-3 h-3" /> OFFLINE
        </span>
      )}
      <button
        onClick={() => { setHidden(true); localStorage.setItem('ff_beta_banner_hide_b9_4', '1'); }}
        className="ml-1 hover:bg-white/20 rounded p-1 shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
