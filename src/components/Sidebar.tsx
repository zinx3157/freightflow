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
  Settings,
  Award,
  Globe,
  Mail,
  Calculator,
  Warehouse,
  Smartphone,
  Grid3x3,
  FileCheck2,
  X,
} from 'lucide-react';
import { useAuth, roleLabel } from './AuthProvider';
import { useEffect } from 'react';

type NavItem = { href: string; label: string; icon: any; badge?: string; perm?: string };

const ALL_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'viewDashboard' },
  { href: '/map', label: 'Live Map', icon: Globe, badge: 'AI', perm: 'viewMap' },
  { href: '/shipments', label: 'Shipments', icon: Package, perm: 'viewShipments' },
  { href: '/shipments/?mode=air', label: 'Air Freight', icon: Plane, perm: 'viewAir' },
  { href: '/shipments/?mode=sea', label: 'Sea Freight', icon: Ship, perm: 'viewSea' },
  { href: '/customs', label: 'Customs', icon: ShieldCheck, perm: 'viewCustoms' },
  { href: '/trucking', label: 'Trucking', icon: Truck, perm: 'viewTrucking' },
  { href: '/warehouse', label: 'Warehouse (WMS)', icon: Warehouse, badge: 'NEW', perm: 'viewWarehouse' },
  { href: '/yard', label: 'Container Yard', icon: Grid3x3, badge: 'BETA', perm: 'viewWarehouse' },
  { href: '/driver', label: 'Driver POD App', icon: Smartphone, badge: '📱', perm: 'viewDriverApp' },
  { href: '/customers', label: 'Customers', icon: Users, perm: 'viewCustomers' },
  { href: '/quotes', label: 'Quotes', icon: FileText, perm: 'viewQuotes' },
  { href: '/rates', label: 'Rate Cards', icon: Calculator, badge: 'NEW', perm: 'viewQuotes' },
  { href: '/invoices', label: 'Invoices', icon: Receipt, perm: 'viewInvoices' },
  { href: '/reports', label: 'Reports', icon: BarChart3, perm: 'viewReports' },
  { href: '/tracking', label: 'Track & Trace', icon: Search },
  { href: '/emails', label: 'Email Center', icon: Mail, badge: 'NEW', perm: 'sendEmails' },
  { href: '/approvals', label: 'Approvals', icon: FileCheck2, badge: 'B9', perm: 'viewApprovals' },
  { href: '/benchmark', label: 'CW Benchmark', icon: Award, badge: 'NEW', perm: 'viewBenchmark' },
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

  const nav = ALL_NAV.filter((n) => {
    if (!n.perm) return true;
    if (!user) return false;
    return user.role === 'admin' || (PERMS as any)[user.role]?.[n.perm] === true;
  });

  // Close drawer on route change
  useEffect(() => {
    if (mobileOpen && onCloseMobile) onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const content = (
    <>
      <div className="px-6 py-5 border-b border-white/10 dark:border-slate-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" onClick={onCloseMobile}>
          <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">FreightFlow</div>
            <div className="text-[10px] text-white/60 uppercase tracking-widest">Logistics OS · Beta 9</div>
          </div>
        </Link>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 overscroll-contain">
        <div className="px-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const href = item.href.split('?')[0];
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-white/15 text-white shadow-inner'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badge === 'AI' ? 'bg-violet-400 text-violet-950' :
                    item.badge === '📱' ? 'bg-amber-300 text-amber-950' :
                    item.badge === 'B9' ? 'bg-rose-400 text-rose-950' :
                    'bg-emerald-400 text-emerald-950'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="px-3 mt-6">
          <div className="px-3 py-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Keyboard shortcut</div>
            <div className="text-xs text-white/80 hidden md:block">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">⌘K</kbd> anywhere to search & run commands</div>
            <div className="text-xs text-white/80 md:hidden">Tap the 🔍 icon to search shipments & run commands</div>
          </div>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-white/10 dark:border-slate-800 space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/10 hover:text-white transition-colors">
          <Settings className="w-[18px] h-[18px]" /> Settings
        </button>
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${user.avatarColor} flex items-center justify-center font-semibold text-sm ring-2 ring-white/10 shrink-0`}>
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-[11px] text-white/60 truncate">{roleLabel(user.role)}</div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Online" />
          </div>
        )}
      </div>
    </>
  );

  // Mobile drawer: renders absolutely with backdrop
  if (mobileOpen !== undefined) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 ff-backdrop-enter md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <aside className="fixed inset-y-0 left-0 z-50 w-[85%] max-w-xs bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col shadow-2xl ff-drawer-enter md:hidden">
          {content}
        </aside>
      </>
    );
  }

  // Desktop sidebar: hidden on mobile
  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col border-r border-white/10 dark:border-slate-800 hidden md:flex">
      {content}
    </aside>
  );
}

// Re-export perms for other modules if needed
export const SIDEBAR_PERMS = PERMS;
