'use client';

import { useEffect } from 'react';

export default function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  // Title + subtitle are set by Topbar via router; but we keep this component for layout spacing.
  // Topbar is rendered by CopilotWrapper, but it reads its own title from pathname metadata.
  useEffect(() => {
    // We could set document.title here for browser tab
    document.title = `${title} — FreightFlow`;
  }, [title]);
  return (
    <main className="flex-1 p-6 space-y-6 bg-slate-50 dark:bg-[#0b1220] min-h-[calc(100vh-4rem)]">
      {children}
    </main>
  );
}
