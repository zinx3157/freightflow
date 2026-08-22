'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Plane,
  Ship,
  ShieldCheck,
  Truck,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Search,
  Award,
  Globe,
  Mail,
  Calculator,
  Warehouse,
  Smartphone,
  Grid3x3,
  FileCheck2,
  X,
  ChevronRight,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { useAuth, roleLabel } from './AuthProvider';
import { useI18n } from './I18nProvider';
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  labelKey: string;
  icon: any;
  badge?: string;
  perm?: string;
};

type NavSection = {
  titleKey: string;
  icon?: any;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    titleKey: 'sec_overview',
    items: [
      { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, perm: 'viewDashboard' },
      { href: '/map', labelKey: 'nav.livemap', icon: Globe, badge: 'AI', perm: 'viewMap' },
    ],
  },
  {
    titleKey: 'sec_sell',
    icon: Sparkles,
    items: [
      { href: '/quotes', labelKey: 'nav.quotes', icon: FileText, perm: 'viewQuotes' },
      { href: '/rates', labelKey: 'nav.rates', icon: Calculator, badge: 'NEW', perm: 'viewQuotes' },
      { href: '/customers', labelKey: 'nav.customers', icon: Users, perm: 'viewCustomers' },
      { href: '/benchmark', labelKey: 'nav.benchmark', icon: Award, badge: 'NEW', perm: 'viewBenchmark' },
    ],
  },
  {
    titleKey: 'sec_ops',
    icon: Workflow,
    items: [
      { href: '/shipments', labelKey: 'nav.shipments', icon: Package, perm: 'viewShipments' },
      { href: '/shipments/?mode=air', labelKey: 'nav.air', icon: Plane, perm: 'viewAir' },
      { href: '/shipments/?mode=sea', labelKey: 'nav.sea', icon: Ship, perm: 'viewSea' },
      { href: '/customs', labelKey: 'nav.customs', icon: ShieldCheck, perm: 'viewCustoms' },
      { href: '/trucking', labelKey: 'nav.trucking', icon: Truck, perm: 'viewTrucking' },
    ],
  },
  {
    titleKey: 'sec_whs',
    items: [
      { href: '/warehouse', labelKey: 'nav.warehouse', icon: Warehouse, badge: 'NEW', perm: 'viewWarehouse' },
      { href: '/yard', labelKey: 'nav.yard', icon: Grid3x3, badge: 'CY', perm: 'viewWarehouse' },
      { href: '/driver', labelKey: 'nav.driver', icon: Smartphone, badge: '📱', perm: 'viewDriverApp' },
    ],
  },
  {
    titleKey: 'sec_comm',
    items: [
      { href: '/invoices', labelKey: 'nav.invoices', icon: Receipt, perm: 'viewInvoices' },
      { href: '/emails', labelKey: 'nav.emails', icon: Mail, badge: 'NEW', perm: 'sendEmails' },
      { href: '/approvals', labelKey: 'nav.approvals', icon: FileCheck2, badge: '!', perm: 'viewApprovals' },
    ],
  },
  {
    titleKey: 'sec_insights',
    items: [
      { href: '/reports', labelKey: 'nav.reports', icon: BarChart3, perm: 'viewReports' },
      { href: '/tracking', labelKey: 'nav.tracking', icon: Search },
    ],
  },
];

const SECTION_LABELS: Record<string, { en: string; fr: string; mg: string }> = {
  sec_overview: { en: 'Overview', fr: 'Vue d\'ensemble', mg: 'Topi-maso' },
  sec_sell: { en: 'Sell & Quote', fr: 'Vente & Devis', mg: 'Varotra & Tombana' },
  sec_ops: { en: 'Operations', fr: 'Opérations', mg: 'Asa fanaterana' },
  sec_whs: { en: 'Warehousing', fr: 'Entreposage', mg: 'Trano fitehirizana' },
  sec_comm: { en: 'Commercial', fr: 'Commercial', mg: 'Arah-barotra' },
  sec_insights: { en: 'Insights', fr: 'Analyses', mg: 'Fanadihadiana' },
};

// Extra nav keys not yet in i18n.ts dictionary
const EXTRA: Record<string, { en: string; fr: string; mg: string }> = {
  'nav.yard': { en: 'Container Yard', fr: 'Yard à Conteneurs', mg: 'Toeram-pitahirizana' },
  'nav.approvals': { en: 'Approvals', fr: 'Approbations', mg: 'Fanekena' },
  'nav.reports': { en: 'Reports & Analytics', fr: 'Rapports & Analytics', mg: 'Tatitra & Antontanisa' },
  'common.keyboard_hint': { en: 'Press ⌘K anywhere to search', fr: 'Appuyez sur ⌘K pour rechercher', mg: 'Tsindrio ⌘K raha hitady' },
  'common.keyboard_hint_mob': { en: 'Tap 🔍 to search shipments', fr: 'Appuyez sur 🔍 pour rechercher', mg: 'Tsindrio 🔍 raha hitady' },
  'common.online': { en: 'Online', fr: 'En ligne', mg: 'Mifandray' },
};

