'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Smooth page-transition overlay.
 * - A thin progress line sweeps across the top on every route change
 * - Gives immediate visual feedback so nav never feels "stuck".
 */
export default function PageTransition() {
  const pathname = usePathname();
  const [display, setDisplay] = useState(false);

  useEffect(() => {
    setDisplay(true);
    const t = setTimeout(() => setDisplay(false), 500);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!display) return null;
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-0.5 z-[100] pointer-events-none overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-brand via-sky-400 to-violet-500"
        style={{
          width: '100%',
          animation: 'ff-progress 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        }}
      />
    </div>
  );
}
