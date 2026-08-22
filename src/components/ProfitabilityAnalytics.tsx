'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Badge } from './ui';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import { formatMoney } from '@/lib/utils';
import { RankBar } from './Sparkline';
import { TrendingUp, Users, MapPin, Layers, Award } from 'lucide-react';

/**
 * GoFreight / Magaya-style Profitability Analytics widget.
 * Shows per-customer revenue, per-lane performance, and margin overview.
 */
export function ProfitabilityAnalytics() {
  const [data, setData] = useState<DB | null>(null);
  const [tab, setTab] = useState<'customers' | 'lanes' | 'modes'>('customers');

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

  const analytics = useMemo(() => {
    if (!data) return null;
    const completed = data.shipments.filter((s) => s.status !== 'cancelled');

    // Aggregate by customer
    const byCustomer = new Map<string, { name: string; revenue: number; cost: number; count: number; margin: number }>();
    completed.forEach((s) => {
      const cost = (s.freightCost || s.totalAmount * 0.78) + (s.customsCost || 0) + (s.truckingCost || 0) + (s.otherCost || 0);
      const cur = byCustomer.get(s.customerId) || { name: s.customerName, revenue: 0, cost: 0, count: 0, margin: 0 };
      cur.revenue += s.totalAmount;
      cur.cost += cost;
      cur.count += 1;
      cur.margin = cur.revenue - cur.cost;
      byCustomer.set(s.customerId, cur);
    });

    // Aggregate by lane (origin→destination)
    const byLane = new Map<string, { lane: string; revenue: number; count: number; volume: number }>();
    completed.forEach((s) => {
      const key = `${s.portOfLoading} → ${s.portOfDischarge}`;
      const cur = byLane.get(key) || { lane: key, revenue: 0, count: 0, volume: 0 };
      cur.revenue += s.totalAmount;
      cur.count += 1;
      cur.volume += s.weight;
      byLane.set(key, cur);
    });

    // Aggregate by mode/direction
    const byMode = new Map<string, { mode: string; revenue: number; count: number; co2: number }>();
    completed.forEach((s) => {
      const key = `${s.mode === 'air' ? '✈️ Air' : '🚢 Sea'} · ${s.direction === 'import' ? 'Import' : 'Export'}`;
      const cur = byMode.get(key) || { mode: key, revenue: 0, count: 0, co2: 0 };
      cur.revenue += s.totalAmount;
      cur.count += 1;
      cur.co2 += s.co2e || 0;
      byMode.set(key, cur);
    });

    const totalRev = completed.reduce((s, x) => s + x.totalAmount, 0);
    const totalCost = completed.reduce(
      (s, x) => s + (x.freightCost || x.totalAmount * 0.78) + (x.customsCost || 0) + (x.truckingCost || 0) + (x.otherCost || 0),
      0
    );
    const totalMargin = totalRev - totalCost;
    const marginPct = totalRev ? (totalMargin / totalRev) * 100 : 0;

    return {
      topCustomers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      topLanes: [...byLane.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      byMode: [...byMode.values()].sort((a, b) => b.revenue - a.revenue),
      totalRevenue: totalRev,
      totalCost,
      totalMargin,
      marginPct,
      totalShipments: completed.length,
    };
  }, [data]);

  if (!data || !analytics) return null;

  const palette = ['#0f4c81', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626'];

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Profitability & BI</h2>
        </div>
        <Badge color="emerald">
          <Award className="w-3 h-3" />
          {analytics.marginPct.toFixed(1)}% margin
        </Badge>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-0 border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Revenue</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatMoney(analytics.totalRevenue)}</div>
          <div className="text-[10px] text-slate-500">{analytics.totalShipments} shipments</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cost</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatMoney(analytics.totalCost)}</div>
          <div className="text-[10px] text-slate-500">blended</div>
        </div>
        <div className="p-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Gross Profit</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(analytics.totalMargin)}</div>
          <div className="text-[10px] text-emerald-600/80">+{analytics.marginPct.toFixed(1)}%</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-2">
        {([
          { id: 'customers', label: 'Top Customers', icon: Users },
          { id: 'lanes', label: 'Top Lanes', icon: MapPin },
          { id: 'modes', label: 'By Mode', icon: Layers },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors min-h-[40px] ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === 'customers' && (
          <div>
            {analytics.topCustomers.map((c, i) => (
              <RankBar
                key={i}
                rank={i + 1}
                label={c.name}
                value={c.revenue}
                max={analytics.topCustomers[0]?.revenue || 1}
                color={palette[i % palette.length]}
                formatter={(v) => formatMoney(v)}
              />
            ))}
          </div>
        )}
        {tab === 'lanes' && (
          <div>
            {analytics.topLanes.map((l, i) => (
              <RankBar
                key={i}
                rank={i + 1}
                label={l.lane}
                value={l.revenue}
                max={analytics.topLanes[0]?.revenue || 1}
                color={palette[i % palette.length]}
                formatter={(v) => formatMoney(v)}
              />
            ))}
          </div>
        )}
        {tab === 'modes' && (
          <div className="space-y-3">
            {analytics.byMode.map((m, i) => {
              const pct = analytics.totalRevenue ? (m.revenue / analytics.totalRevenue) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between items-baseline text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{m.mode}</span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(m.revenue)} <span className="text-xs text-slate-500">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: palette[i % palette.length] }}
                    />
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
                    <span>{m.count} shipments</span>
                    <span>· {(m.co2 / 1000).toFixed(1)} t CO₂e</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
