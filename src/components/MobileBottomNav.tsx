'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Truck, Search, Plus, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { db } from '@/lib/store';
import { useI18n } from './I18nProvider';

const TABS = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/shipments', labelKey: 'nav.shipments', icon: Package },
  { href: '/trucking', labelKey: 'nav.trucking', icon: Truck },
  { href: '/tracking', labelKey: 'nav.tracking', icon: Search },
];

const LBL: Record<string, { en: string; fr: string; mg: string }> = {
  alerts: { en: 'Alerts', fr: 'Alertes', mg: 'Fampitandremana' },
  menu: { en: 'Menu', fr: 'Menu', mg: 'Sakafo' },
  newShip: { en: 'New shipment', fr: 'Nouvelle expédition', mg: 'Entana vaovao' },
};

export default function MobileBottomNav({ onOpenSearch, onOpenMenu }: { onOpenSearch: () => void; onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useI18n();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try { setUnread(db.unreadNotifCount()); } catch {}
    };
    refresh();
    const iv = setInterval(refresh, 5000);
    const onChange = () => refresh();
    window.addEventListener('ff:data-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      clearInterval(iv);
      window.removeEventListener('ff:data-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const lbl = (k: string) => {
    const v = t(k);
    if (v !== k) return v;
    return (LBL as any)[k]?.[lang] || (LBL as any)[k]?.en || k;
  };

  return (
    <nav
      className="ff-bottom-nav fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden flex items-stretch justify-around px-2 h-[68px] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Primary navigation"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] font-medium py-2 rounded-lg mx-0.5 transition-transform active:scale-95',
              active ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <Icon className={cn('w-5 h-5 transition-transform', active && 'text-brand scale-110')} strokeWidth={active ? 2.5 : 2} />
            <span className="truncate max-w-full px-1">{lbl(tab.labelKey)}</span>
          </Link>
        );
      })}

      {/* Bell / notifications */}
      <button
        onClick={() => window.dispatchEvent(new Event('ff:open-notifs'))}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] font-medium py-2 text-slate-500 dark:text-slate-400 mx-0.5 relative active:scale-95 transition-transform"
        aria-label="Notifications"
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 text-[9px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 ff-pop">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <span>{lbl('alerts')}</span>
      </button>

      {/* Menu */}
      <button
        onClick={onOpenMenu}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] font-medium py-2 text-slate-500 dark:text-slate-400 mx-0.5 active:scale-95 transition-transform"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>{lbl('menu')}</span>
      </button>

      {/* Floating center "New" FAB */}
      <button
        onClick={() => router.push('/shipments?new=1')}
        className="absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg shadow-brand/30 flex items-center justify-center active:scale-95 hover:scale-105 transition-all ff-fab"
        aria-label={lbl('newShip')}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </nav>
  );
}