const PERMS = {
  admin: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true, viewApprovals: true },
  operations: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true, viewApprovals: true },
  sales: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: false, viewDriverApp: false, viewApprovals: true },
  customs: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewCustomers: true, viewWarehouse: true, viewDriverApp: false, viewApprovals: true },
  driver: { viewTrucking: true, viewDriverApp: true, viewWarehouse: false, viewApprovals: false },
};

function tr(t: (k: string) => string, key: string): string {
  const v = t(key);
  if (v && v !== key) return v;
  const extra = (EXTRA as any)[key];
  if (extra) return extra[t('') ? 'en' : 'en']; // fallback; below we resolve properly
  return key;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(tm);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Mobile menu is a lightweight floating strip, not a modal drawer, so keep
  // the page scroll free. This prevents the menu from feeling like a stuck layer
  // on phones.
  useEffect(() => {
    document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isMobileDrawer = mobileOpen !== undefined;

  const closeMobileDrawer = () => {
    if (!onCloseMobile) return;
    onCloseMobile();
    // Ensure scroll is released immediately even before React effects run.
    document.body.style.overflow = '';
  };

  const navigateFromMobileDrawer = (href: string, e?: React.MouseEvent) => {
    if (!isMobileDrawer) return;
    e?.preventDefault();
    closeMobileDrawer();
    // Push after the close state has been queued so the blue drawer disappears
    // immediately on phones instead of staying over the new page.
    setTimeout(() => router.push(href), 0);
  };

  const isActive = (href: string) => {
    const base = href.split('?')[0];
    if (base === '/') return pathname === '/';
    return pathname === base || pathname?.startsWith(base + '/');
  };

  const canSee = (perm?: string) => {
    if (!perm) return true;
    if (!user) return false;
    return user.role === 'admin' || (PERMS as any)[user.role]?.[perm] === true;
  };

  const tt = (key: string): string => {
    const v = t(key);
    return v !== key ? v : key;
  };

  const content = (
    <>
      <div className="px-5 py-5 border-b border-white/10 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={(e) => navigateFromMobileDrawer('/', e)}>
          <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight tracking-tight">FreightFlow</div>
            <div className="text-[10px] text-white/60 uppercase tracking-[0.15em]">Logistics OS · B9.5</div>
          </div>
        </Link>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 overscroll-contain scrollbar-thin">
        {SECTIONS.map((section, sIdx) => {
          const visibleItems = section.items.filter(it => canSee(it.perm));
          if (visibleItems.length === 0) return null;
          const SecIcon = section.icon;
          return (
            <div
              key={section.titleKey}
              className={`mb-4 transition-all duration-300 ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
              style={{ transitionDelay: `${sIdx * 40}ms` }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                {SecIcon && <SecIcon className="w-3 h-3" />}
                {tt(`sec.${section.titleKey.replace('sec_', '')}`)}
              </div>
              <div className="px-3 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const label = tt(item.labelKey);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => navigateFromMobileDrawer(item.href, e)}
                      className={cn(
                        'ff-nav-item group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium relative',
                        active
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {active && (
                        <span className="ff-nav-active-bar absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-amber-300 to-amber-500" />
                      )}
                      <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110', active && 'text-amber-200')} />
                      <span className="flex-1 truncate">{label}</span>
                      {item.badge && (
                        <span className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                          item.badge === 'AI' ? 'bg-violet-400 text-violet-950' :
                          item.badge === '📱' ? 'bg-amber-300 text-amber-950' :
                          item.badge === '!' ? 'bg-rose-400 text-rose-950 animate-pulse' :
                          'bg-emerald-400 text-emerald-950'
                        )}>
                          {item.badge}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3.5 h-3.5 text-white/60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="px-4 mt-2">
          <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Keyboard</div>
            <div className="hidden md:block">{tt('common.keyboard_hint')}</div>
            <div className="md:hidden">{tt('common.keyboard_hint_mob')}</div>
          </div>
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/10 dark:border-slate-800 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-semibold text-sm ring-2 ring-white/10 shrink-0`}>
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name}</div>
              <div className="text-[11px] text-white/60 truncate">{roleLabel(user.role)}</div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px] shadow-emerald-400/50 ff-glow-emerald" title={tt('common.online')} />
          </div>
        )}
      </div>
    </>
  );

  // Mobile menu: ultra-light phone strip. No drawer, no backdrop, no
  // scroll lock. It floats just above the bottom tabs and uses almost no screen
  // space; tapping any item closes it immediately.
  if (mobileOpen !== undefined) {
    const mobileItems = SECTIONS.flatMap(section => section.items).filter(it => canSee(it.perm));
    return mobileOpen ? (
      <div
        className="fixed left-2 right-2 bottom-[calc(76px+var(--safe-bottom))] z-50 md:hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-lg p-2"
        role="dialog"
        aria-label="Quick mobile navigation"
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-10">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const label = tt(item.labelKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => navigateFromMobileDrawer(item.href, e)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border min-h-[42px]',
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-800'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-brand')} />
                <span className="whitespace-nowrap max-w-[7rem] truncate">{label}</span>
              </Link>
            );
          })}
        </div>
        <button
          onClick={closeMobileDrawer}
          className="absolute right-2 top-2 w-9 h-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : null;
  }

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col border-r border-white/10 dark:border-slate-800 hidden md:flex overflow-y-auto">
      {content}
    </aside>
  );
}

export const SIDEBAR_PERMS = PERMS;
