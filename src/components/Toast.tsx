'use client';

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle, Sparkles, Truck, Package, Mail } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'shipment' | 'email' | 'ai';

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastCtx {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => {
    const id = nextId++;
    const t: Toast = {
      id,
      title: opts.title,
      description: opts.description,
      variant: opts.variant || 'info',
      duration: opts.duration ?? 4000,
    };
    setToasts((cur) => [...cur, t]);
    if (t.duration > 0) {
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), t.duration);
    }
  }, []);

  const dismiss = (id: number) => setToasts((cur) => cur.filter((x) => x.id !== id));

  // Listen for ff:toast events dispatched from store CRUD methods
  useEffect(() => {
    function onToast(e: Event) {
      const ev = e as CustomEvent<{ title: string; description?: string; variant?: ToastVariant; duration?: number }>;
      if (ev.detail) toast(ev.detail);
    }
    window.addEventListener('ff:toast', onToast as EventListener);
    return () => window.removeEventListener('ff:toast', onToast as EventListener);
  }, [toast]);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-20 right-4 z-[200] space-y-2 w-[340px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => {
          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5" />,
            error: <AlertCircle className="w-5 h-5" />,
            warning: <AlertTriangle className="w-5 h-5" />,
            info: <Info className="w-5 h-5" />,
            shipment: <Package className="w-5 h-5" />,
            email: <Mail className="w-5 h-5" />,
            ai: <Sparkles className="w-5 h-5" />,
          };
          const colorMap = {
            success: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
            error: 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
            warning: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
            info: 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
            shipment: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100',
            email: 'bg-teal-50 dark:bg-teal-950/70 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-100',
            ai: 'bg-violet-50 dark:bg-violet-950/70 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100',
          };
          const iconColorMap = {
            success: 'text-emerald-500',
            error: 'text-rose-500',
            warning: 'text-amber-500',
            info: 'text-blue-500',
            shipment: 'text-indigo-500',
            email: 'text-teal-500',
            ai: 'text-violet-500',
          };
          return (
            <div key={t.id}
              className={`ff-toast pointer-events-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 ${colorMap[t.variant]}`}>
              <div className={`shrink-0 mt-0.5 ${iconColorMap[t.variant]}`}>{iconMap[t.variant]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-tight">{t.title}</div>
                {t.description && <div className="text-xs mt-0.5 opacity-80 leading-snug">{t.description}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
