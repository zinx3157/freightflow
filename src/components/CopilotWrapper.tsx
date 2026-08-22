'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AICopilot, { CopilotFab } from './AICopilot';
import LoginScreen from './LoginScreen';
import MobileBottomNav from './MobileBottomNav';
import OfflineBanner from './OfflineBanner';
import PageTransition from './PageTransition';
import { ShortcutsHelp } from './KeyboardShortcuts';
import { Maximize2, Menu } from 'lucide-react';
import { withBasePath } from '@/lib/basePath';

export default function CopilotWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPortal = pathname?.startsWith('/portal');
  const isTracking = pathname?.startsWith('/tracking');
  const isDriver = pathname?.startsWith('/driver');

  // Open copilot via "/" shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (e.key === '/' && !isPortal && !isTracking && !zen) {
        e.preventDefault();
        setCopilotOpen(true);
      }
      // "N" new shipment
      if (e.key.toLowerCase() === 'n' && !isPortal && !isTracking && !zen) {
        // avoid double-fire: only if not in an input
        e.preventDefault();
        window.location.href = withBasePath('/shipments/?new=1');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPortal, isTracking, zen]);

  // Watch zen mode
  useEffect(() => {
    const sync = () => setZen(document.documentElement.classList.contains('ff-zen'));
    sync();
    window.addEventListener('ff:zen-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ff:zen-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Listen for "open palette" event from mobile nav search
  useEffect(() => {
    const open = () => setCopilotOpen(true);
    window.addEventListener('ff:open-palette', open);
    return () => window.removeEventListener('ff:open-palette', open);
  }, []);

  const exitZen = async () => {
    document.documentElement.classList.remove('ff-zen');
    try { localStorage.setItem('ff_zen', '0'); } catch {}
    window.dispatchEvent(new Event('ff:zen-changed'));
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
  };

  // Public routes (no chrome)
  if (isPortal || isTracking) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden">
        <OfflineBanner />
        {children}
      </div>
    );
  }

  if (!ready) {
    return <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220]" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden">
        <OfflineBanner />
        <LoginScreen />
      </div>
    );
  }

  const showBottomNav = !zen && !isDriver;

  return (
    <div className={`ff-app-shell flex min-h-[100dvh] md:h-screen md:h-[100dvh] w-full overflow-x-hidden md:overflow-hidden bg-slate-50 dark:bg-[#0b1220] ${showBottomNav ? 'ff-has-bottom-nav' : ''}`}>
      <PageTransition />
      {/* Desktop sidebar */}
      {!zen && <Sidebar />}

      {/* Mobile drawer sidebar */}
      {!zen && <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {!zen && <Topbar onHamburgerClick={() => setMobileMenuOpen(true)} />}
        <OfflineBanner />
        <main
          key={pathname}
          className={`ff-app-main flex-1 min-h-0 overflow-y-visible md:overflow-y-auto overflow-x-hidden ff-route-enter ${zen ? 'overflow-auto' : ''}`}
        >
          {children}
        </main>
        {!zen && <CopilotFab onClick={() => setCopilotOpen(true)} />}
        {!zen && <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />}

        {!zen && showBottomNav && (
          <MobileBottomNav
            onOpenSearch={() => window.dispatchEvent(new Event('ff:open-palette'))}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />
        )}

        {zen && (
          <button
            onClick={exitZen}
            className="fixed top-3 right-3 z-[200] flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title="Exit Zen mode (Ctrl+.)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Exit Zen
            <kbd className="hidden sm:inline px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px] text-slate-500">Ctrl+.</kbd>
          </button>
        )}

        {/* Keyboard shortcuts help — CargoWise power-user feature */}
        {!zen && !isDriver && <ShortcutsHelp />}
      </div>
    </div>
  );
}
