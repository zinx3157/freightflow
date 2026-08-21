'use client';

import { useState, useEffect } from 'react';
import { X, Flame, Rocket } from 'lucide-react';

export default function BetaBanner() {
  const [hidden, setHidden] = useState(true);
  const [zen, setZen] = useState(false);
  useEffect(() => {
    const v = localStorage.getItem('ff_beta_banner_hide');
    if (v !== '1') setHidden(false);
    const sync = () => setZen(document.documentElement.classList.contains('ff-zen'));
    sync();
    window.addEventListener('ff:zen-changed', sync);
    return () => window.removeEventListener('ff:zen-changed', sync);
  }, []);
  if (hidden || zen) return null;
  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-sm py-2 px-4 flex items-center justify-center gap-3 relative z-40">
      <Rocket className="w-4 h-4 animate-pulse" />
      <span className="font-semibold">FreightFlow BETA 7</span>
      <span className="hidden sm:inline text-white/90">
        — Try WMS, multi-leg routing, two-way inbox, driver POD app, ASYCUDA XML export, customer portal chat, yard management, EN/FR/MG language toggle
      </span>
      <span className="sm:hidden text-white/90">WMS · Inbox · Driver POD · Yard · FR/MG</span>
      <button
        onClick={() => { setHidden(true); localStorage.setItem('ff_beta_banner_hide', '1'); }}
        className="ml-2 hover:bg-white/20 rounded p-1"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
