'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { useEffect, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: any;
  badge?: string;
  perm?: string;
};

type NavSection = {
  title: string;
  icon?: any;
  items: NavItem[];
};

// Logical workflow-based navigation matching a forwarder's actual process:
//   DASHBOARD → QUOTE → OPERATIONS (AIR/SEA/CUSTOMS/TRUCKING) → WAREHOUSE/YARD → COMMERCIAL (CUSTOMERS/INVOICES) → INSIGHTS
const SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'viewDashboard' },
      { href: '/map', label: 'Live Map', icon: Globe, badge: 'AI', perm: 'viewMap' },
    ],
  },
  {
    title: 'Sell & Quote',
    icon: Sparkles,
    items: [
      { href: '/quotes', label: 'Quotes', icon: FileText, perm: 'viewQuotes' },
      { href: '/rates', label: 'Rate Cards', icon: Calculator, badge: 'NEW', perm: 'viewQuotes' },
      { href: '/customers', label: 'Customers', icon: Users, perm: 'viewCustomers' },
      { href: '/benchmark', label: 'CW Benchmark', icon: Award, badge: 'NEW', perm: 'viewBenchmark' },
    ],
  },
  {
    title: 'Operations',
    icon: Workflow,
    items: [
      { href: '/shipments', label: 'All Shipments', icon: Package, perm: 'viewShipments' },
      { href: '/shipments/?mode=air', label: 'Air Freight (AWB)', icon: Plane, perm: 'viewAir' },
      { href: '/shipments/?mode=sea', label: 'Sea Freight (FCL/LCL)', icon: Ship, perm: 'viewSea' },
      { href: '/customs', label: 'Customs Clearance', icon: ShieldCheck, perm: 'viewCustoms' },
      { href: '/trucking', label: 'Trucking & Dispatch', icon: Truck, perm: 'viewTrucking' },
    ],
  },
  {
    title: 'Warehousing',
    items: [
      { href: '/warehouse', label: 'Warehouse (WMS/CFS)', icon: Warehouse, badge: 'NEW', perm: 'viewWarehouse' },
      { href: '/yard', label: 'Container Yard', icon: Grid3x3, badge: 'CY', perm: 'viewWarehouse' },
      { href: '/driver', label: 'Driver POD App', icon: Smartphone, badge: '📱', perm: 'viewDriverApp' },
    ],
  },
  {
    title: 'Commercial',
    items: [
      { href: '/invoices', label: 'Invoices & Billing', icon: Receipt, perm: 'viewInvoices' },
      { href: '/emails', label: 'Email Center', icon: Mail, badge: 'NEW', perm: 'sendEmails' },
      { href: '/approvals', label: 'Approvals', icon: FileCheck2, badge: '!', perm: 'viewApprovals' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/reports', label: 'Reports & Analytics', icon: BarChart3, perm: 'viewReports' },
      { href: '/tracking', label: 'Track & Trace', icon: Search },
    ],
  },
];

const PERMS = {
  admin: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true, viewApprovals: true },
  operations: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true, viewApprovals: true },
  sales: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: false, viewDriverApp: false, viewApprovals: true },
  customs: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewCustomers: true, viewWarehouse: true, viewDriverApp: false, viewApprovals: true },
  driver: { viewTrucking: true, viewDriverApp: true, viewWarehouse: false, viewApprovals: false },
};

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Body scroll lock
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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

  const content = (
    <>
      <div className="px-5 py-5 border-b border-white/10 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={onCloseMobile}>
          <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight tracking-tight">FreightFlow</div>
            <div className="text-[10px] text-white/60 uppercase tracking-[0.15em]">Logistics OS · B9.3</div>
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
          return (
            <div
              key={section.title}
              className={`mb-4 transition-all duration-300 ease-out ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
              style={{ transitionDelay: `${sIdx * 40}ms` }}
            >
              <div className="px-5 mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                {section.icon && <section.icon className="w-3 h-3" />}
                {section.title}
              </div>
              <div className="px-3 space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        'ff-nav-item group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium relative',
                        active
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-amber-300 to-amber-500" />
                      )}
                      <Icon className={cn('w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110', active && 'text-amber-200')} />
                      <span className="flex-1 truncate">{item.label}</span>
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
            <div className="hidden md:block">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">⌘K</kbd> anywhere to search</div>
            <div className="md:hidden">Tap the 🔍 button to search shipments</div>
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
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px] shadow-emerald-400/50 ff-glow-emerald" title="Online" />
          </div>
        )}
      </div>
    </>
  );

  // Mobile drawer
  if (mobileOpen !== undefined) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <aside className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col shadow-2xl md:hidden ff-drawer-enter">
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col border-r border-white/10 dark:border-slate-800 hidden md:flex">
      {content}
    </aside>
  );
}

export const SIDEBAR_PERMS = PERMS;
