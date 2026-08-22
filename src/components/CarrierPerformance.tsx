'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from './ui';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import { Anchor, Plane, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * GoFreight-style carrier reliability widget.
 * Tracks on-time % and average transit days per carrier.
 */
export function CarrierPerformance() {
  const [data, setData] = useState<DB | null>(null);

  useEffect(() => {
    setData(db.getAll());
    const refresh = () => setData(db.getAll());
    window.addEventListener('ff:data-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('ff:data-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const carriers = useMemo(() => {
    if (!data) return [];
    const map = new Map<
      string,
      { carrier: string; mode: 'air' | 'sea'; shipments: number; onTime: number; totalDays: number; lateDays: number }
    >();
    data.shipments.forEach((s) => {
      const etd = new Date(s.etd).getTime();
      const eta = new Date(s.eta).getTime();
      const plannedDays = etd && eta ? Math.max(0, (eta - etd) / 86400000) : 0;
      // Simulated: some carriers are late, some on time (using ref hash for deterministic demo)
      const hash = s.reference.charCodeAt(s.reference.length - 1) % 10;
      const isLate = hash < 2; // ~20% late
      const actualDays = isLate ? plannedDays + (hash % 3 + 1) : plannedDays;
      const cur = map.get(s.carrier) || {
        carrier: s.carrier,
        mode: s.mode,
        shipments: 0,
        onTime: 0,
        totalDays: 0,
        lateDays: 0,
      };
      cur.shipments++;
      if (!isLate) cur.onTime++;
      cur.totalDays += actualDays;
      if (isLate) cur.lateDays += actualDays - plannedDays;
      map.set(s.carrier, cur);
    });
    return [...map.values()]
      .map((c) => ({
        ...c,
        onTimePct: c.shipments ? (c.onTime / c.shipments) * 100 : 0,
        avgDays: c.shipments ? c.totalDays / c.shipments : 0,
      }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 6);
  }, [data]);

  if (!data || carriers.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Carrier Reliability</h2>
        </div>
        <Badge color="blue">Last 30 days</Badge>
      </div>

      <div className="p-4 space-y-3">
        {carriers.map((c, i) => {
          const color = c.onTimePct >= 90 ? '#10b981' : c.onTimePct >= 75 ? '#f59e0b' : '#ef4444';
          return (
            <div key={c.carrier} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, color }}
              >
                {c.mode === 'air' ? <Plane className="w-4 h-4" /> : <Anchor className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.carrier}</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color }}>
                    {c.onTimePct.toFixed(0)}% on-time
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${c.onTimePct}%`, background: color }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.avgDays.toFixed(1)}d avg
                  </span>
                  <span>{c.shipments} shipments</span>
                  {c.onTimePct < 75 && (
                    <span className="flex items-center gap-0.5 text-rose-600 font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      Monitor
                    </span>
                  )}
                  {c.onTimePct >= 95 && (
                    <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Excellent
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
