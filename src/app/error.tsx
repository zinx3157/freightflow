'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Global error boundary for the App Router. Catches client-side JS errors
 * (e.g. a component crash) and shows a friendly recovery screen instead of
 * Next.js's generic "This page couldn't load." overlay.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[FreightFlow] Client error caught by error boundary:', error);
  }, [error]);

  const hardReset = () => {
    try { sessionStorage.clear(); } catch {}
    // Don't clear localStorage (that would wipe all data); just reload.
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          FreightFlow hit an unexpected error. Your data is safe in your browser — you can try again,
          or go back to the dashboard.
        </p>
        {error?.message && (
          <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg p-2 mb-4 text-left overflow-x-auto">
            {error.message.slice(0, 200)}
          </div>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg font-medium text-sm hover:bg-brand/90 transition"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
          <button
            onClick={hardReset}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Home className="w-4 h-4" /> Go home
          </button>
        </div>
      </div>
    </div>
  );
}
