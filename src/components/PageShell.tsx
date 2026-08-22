'use client';

import { useEffect } from 'react';

export default function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — FreightFlow`;
  }, [title]);
  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full ff-stagger">
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 flex-wrap ff-fade-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-3xl">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
