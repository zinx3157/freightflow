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
    <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50 dark:bg-[#0b1220] min-h-[calc(100vh-4rem)] overflow-x-hidden">
      {children}
    </main>
  );
}
