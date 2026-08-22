'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './ui';
import { Keyboard, Command, Search, Plus, Package, FileText, RefreshCw, Moon, ArrowRight } from 'lucide-react';

/**
 * CargoWise-style keyboard shortcut help overlay.
 * Press ? or Ctrl+/ to show.
 */
const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open command palette', icon: Command },
  { keys: ['/'], label: 'Focus global search', icon: Search },
  { keys: ['N'], label: 'New shipment', icon: Plus },
  { keys: ['Q'], label: 'Create quote', icon: FileText },
  { keys: ['G', 'D'], label: 'Go to Dashboard', icon: Package },
  { keys: ['G', 'S'], label: 'Go to Shipments', icon: Package },
  { keys: ['?'], label: 'Show this help', icon: Keyboard },
  { keys: ['R'], label: 'Refresh data', icon: RefreshCw },
  { keys: ['M'], label: 'Toggle dark mode', icon: Moon },
  { keys: ['Esc'], label: 'Close modal / dialog', icon: ArrowRight },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.key === '?' || (e.key === '/' && e.ctrlKey)) && !isInput) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
      if (!open && !isInput) {
        // Direct shortcuts
        if (e.key.toLowerCase() === 'g') {
          // Wait for next key (d/s)
          const onNext = (ev: KeyboardEvent) => {
            window.removeEventListener('keydown', onNext, true);
            if (ev.key.toLowerCase() === 'd') {
              window.location.href = '/';
            } else if (ev.key.toLowerCase() === 's') {
              window.location.href = '/shipments/';
            }
          };
          window.addEventListener('keydown', onNext, { once: true, capture: true });
          setTimeout(() => window.removeEventListener('keydown', onNext, true), 1000);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Floating hint chip */}
      <button
        onClick={() => setOpen(true)}
        className="ff-fab fixed bottom-20 sm:bottom-6 right-4 sm:right-4 z-40 w-10 h-10 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:scale-110 transition-all flex items-center justify-center"
        style={{ marginBottom: 'calc(var(--safe-bottom) + 64px)' }}
        title="Keyboard shortcuts (press ?)"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <Card className="w-full max-w-lg p-0 ff-sheet-up" onClick={(e: any) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
              </div>
              <span className="text-xs text-slate-500">Press Esc to close</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SHORTCUTS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{s.label}</span>
                    <span className="flex gap-1">
                      {s.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 rounded-b-xl">
              💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded mx-0.5 text-[10px] font-mono">⌘K</kbd> anywhere to open the command palette.
            </div>
          </Card>
        </div>
      )}
    </>,
    document.body
  );
}
