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
} from 'lucide-react';
import { useAuth, roleLabel } from './AuthProvider';

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
  { href: '/benchmark', label: 'CW Benchmark', icon: Award, badge: 'NEW', perm: 'viewBenchmark' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Driver role: redirect homepage to trucking
  const nav = ALL_NAV.filter((n) => {
    if (!n.perm) return true; // public pages like Track & Trace
    if (!user) return false;
    return (user.role === 'admin') || ((PERMS as any)[user.role]?.[n.perm] === true);
  });

  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-brand to-brand-dark dark:from-slate-950 dark:to-slate-900 text-white flex flex-col border-r border-white/10 dark:border-slate-800">
      <div className="px-6 py-5 border-b border-white/10 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">FreightFlow</div>
            <div className="text-[10px] text-white/60 uppercase tracking-widest">Logistics OS</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const href = item.href.split('?')[0];
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-white/15 text-white shadow-inner'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badge === 'AI' ? 'bg-violet-400 text-violet-950' : 'bg-emerald-400 text-emerald-950'}`}>
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
            <div className="text-xs text-white/80">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px]">⌘K</kbd> anywhere to search & run commands</div>
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
    </aside>
  );
}

// Mirror of PERMISSIONS keys to avoid circular import weight; kept in sync
const PERMS = {
  admin: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true },
  operations: { viewDashboard: true, viewMap: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewTrucking: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: true, viewDriverApp: true },
  sales: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustomers: true, viewQuotes: true, viewInvoices: true, viewReports: true, viewBenchmark: true, sendEmails: true, viewWarehouse: false, viewDriverApp: false },
  customs: { viewDashboard: true, viewShipments: true, viewAir: true, viewSea: true, viewCustoms: true, viewCustomers: true, viewWarehouse: true, viewDriverApp: false },
  driver: { viewTrucking: true, viewDriverApp: true, viewWarehouse: false },
};
