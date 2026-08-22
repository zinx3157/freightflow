'use client';

import { Bell, Plus, Search, LogOut, ChevronDown, Users, Maximize2, Minimize2, ExternalLink, Menu, Wifi, Settings, Building2, CircleDot } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui';
import { CommandPalette, NotificationsMenu, ThemeToggle } from './CommandCenter';
import { LanguageToggle } from './LanguageToggle';
import SettingsPanel, { getActiveBranch, getActiveCompany } from './SettingsPanel';
import { db } from '@/lib/store';
import { useAuth, roleLabel } from './AuthProvider';
import { getAllUsers, login as doSwitchUser, ROLE_LABEL } from '@/lib/auth';
import { getSyncConfig, connectRealtime } from '@/lib/realtime';

const isMac = typeof navigator !== 'undefined' ? /Mac|iPhone|iPad/.test(navigator.platform) : false;

const PAGE_META: Record<string, { title: string; subtitle?: string; newHref?: string; newLabel?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your freight operations at a glance' },
  '/map': { title: 'Live Shipment Map', subtitle: 'All active air & sea freight in real time', newHref: '/shipments?new=1', newLabel: 'New Shipment' },
  '/shipments': { title: 'Shipments', subtitle: 'Air & Sea, Import & Export', newHref: '/shipments?new=1', newLabel: 'New Shipment' },
  '/customs': { title: 'Customs Clearance', subtitle: 'Monitor and update customs for all shipments', newHref: '/shipments?new=1', newLabel: 'New Shipment' },
  '/trucking': { title: 'Inland Trucking & Dispatch', subtitle: 'Manage pickups, deliveries and your fleet', newHref: '/trucking?new=1', newLabel: 'New Dispatch' },
  '/customers': { title: 'Customers', subtitle: 'Directory of your clients and partners' },
  '/quotes': { title: 'Quotes', subtitle: 'Issue, track and convert freight quotes', newHref: '/quotes?new=1', newLabel: 'New Quote' },
  '/invoices': { title: 'Invoices & Billing', subtitle: 'Manage customer invoices and payments', newHref: '/invoices?new=1', newLabel: 'New Invoice' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Operational and financial overview' },
  '/tracking': { title: 'Track & Trace', subtitle: 'Real-time shipment visibility for you and your clients' },
  '/benchmark': { title: 'FreightFlow vs CargoWise', subtitle: 'Feature-by-feature competitive benchmark' },
  '/emails': { title: 'Email Center', subtitle: 'Two-way inbox · automated customer communications' },
  '/documents': { title: 'Document Library', subtitle: 'Preview, download, and search generated/uploaded docs' },
  '/rates': { title: 'Rate Cards', subtitle: 'Buy/sell rates across all lanes and carriers' },
  '/warehouse': { title: 'Warehouse (WMS)', subtitle: 'CFS, inbound/outbound, receipts & cargo items' },
  '/approvals': { title: 'Document Approvals', subtitle: 'Approval chains, sign-offs, license expiry alerts' },
  '/driver': { title: 'Driver POD App', subtitle: 'Mobile-first proof-of-delivery capture' },
  '/get-quote': { title: 'Request a Quote', subtitle: 'Public quote form' },
  '/portal': { title: 'Customer Portal', subtitle: 'Live tracking for your clients' },
};

export default function Topbar({ onHamburgerClick }: { onHamburgerClick?: () => void } = {}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [issueCount, setIssueCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'error' | 'checking'>('checking');
  const [activeBranchName, setActiveBranchName] = useState<string>('');

  // Track native browser fullscreen changes
  useEffect(() => {
    function onFs() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Open notifications from mobile bottom nav
  useEffect(() => {
    const openNotifs = () => { setNotifOpen(true); setPaletteOpen(false); };
    window.addEventListener('ff:open-notifs', openNotifs);
    return () => window.removeEventListener('ff:open-notifs', openNotifs);
  }, []);

  // Active branch/company indicator
  useEffect(() => {
    const refresh = () => {
      const b = getActiveBranch(); const c = getActiveCompany();
      setActiveBranchName(b ? `${b.name} · ${c?.shortName || ''}` : (c?.shortName || ''));
    };
    refresh();
    window.addEventListener('ff:company-changed', refresh);
    window.addEventListener('ff:sync-config-changed', () => { connectRealtime(getSyncConfig()); refresh(); });
    return () => {
      window.removeEventListener('ff:company-changed', refresh);
    };
  }, []);

  // Connect realtime & listen for sync status events
  useEffect(() => {
    connectRealtime(getSyncConfig());
    function onSync(e: Event) {
      const detail = (e as CustomEvent).detail;
      setSyncStatus(detail?.status === 'connected' ? 'connected' : detail?.status === 'error' ? 'error' : 'checking');
    }
    window.addEventListener('ff:sync-status', onSync);
    // Local cross-tab = always connected
    setSyncStatus('connected');
    return () => window.removeEventListener('ff:sync-status', onSync);
  }, []);

  // Persist zen mode across reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ff_zen');
      if (saved === '1') {
        setZenMode(true);
        document.documentElement.classList.add('ff-zen');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (zenMode) document.documentElement.classList.add('ff-zen');
    else document.documentElement.classList.remove('ff-zen');
    try { localStorage.setItem('ff_zen', zenMode ? '1' : '0'); } catch {}
    // Notify layout
    window.dispatchEvent(new Event('ff:zen-changed'));
  }, [zenMode]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const openNewTab = () => {
    // Open current page in a new top-level browser tab (full browser viewport)
    window.open(window.location.href, '_blank', 'noopener');
  };

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    if (userMenuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  const refresh = () => {
    try {
      setIssueCount(db.unreadNotifCount());
    } catch {}
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 5000);
    const onChange = () => refresh();
    window.addEventListener('ff:data-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => { clearInterval(iv); window.removeEventListener('ff:data-changed', onChange); window.removeEventListener('storage', onChange); };
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        document.documentElement.classList.toggle('dark');
        try {
          localStorage.setItem('ff_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        } catch {}
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setNotifOpen(false);
        setHelpOpen(false);
      } else if (e.key === '?' && !typing) {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setZenMode((v) => !v);
      } else if (e.key === 'F11') {
        // Let native fullscreen fire; state is synced via fullscreenchange event
      }
    }
    function onOpenPalette() { setPaletteOpen(true); }
    window.addEventListener('keydown', onKey);
    window.addEventListener('ff:open-palette', onOpenPalette);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('ff:open-palette', onOpenPalette);
    };
  }, []);

  const meta = PAGE_META[pathname] || { title: 'FreightFlow' };

  return (
    <>
      <header className="h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onHamburgerClick}
            className="md:hidden w-10 h-10 -ml-1 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">{meta.title}</h1>
            {meta.subtitle && <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">{meta.subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 pl-3 pr-2 py-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 w-80 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search shipments, commands…</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>

          <div className="hidden sm:block"><ThemeToggle /></div>
          <div className="hidden sm:block"><LanguageToggle /></div>

          <button
            onClick={() => setZenMode((v) => !v)}
            className={`hidden sm:flex w-9 h-9 rounded-lg items-center justify-center transition-colors ${zenMode ? 'bg-brand text-white hover:bg-brand/90' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            title={zenMode ? 'Exit Zen mode (Ctrl+.)' : 'Zen mode — hide chrome (Ctrl+.)'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>

          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit full screen (Ctrl+Shift+F)' : 'Full screen (Ctrl+Shift+F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={openNewTab}
            className="hidden md:flex w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {activeBranchName && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">{activeBranchName}</span>
            </div>
          )}

          <div
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md"
            title={`Realtime sync: ${syncStatus}`}
          >
            <CircleDot className={`w-3 h-3 ${syncStatus === 'connected' ? 'text-emerald-500 ff-glow-emerald' : syncStatus === 'error' ? 'text-rose-500' : 'text-amber-500 animate-pulse'}`} />
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              {syncStatus === 'connected' ? 'Online' : syncStatus === 'error' ? 'Offline' : '…'}
            </span>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Settings / Companies / Sync / Push"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => { setNotifOpen((v) => !v); setPaletteOpen(false); }}
            className="relative w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {issueCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {issueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            className="hidden lg:flex w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
            title="Keyboard shortcuts (?)"
          >
            <span className="font-mono font-bold text-sm">?</span>
          </button>

          {meta.newHref ? (
            <Button onClick={() => router.push(meta.newHref!)} className="hidden sm:inline-flex">
              <Plus className="w-4 h-4" /> {meta.newLabel || 'New'}
            </Button>
          ) : (
            <Button onClick={() => router.push('/shipments?new=1')} className="hidden sm:inline-flex">
              <Plus className="w-4 h-4" /> New Shipment
            </Button>
          )}

          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${user.avatarColor} text-white text-xs font-bold flex items-center justify-center`}>
                  {user.initials}
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{user.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{roleLabel(user.role)}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${user.avatarColor} text-white font-bold flex items-center justify-center`}>
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                        <div className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand/10 text-brand dark:bg-brand/20">{roleLabel(user.role)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Switch role (demo)</div>
                    {getAllUsers().map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { doSwitchUser(u.id); setUserMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left transition-colors ${u.id === user.id ? 'bg-brand/10 text-brand' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                      >
                        <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${u.avatarColor} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>{u.initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{u.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[u.role]}</div>
                        </div>
                        {u.id === user.id && <span className="text-[10px] text-brand font-semibold">CURRENT</span>}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onOpenNewShipment={() => router.push('/shipments?new=1')}
        />
        <NotificationsMenu open={notifOpen} onClose={() => setNotifOpen(false)} />
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const SHORTCUTS: [string, string][] = [
    [`${isMac ? '⌘' : 'Ctrl'}+K`, 'Open command palette / universal search'],
    [`${isMac ? '⌘' : 'Ctrl'}+J`, 'Toggle dark / light mode'],
    ['G then D', 'Go to Dashboard'],
    ['G then S', 'Go to Shipments'],
    ['G then A', 'Go to Air Freight'],
    ['G then O', 'Go to Sea (Ocean) Freight'],
    ['G then C', 'Go to Customs'],
    ['G then T', 'Go to Trucking'],
    ['G then I', 'Go to Invoices'],
    ['G then Q', 'Go to Quotes'],
    ['G then B', 'Go to CW Benchmark'],
    ['N then S', 'New Shipment'],
    ['N then Q', 'New Quote'],
    ['N then I', 'New Invoice'],
    ['N then T', 'New Truck Dispatch'],
    ['/', 'Open command palette'],
    [`${isMac ? '⌘' : 'Ctrl'}+Shift+F`, 'Toggle browser full screen'],
    [`${isMac ? '⌘' : 'Ctrl'}+.`, 'Toggle Zen mode (hide sidebar/topbar)'],
    ['?', 'Show this help'],
    ['Esc', 'Close dialogs'],
  ];
  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <kbd className="w-8 h-8 inline-flex items-center justify-center bg-brand text-white rounded-md text-sm">⌨</kbd>
            Keyboard Shortcuts
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl">×</button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={desc} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700 dark:text-slate-300">{desc}</span>
              <span className="flex gap-1 shrink-0">
                {keys.split(/\sthen\s|\+/).map((k, i) => (
                  <kbd
                    key={i}
                    className="min-w-[28px] h-7 px-1.5 inline-flex items-center justify-center text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">?</kbd> anytime to toggle this help · Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px]">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
