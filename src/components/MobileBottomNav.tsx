'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Search, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from './I18nProvider';

const TABS = [
  { href: '/', labelKey: 'nav.dashboard', fallback: 'Home', icon: LayoutDashboard },
  { href: '/shipments', labelKey: 'nav.shipments', fallback: 'Shipments', icon: Package },
  { href: '/tracking', labelKey: 'nav.tracking', fallback: 'Track', icon: Search },
];

export default function MobileBottomNav({ onOpenSearch, onOpenMenu }: { onOpenSearch: () => void; onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const lbl = (k: string, fb: string) => { const v = t(k); return v !== k ? v : fb; };

  return (
    <nav
      className="ff-bottom-nav fixed bottom-0 left-0 right-0 z-30 bg-white/96 dark:bg-slate-950/96 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 md:hidden grid grid-cols-4 px-2 h-[64px] shadow-[0_-3px_18px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Mobile navigation"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={cn('flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold', active ? 'text-brand' : 'text-slate-500 dark:text-slate-400')}>
            <Icon className={cn('w-5 h-5', active && 'scale-110')} strokeWidth={active ? 2.5 : 2} />
            <span className="truncate max-w-full px-1">{lbl(tab.labelKey, tab.fallback)}</span>
          </Link>
        );
      })}
      <button onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400" aria-label="More menu">
        <Menu className="w-5 h-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
