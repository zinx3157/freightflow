'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/store';
import {
  Package,
  Plane,
  Ship,
  Truck,
  Users,
  FileText,
  Receipt,
  ShieldCheck,
  BarChart3,
  Search,
  Plus,
  Home,
  Moon,
  Sun,
  Command,
  Bell,
  Trash2,
  Keyboard,
  Globe,
  Mail,
  Calculator,
  Award,
  ExternalLink,
  Warehouse,
  Smartphone,
  Grid3x3,
  Sparkles,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface Action {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords?: string;
  section: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onOpenNewShipment,
}: {
  open: boolean;
  onClose: () => void;
  onOpenNewShipment: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions = useMemo<Action[]>(() => {
    const data = (() => {
      try { return db.getAll(); } catch { return null; }
    })();

    const nav: Action[] = [
      { id: 'nav-home', label: 'Go to Dashboard', icon: <Home className="w-4 h-4" />, section: 'Navigation', keywords: 'home dashboard main', run: () => router.push('/') },
      { id: 'nav-shipments', label: 'Go to Shipments', icon: <Package className="w-4 h-4" />, section: 'Navigation', keywords: 'cargo booking freight', run: () => router.push('/shipments') },
      { id: 'nav-air', label: 'Go to Air Freight', icon: <Plane className="w-4 h-4" />, section: 'Navigation', keywords: 'air cargo awb', run: () => router.push('/shipments?mode=air') },
      { id: 'nav-sea', label: 'Go to Sea Freight', icon: <Ship className="w-4 h-4" />, section: 'Navigation', keywords: 'ocean container fcl lcl', run: () => router.push('/shipments?mode=sea') },
      { id: 'nav-customs', label: 'Go to Customs', icon: <ShieldCheck className="w-4 h-4" />, section: 'Navigation', keywords: 'clearance broker duty', run: () => router.push('/customs') },
      { id: 'nav-trucking', label: 'Go to Trucking', icon: <Truck className="w-4 h-4" />, section: 'Navigation', keywords: 'dispatch driver inland', run: () => router.push('/trucking') },
      { id: 'nav-customers', label: 'Go to Customers', icon: <Users className="w-4 h-4" />, section: 'Navigation', keywords: 'clients crm', run: () => router.push('/customers') },
      { id: 'nav-quotes', label: 'Go to Quotes', icon: <FileText className="w-4 h-4" />, section: 'Navigation', keywords: 'quotation rate', run: () => router.push('/quotes') },
      { id: 'nav-invoices', label: 'Go to Invoices', icon: <Receipt className="w-4 h-4" />, section: 'Navigation', keywords: 'billing payment', run: () => router.push('/invoices') },
      { id: 'nav-reports', label: 'Go to Reports', icon: <BarChart3 className="w-4 h-4" />, section: 'Navigation', keywords: 'analytics kpi', run: () => router.push('/reports') },
      { id: 'nav-tracking', label: 'Go to Track & Trace', icon: <Search className="w-4 h-4" />, section: 'Navigation', keywords: 'track bl awb', run: () => router.push('/tracking') },
      { id: 'nav-map', label: 'Go to Live Map', icon: <Globe className="w-4 h-4" />, section: 'Navigation', keywords: 'live map vessels flights', run: () => router.push('/map') },
      { id: 'nav-emails', label: 'Go to Email Center', icon: <Mail className="w-4 h-4" />, section: 'Navigation', keywords: 'email tracking opens clicks inbox two-way', run: () => router.push('/emails') },
      { id: 'nav-rates', label: 'Go to Rate Cards', icon: <Calculator className="w-4 h-4" />, section: 'Navigation', keywords: 'rates buy sell tariff quote', run: () => router.push('/rates') },
      { id: 'nav-warehouse', label: 'Go to Warehouse (WMS)', icon: <Warehouse className="w-4 h-4" />, section: 'Navigation', keywords: 'wms cfs whr receipt cargo stuff strip', run: () => router.push('/warehouse') },
      { id: 'nav-driver', label: 'Open Driver POD App', icon: <Smartphone className="w-4 h-4" />, section: 'Navigation', keywords: 'driver mobile pod proof delivery signature', run: () => router.push('/driver') },
      { id: 'nav-yard', label: 'Go to Container Yard', icon: <Grid3x3 className="w-4 h-4" />, section: 'Navigation', keywords: 'yard slots dwell gate moves terminal toamasina', run: () => router.push('/yard') },
      { id: 'nav-rates-shopper', label: 'AI Spot Rate Shopper', icon: <Sparkles className="w-4 h-4" />, section: 'Navigation', keywords: 'spot quote rates shop carrier compare', run: () => router.push('/rates') },
      { id: 'nav-benchmark', label: 'FreightFlow vs CargoWise', icon: <Award className="w-4 h-4" />, section: 'Navigation', keywords: 'compare cargowise benchmark', run: () => router.push('/benchmark') },
      { id: 'nav-quote-form', label: 'Open public quote form', icon: <ExternalLink className="w-4 h-4" />, section: 'Navigation', keywords: 'public customer quote form', run: () => window.open('/get-quote', '_blank') },
    ];

    const quick: Action[] = [
      { id: 'act-new-shipment', label: 'New Shipment…', icon: <Plus className="w-4 h-4" />, section: 'Actions', keywords: 'create book add cargo', run: () => { onClose(); onOpenNewShipment(); } },
      { id: 'act-new-quote', label: 'New Quote…', icon: <Plus className="w-4 h-4" />, section: 'Actions', run: () => { onClose(); router.push('/quotes?new=1'); } },
      { id: 'act-new-invoice', label: 'New Invoice…', icon: <Plus className="w-4 h-4" />, section: 'Actions', run: () => { onClose(); router.push('/invoices?new=1'); } },
      { id: 'act-new-trucking', label: 'New Truck Dispatch…', icon: <Plus className="w-4 h-4" />, section: 'Actions', run: () => { onClose(); router.push('/trucking?new=1'); } },
      { id: 'act-theme', label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, section: 'Actions', keywords: 'theme dark mode night', run: toggle },
      { id: 'act-reset', label: 'Reset Demo Data', icon: <Trash2 className="w-4 h-4" />, section: 'Actions', keywords: 'clear reset seed', run: () => { if (confirm('Reset demo data?')) { db.reset(); location.reload(); } } },
    ];

    const results: Action[] = [...quick, ...nav];

    if (data && q.trim().length >= 1) {
      const qq = q.toLowerCase().trim();
      // Shipment refs & BL/AWB
      data.shipments.forEach((s) => {
        if (
          s.reference.toLowerCase().includes(qq) ||
          s.customerName.toLowerCase().includes(qq) ||
          s.mawbOrBl.toLowerCase().includes(qq) ||
          s.vesselOrFlight.toLowerCase().includes(qq) ||
          s.commodity.toLowerCase().includes(qq)
        ) {
          results.push({
            id: `sh-${s.id}`,
            label: s.reference,
            subtitle: `${s.customerName} · ${s.portOfLoading} → ${s.portOfDischarge}`,
            icon: s.mode === 'air' ? <Plane className="w-4 h-4" /> : <Ship className="w-4 h-4" />,
            section: 'Shipments',
            run: () => { onClose(); router.push(`/shipments/?id=${s.id}`); },
          });
        }
      });
      // Customers
      data.customers.forEach((c) => {
        if (c.name.toLowerCase().includes(qq) || c.contactPerson.toLowerCase().includes(qq)) {
          results.push({
            id: `cu-${c.id}`,
            label: c.name,
            subtitle: `Customer · ${c.country} · ${c.email}`,
            icon: <Users className="w-4 h-4" />,
            section: 'Customers',
            run: () => { onClose(); router.push('/customers'); },
          });
        }
      });
    }

    if (!q.trim()) return results;
    return results.filter((a) => {
      const hay = `${a.label} ${a.subtitle || ''} ${a.keywords || ''}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, router, theme, toggle, onClose, onOpenNewShipment]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const groups = useMemo(() => {
    const g: Record<string, Action[]> = {};
    actions.forEach((a) => {
      g[a.section] = g[a.section] || [];
      g[a.section].push(a);
    });
    return g;
  }, [actions]);

  const flatActions = actions;

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, flatActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flatActions[active]?.run();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatActions, active, onClose]
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Command className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search shipments, customers, navigate, run actions…"
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {flatActions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No results for "{q}"</div>
          ) : (
            Object.entries(groups).map(([section, items]) => (
              <div key={section} className="mb-2">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 px-2 py-1">
                  {section}
                </div>
                {items.map((a) => {
                  const idx = flatActions.indexOf(a);
                  const isActive = idx === active;
                  return (
                    <button
                      key={a.id}
                      data-idx={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={a.run}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-brand text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>{a.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{a.label}</span>
                        {a.subtitle && (
                          <span className={`block text-xs truncate ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                            {a.subtitle}
                          </span>
                        )}
                      </span>
                      {isActive && <span className="text-[10px] text-white/80 font-mono">↵</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">⌘K</kbd> open</span>
        </div>
      </div>
    </div>
  );
}

export function NotificationsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setData(db.getAll());
    }
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  if (!open || !data) return null;

  const unread = data.activities.slice(0, 12);
  const issues = data.shipments.filter((s: any) => {
    const overdue = s.status !== 'delivered' && new Date(s.eta) < new Date();
    return overdue || s.customsStatus === 'rejected' || s.customsStatus === 'inspection';
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-4 top-16 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </div>
            <div className="text-xs text-slate-500">{issues.length} shipments need attention</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">×</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {issues.length > 0 && (
            <div className="p-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-rose-600 px-2 py-1">⚠ Action Required</div>
              {issues.slice(0, 4).map((s: any) => (
                <div key={s.id} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-white">{s.reference}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {s.customsStatus === 'rejected'
                          ? 'Customs rejected — immediate action'
                          : s.customsStatus === 'inspection'
                          ? 'Customs inspection in progress'
                          : `ETA passed (${s.eta}) — verify status`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1">Recent Activity</div>
            {unread.map((a: any) => (
              <div key={a.id} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="text-sm text-slate-700 dark:text-slate-200">{a.message}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(a.timestamp).toLocaleString()} · {a.reference}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title="Toggle theme (⌘/Ctrl+J)"
      className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
