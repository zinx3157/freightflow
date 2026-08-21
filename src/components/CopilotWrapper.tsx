'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AICopilot, { CopilotFab } from './AICopilot';
import LoginScreen from './LoginScreen';
import { Maximize2 } from 'lucide-react';

export default function CopilotWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [zen, setZen] = useState(false);
  const isPortal = pathname?.startsWith('/portal');
  const isTracking = pathname?.startsWith('/tracking');

  // Open copilot via "/" shortcut (unless typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (e.key === '/' && !isPortal && !isTracking && !zen) {
        e.preventDefault();
        setCopilotOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPortal, isTracking, zen]);

  // Watch zen mode (synced from Topbar via <html> class + event)
  useEffect(() => {
    const sync = () => {
      setZen(document.documentElement.classList.contains('ff-zen'));
    };
    sync();
    window.addEventListener('ff:zen-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ff:zen-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const exitZen = async () => {
    document.documentElement.classList.remove('ff-zen');
    try { localStorage.setItem('ff_zen', '0'); } catch {}
    window.dispatchEvent(new Event('ff:zen-changed'));
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
  };

  // Public routes (no auth, no chrome)
  if (isPortal || isTracking) {
    return <>{children}</>;
  }

  // While loading auth state, show a blank screen (avoids flash)
  if (!ready) {
    return <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220]" />;
  }

  // Not logged in -> show login screen
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen">
      {!zen && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {!zen && <Topbar />}
        <main className={`flex-1 min-w-0 ${zen ? 'h-screen h-[100dvh] overflow-auto' : ''}`}>{children}</main>
        {!zen && <CopilotFab onClick={() => setCopilotOpen(true)} />}
        {!zen && <AICopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} />}

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
      </div>
    </div>
  );
}
