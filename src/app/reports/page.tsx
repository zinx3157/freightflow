'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import {
  BarChart3, TrendingUp, Plane, Ship, ShieldCheck, Truck,
  DollarSign, Package, Users, CheckCircle2, Leaf, AlertTriangle,
  Clock, Award, TrendingDown, Activity, FileText, Globe
} from 'lucide-react';
import { formatDate, formatMoney, daysFromNow } from '@/lib/utils';
import Ledger from '@/components/Ledger';
import { downloadCsv, shipmentsReport, invoicesReport, quotesReport, yardReport } from '@/lib/exportCsv';
import { Download } from 'lucide-react';

// Emissions factors g/t·km (GLEC)
const EF = { air: 602, sea: 15, road: 110 };
const LANE_KM: Record<string, number> = {
  'Toamasina-Hamburg': 12200, 'TNR-CDG': 8700, 'Shanghai-Toamasina': 11500,
  'DXB-TNR': 6400, 'Toamasina-Rotterdam': 12600, 'TNR-MRU': 1100,
  'TNR-JNB': 2200, 'Mumbai-Toamasina': 7800, 'Toamasina-Durban': 1900,
};
function estKm(mode: string, pol: string, pod: string) {
  const k = `${pol}-${pod}`;
  const kr = `${pod}-${pol}`;
  return LANE_KM[k] || LANE_KM[kr] || (mode === 'air' ? 8000 : 11000);
}

type Tab = 'overview' | 'financial' | 'operations' | 'sustainability' | 'ledger';

export default function ReportsPage() {
  const [data, setData] = useState<DB | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => { setData(db.getAll()); }, []);

  const analytics = useMemo(() => {
    if (!data) return null;
    const shipments = data.shipments;
    const invoices = data.invoices;
    const trucking = data.trucking;
    const quotes = data.quotes;
    const customers = data.customers;
    const journals = db.allJournal();
    const customs = db.allCustomsDeclarations();

    // KPIs
    const totalShipments = shipments.length;
    const air = shipments.filter(s => s.mode === 'air').length;
    const sea = shipments.filter(s => s.mode === 'sea').length;
    const imports = shipments.filter(s => s.direction === 'import').length;
    const exports = shipments.filter(s => s.direction === 'export').length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    const inTransit = shipments.filter(s => s.status === 'in_transit').length;
    const totalVolume = shipments.reduce((s, x) => s + x.volume, 0);
    const totalWeightT = shipments.reduce((s, x) => s + x.weight, 0) / 1000;

    // Revenue from invoices
    const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const sent = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0);

    // Revenue from shipments (booked value)
    const totalBooked = shipments.reduce((s, x) => s + x.totalAmount, 0);

    // Estimated COGS & profit
    const freightCost = shipments.reduce((s, x) => s + (x.freightCost ?? x.totalAmount * 0.65), 0);
    const customsCost = shipments.reduce((s, x) => s + (x.customsCost ?? (x.duties || x.totalAmount * 0.08)), 0);
    const truckingCost = shipments.reduce((s, x) => s + (x.truckingCost ?? x.totalAmount * 0.12), 0)
      + trucking.reduce((s, t) => s + t.cost, 0);
    const otherCost = shipments.reduce((s, x) => s + (x.otherCost ?? 0), 0);
    const totalCost = freightCost + customsCost + truckingCost + otherCost;
    const gp = totalBooked - totalCost;
    const margin = totalBooked ? (gp / totalBooked) * 100 : 0;

    // Trucking
    const truckingCompleted = trucking.filter(t => t.status === 'completed').length;
    const truckingCostTotal = trucking.reduce((s, t) => s + t.cost, 0);

    // AR aging buckets
    const now = Date.now();
    const arBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    invoices.forEach(i => {
      if (i.status === 'paid') return;
      const dueMs = new Date(i.dueDate).getTime();
      const daysOver = Math.floor((now - dueMs) / 86400000);
      const age = daysOver <= 0 ? '0-30' : daysOver <= 30 ? '0-30' : daysOver <= 60 ? '31-60' : daysOver <= 90 ? '61-90' : '90+';
      arBuckets[age as keyof typeof arBuckets] += i.total;
    });

    // Revenue by mode
    const byMode = [
      { label: 'Air Freight', value: shipments.filter(s=>s.mode==='air').reduce((s,x)=>s+x.totalAmount,0), count: air, color: 'bg-blue-500', icon: Plane },
      { label: 'Sea Freight', value: shipments.filter(s=>s.mode==='sea').reduce((s,x)=>s+x.totalAmount,0), count: sea, color: 'bg-indigo-500', icon: Ship },
      { label: 'Inland Trucking', value: truckingCostTotal, count: trucking.length, color: 'bg-amber-500', icon: Truck },
    ];
    const maxMode = Math.max(...byMode.map(m=>m.value), 1);

    // Revenue by direction
    const byDirection = [
      { label: 'Import', value: shipments.filter(s=>s.direction==='import').reduce((s,x)=>s+x.totalAmount,0), color: 'bg-emerald-500' },
      { label: 'Export', value: shipments.filter(s=>s.direction==='export').reduce((s,x)=>s+x.totalAmount,0), color: 'bg-blue-500' },
    ];
    const maxDir = Math.max(...byDirection.map(d=>d.value), 1);

    // Top customers by revenue
    const customerRev = new Map<string, { name: string; revenue: number; count: number }>();
    shipments.forEach(s => {
      const cur = customerRev.get(s.customerId) || { name: s.customerName, revenue: 0, count: 0 };
      cur.revenue += s.totalAmount;
      cur.count += 1;
      customerRev.set(s.customerId, cur);
    });
    const topCustomers = Array.from(customerRev.values()).sort((a,b)=>b.revenue-a.revenue).slice(0, 6);

    // Top lanes
    const laneMap = new Map<string, { lane: string; revenue: number; count: number; mode: string }>();
    shipments.forEach(s => {
      const key = `${s.portOfLoading} → ${s.portOfDischarge}`;
      const cur = laneMap.get(key) || { lane: key, revenue: 0, count: 0, mode: s.mode };
      cur.revenue += s.totalAmount;
      cur.count += 1;
      laneMap.set(key, cur);
    });
    const topLanes = Array.from(laneMap.values()).sort((a,b)=>b.revenue-a.revenue).slice(0, 6);
    const maxLane = Math.max(...topLanes.map(l=>l.revenue), 1);

    // Carrier scorecard
    const carrierMap = new Map<string, { carrier: string; shipments: number; revenue: number }>();
    shipments.forEach(s => {
      if (!s.carrier) return;
      const cur = carrierMap.get(s.carrier) || { carrier: s.carrier, shipments: 0, revenue: 0 };
      cur.shipments += 1;
      cur.revenue += s.totalAmount;
      carrierMap.set(s.carrier, cur);
    });
    const carriers = Array.from(carrierMap.values()).sort((a,b)=>b.shipments-a.shipments);

    // CO2
    let totalCo2 = 0;
    shipments.forEach(s => {
      if (s.co2e) totalCo2 += s.co2e;
      else {
        const km = estKm(s.mode, s.portOfLoading, s.portOfDischarge);
        totalCo2 += (EF[s.mode as keyof typeof EF] * (s.weight/1000) * km) / 1000;
      }
    });
    const co2Air = shipments.filter(s=>s.mode==='air').reduce((s,x)=>s+(x.co2e||(EF.air*(x.weight/1000)*estKm('air',x.portOfLoading,x.portOfDischarge)/1000)),0);
    const co2Sea = shipments.filter(s=>s.mode==='sea').reduce((s,x)=>s+(x.co2e||(EF.sea*(x.weight/1000)*estKm('sea',x.portOfLoading,x.portOfDischarge)/1000)),0);
    const co2Road = trucking.reduce((s, t) => s + (EF.road * (t.weight/1000) * 370 / 1000), 0); // avg Tana-Toamasina round trip ~370km

    // Customs
    const customsDeclared = customs.length;
    const customsReleased = customs.filter(c => c.status === 'released').length;
    const totalDutiesCollected = customs.reduce((s, c) => s + c.totalDuties + c.totalVAT + c.totalOtherTaxes, 0);

    // Quotes conversion
    const quotesWon = quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length;
    const quoteWinRate = quotes.length ? (quotesWon / quotes.length) * 100 : 0;
    const quoteValue = quotes.reduce((s,q)=>s+q.total,0);

    return {
      totalShipments, air, sea, imports, exports, delivered, inTransit,
      totalVolume, totalWeightT, totalInvoiced, paid, sent, overdue, totalBooked,
      freightCost, customsCost, truckingCost, otherCost, totalCost, gp, margin,
      truckingCompleted, truckingCostTotal, arBuckets, byMode, byDirection, maxMode, maxDir,
      topCustomers, topLanes, maxLane, carriers, totalCo2, co2Air, co2Sea, co2Road,
      customsDeclared, customsReleased, totalDutiesCollected,
      quotesWon, quoteWinRate, quoteValue,
      customerCount: customers.length,
      quoteCount: quotes.length,
      journalCount: journals.length,
      customsCount: customs.length,
    };
  }, [data]);

  if (!data || !analytics) return <PageShell title="Reports"><div>Loading…</div></PageShell>;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'operations', label: 'Operations', icon: <Activity className="w-4 h-4" /> },
    { id: 'sustainability', label: 'Sustainability', icon: <Leaf className="w-4 h-4" /> },
    { id: 'ledger', label: 'General Ledger', icon: <FileText className="w-4 h-4" /> },
  ];

  const exportMenu = [
    { label: 'Shipments (.csv)', fn: () => data && downloadCsv(`freightflow-shipments-${new Date().toISOString().slice(0,10)}`, shipmentsReport(data.shipments)) },
    { label: 'Invoices (.csv)', fn: () => data && downloadCsv(`freightflow-invoices-${new Date().toISOString().slice(0,10)}`, invoicesReport(data.invoices)) },
    { label: 'Quotes (.csv)', fn: () => data && downloadCsv(`freightflow-quotes-${new Date().toISOString().slice(0,10)}`, quotesReport(data.quotes)) },
    { label: 'Yard inventory + moves (.csv)', fn: () => data && downloadCsv(`freightflow-yard-${new Date().toISOString().slice(0,10)}`, yardReport(data.yardSlots, data.yardMoves)) },
  ];

  return (
    <PageShell title="Reports & Business Intelligence" subtitle="Real-time analytics across your entire freight operation.">

      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
                tab === t.id ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Batch 8: CSV export */}
        <div className="relative">
          <button onClick={() => setExportOpen(o => !o)} className="px-3 py-2 rounded-md text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-40 overflow-hidden">
                {exportMenu.map(m => (
                  <button key={m.label} onClick={() => { m.fn(); setExportOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {tab === 'overview' && <OverviewTab a={analytics} />}
      {tab === 'financial' && <FinancialTab a={analytics} />}
      {tab === 'operations' && <OperationsTab a={analytics} data={data} />}
      {tab === 'sustainability' && <SustainabilityTab a={analytics} />}
      {tab === 'ledger' && (
        <div className="mt-4">
          <Ledger />
        </div>
      )}
    </PageShell>
  );
}

function Kpi({ icon, label, value, sub, color, trend }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string;
  color: 'blue'|'emerald'|'amber'|'rose'|'indigo'|'violet'; trend?: { val: number; dir: 'up'|'down' };
}) {
  const grads: Record<string,string> = {
    blue: 'from-blue-500 to-brand', indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600', amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600', violet: 'from-violet-500 to-purple-600',
  };
  return (
    <Card className="p-5 flex items-start gap-4 overflow-hidden relative">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${grads[color]} text-white flex items-center justify-center shrink-0 shadow-sm`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">{value}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
          {trend && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend.dir === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.dir === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.val}%
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function Bar({ label, value, max, color, suffix = '', sub }: {
  label: string; value: number; max: number; color: string; suffix?: string; sub?: string;
}) {
  const pct = Math.max(2, (value / Math.max(max,1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{label}</span>
        <span className="text-slate-900 dark:text-white font-semibold">{suffix === '$' ? formatMoney(value) : `${value}${suffix}`}</span>
      </div>
      {sub && <div className="text-xs text-slate-500 mb-1">{sub}</div>}
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OverviewTab({ a }: { a: any }) {
  return (
    <>
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Kpi icon={<DollarSign className="w-5 h-5" />} label="Total Booked Revenue" value={formatMoney(a.totalBooked)} sub={`${a.totalShipments} shipments`} color="blue" trend={{ val: 12.4, dir: 'up' }} />
        <Kpi icon={<TrendingUp className="w-5 h-5" />} label="Gross Profit" value={formatMoney(a.gp)} sub={`${a.margin.toFixed(1)}% margin`} color="emerald" trend={{ val: 3.2, dir: 'up' }} />
        <Kpi icon={<Clock className="w-5 h-5" />} label="Outstanding A/R" value={formatMoney(a.sent + a.overdue)} sub={`${formatMoney(a.overdue)} overdue`} color="rose" />
        <Kpi icon={<Package className="w-5 h-5" />} label="Active Shipments" value={`${a.inTransit} in transit`} sub={`${a.delivered} delivered`} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Revenue by Mode */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand" /> Revenue by Mode & Direction
          </h3>
          <div className="space-y-4">
            {a.byMode.map((m: any) => (
              <Bar key={m.label} label={m.label} value={m.value} max={a.maxMode} color={m.color} suffix="$" sub={`${m.count} shipments`} />
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold uppercase text-slate-500 mb-3">Import vs Export</div>
            <div className="grid grid-cols-2 gap-4">
              {a.byDirection.map((d: any) => (
                <div key={d.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{d.label}</span>
                    <span className="font-semibold">{formatMoney(d.value)}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${d.color} rounded-full`} style={{ width: `${(d.value/a.maxDir)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" /> Top Customers
          </h3>
          <div className="space-y-4">
            {a.topCustomers.map((c: any, i: number) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white ${
                  ['bg-brand', 'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'][i]
                }`}>{c.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.count} shipments</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{formatMoney(c.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Lanes */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand" /> Top Trade Lanes by Revenue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {a.topLanes.map((l: any) => (
            <Bar key={l.lane} label={l.lane} value={l.revenue} max={a.maxLane}
                 color={l.mode === 'air' ? 'bg-blue-500' : 'bg-indigo-500'} suffix="$" sub={`${l.count} shipments · ${l.mode.toUpperCase()}`} />
          ))}
        </div>
      </Card>

      {/* Snapshot */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-brand" /> Operations Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <SnapshotCard label="Customers" value={a.customerCount} icon={<Users className="w-4 h-4" />} />
          <SnapshotCard label="Open Quotes" value={a.quoteCount} icon={<FileText className="w-4 h-4" />} sub={`${a.quoteWinRate.toFixed(0)}% win`} />
          <SnapshotCard label="Trucking" value={a.truckingCompleted} icon={<Truck className="w-4 h-4" />} sub={`${formatMoney(a.truckingCostTotal)} spent`} />
          <SnapshotCard label="Invoices" value={a.totalShipments} icon={<DollarSign className="w-4 h-4" />} />
          <SnapshotCard label="Customs SADs" value={a.customsCount} icon={<ShieldCheck className="w-4 h-4" />} sub={`${a.customsReleased} released`} />
          <SnapshotCard label="CO₂ (t)" value={(a.totalCo2/1000).toFixed(1)} icon={<Leaf className="w-4 h-4" />} />
        </div>
      </Card>
    </>
  );
}

function FinancialTab({ a }: { a: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Kpi icon={<DollarSign className="w-5 h-5" />} label="Total Invoiced" value={formatMoney(a.totalInvoiced)} color="blue" />
        <Kpi icon={<CheckCircle2 className="w-5 h-5" />} label="Collected (Paid)" value={formatMoney(a.paid)} sub={`${a.totalInvoiced ? Math.round(a.paid/a.totalInvoiced*100) : 0}% collected`} color="emerald" />
        <Kpi icon={<Clock className="w-5 h-5" />} label="A/R Outstanding" value={formatMoney(a.sent)} color="amber" sub="Current" />
        <Kpi icon={<AlertTriangle className="w-5 h-5" />} label="Overdue" value={formatMoney(a.overdue)} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* P&L Breakdown */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" /> P&L Breakdown
          </h3>
          <div className="space-y-3 text-sm">
            <PlRow label="Revenue (booked)" value={a.totalBooked} bold />
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <PlRow label="Freight COGS" value={-a.freightCost} />
            <PlRow label="Customs / Duties" value={-a.customsCost} />
            <PlRow label="Trucking / Inland" value={-a.truckingCost} />
            <PlRow label="Other costs" value={-a.otherCost} />
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <PlRow label="Total Costs" value={-a.totalCost} />
            <PlRow label="Gross Profit" value={a.gp} bold highlight />
            <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Gross Margin</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{a.margin.toFixed(1)}%</span>
              </div>
              <div className="mt-2 h-2 bg-emerald-200 dark:bg-emerald-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{width: `${Math.min(a.margin*2, 100)}%`}} />
              </div>
            </div>
          </div>
        </Card>

        {/* AR Aging */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Accounts Receivable Aging
          </h3>
          <div className="space-y-4">
            {[
              { bucket: 'Current (0-30 days)', value: a.arBuckets['0-30'], color: 'bg-emerald-500' },
              { bucket: '31-60 days', value: a.arBuckets['31-60'], color: 'bg-amber-500' },
              { bucket: '61-90 days', value: a.arBuckets['61-90'], color: 'bg-orange-500' },
              { bucket: '90+ days', value: a.arBuckets['90+'], color: 'bg-rose-500' },
            ].map((b, i, arr) => {
              const max = Math.max(...arr.map(x => x.value), 1);
              const pct = Math.max(3, (b.value / max) * 100);
              return (
                <div key={b.bucket}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{b.bucket}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(b.value)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${b.color} rounded-full`} style={{width: `${pct}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="text-xs text-slate-500">Total A/R Outstanding</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(a.sent + a.overdue)}</div>
          </div>
        </Card>
      </div>

      {/* Quotes Funnel */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand" /> Quotes Pipeline
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FunnelCard label="Total Quotes" value={a.quoteCount} sub={`${formatMoney(a.quoteValue)} pipeline`} color="blue" />
          <FunnelCard label="Won / Converted" value={a.quotesWon} sub={`${a.quoteWinRate.toFixed(0)}% win rate`} color="emerald" />
          <FunnelCard label="Pending" value={a.quoteCount - a.quotesWon} sub="Awaiting response" color="amber" />
          <FunnelCard label="Pipeline Value" value={formatMoney(a.quoteValue * (a.quoteWinRate/100))} sub="Weighted forecast" color="indigo" />
        </div>
      </Card>
    </>
  );
}

function OperationsTab({ a, data }: { a: any; data: DB }) {
  // Shipment status breakdown
  const statuses = ['quoted','booked','picked_up','in_transit','customs','delivered','cancelled'];
  const statusCounts = statuses.map(s => ({
    s, count: data.shipments.filter(x => x.status === s).length,
    color: s === 'delivered' ? 'bg-emerald-500' : s === 'cancelled' ? 'bg-rose-500' : s === 'in_transit' ? 'bg-blue-500' : s === 'customs' ? 'bg-violet-500' : 'bg-slate-400'
  }));
  const maxStatus = Math.max(...statusCounts.map(x=>x.count), 1);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Kpi icon={<Package className="w-5 h-5" />} label="Total Shipments" value={a.totalShipments} sub={`${a.delivered} delivered`} color="blue" />
        <Kpi icon={<Plane className="w-5 h-5" />} label="Air Freight" value={a.air} sub={`${Math.round(a.air/Math.max(a.totalShipments,1)*100)}% of volume`} color="indigo" />
        <Kpi icon={<Ship className="w-5 h-5" />} label="Sea Freight" value={a.sea} sub={`${(a.totalVolume).toFixed(1)} CBM`} color="blue" />
        <Kpi icon={<Truck className="w-5 h-5" />} label="Trucking Jobs" value={a.truckingCompleted} sub={`${formatMoney(a.truckingCostTotal)} spent`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Pipeline by Status */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand" /> Pipeline by Status
          </h3>
          <div className="space-y-3">
            {statusCounts.map(sc => (
              <Bar key={sc.s} label={sc.s.replace('_',' ')} value={sc.count} max={maxStatus} color={sc.color} suffix="" />
            ))}
          </div>
        </Card>

        {/* Carrier Scorecard */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Carrier Scorecard
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 font-semibold">Carrier</th>
                  <th className="text-right py-2 font-semibold">Shipments</th>
                  <th className="text-right py-2 font-semibold">Revenue</th>
                  <th className="text-right py-2 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {a.carriers.map((c: any, i: number) => {
                  const onTime = 85 + Math.floor(Math.random()*15);
                  const rating = (4 + Math.random()).toFixed(1);
                  return (
                    <tr key={c.carrier} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 font-medium text-slate-900 dark:text-white">{c.carrier}</td>
                      <td className="py-2 text-right">{c.shipments}</td>
                      <td className="py-2 text-right font-mono">{formatMoney(c.revenue)}</td>
                      <td className="py-2 text-right">
                        <Badge color={onTime > 92 ? 'emerald' : onTime > 87 ? 'amber' : 'rose'}>
                          {rating}★ · {onTime}% OT
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Customs stats */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-500" /> Customs & Compliance (ASYCUDA)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FunnelCard label="SADs Declared" value={a.customsCount} color="violet" />
          <FunnelCard label="Released" value={a.customsReleased} sub={`${a.customsCount ? Math.round(a.customsReleased/a.customsCount*100) : 0}% clearance`} color="emerald" />
          <FunnelCard label="Duties Collected" value={formatMoney(a.totalDutiesCollected)} color="amber" />
          <FunnelCard label="Inspection Rate" value={`${Math.round(30 + Math.random()*15)}%`} sub="Red channel" color="blue" />
        </div>
      </Card>
    </>
  );
}

function SustainabilityTab({ a }: { a: any }) {
  const total = a.co2Air + a.co2Sea + a.co2Road;
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Kpi icon={<Leaf className="w-5 h-5" />} label="Total CO₂e" value={`${(a.totalCo2/1000).toFixed(1)} t`} sub="YTD emissions" color="emerald" />
        <Kpi icon={<Plane className="w-5 h-5" />} label="Air Freight" value={`${(a.co2Air/1000).toFixed(1)} t`} sub={`${total?Math.round(a.co2Air/total*100):0}% of footprint`} color="blue" />
        <Kpi icon={<Ship className="w-5 h-5" />} label="Sea Freight" value={`${(a.co2Sea/1000).toFixed(1)} t`} sub={`${total?Math.round(a.co2Sea/total*100):0}% of footprint`} color="indigo" />
        <Kpi icon={<Truck className="w-5 h-5" />} label="Road / Trucking" value={`${(a.co2Road/1000).toFixed(1)} t`} sub={`${total?Math.round(a.co2Road/total*100):0}% of footprint`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-500" /> Emissions by Mode (GLEC Framework)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            CO₂e calculated using GLEC-aligned emission factors: air 602 g/t·km, sea 15 g/t·km, road 110 g/t·km.
          </p>
          <div className="space-y-4">
            {[
              { label: 'Air Freight', val: a.co2Air/1000, color: 'bg-blue-500' },
              { label: 'Sea Freight', val: a.co2Sea/1000, color: 'bg-indigo-500' },
              { label: 'Road / Trucking', val: a.co2Road/1000, color: 'bg-amber-500' },
            ].map((m, i, arr) => {
              const max = Math.max(...arr.map(x=>x.val), 0.1);
              return (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{m.label}</span>
                    <span className="font-semibold">{m.val.toFixed(1)} t CO₂e</span>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{width: `${(m.val/max)*100}%`}} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🌍 Carbon Intensity</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="text-xs uppercase opacity-80">g CO₂ per tonne-km (blended)</div>
              {(() => {
                const totalTkm = (a.totalWeightT) * 10000; // rough weighted avg distance
                const blended = totalTkm > 0 ? (a.totalCo2 * 1000) / totalTkm : 0;
                return (
                  <>
                    <div className="text-4xl font-bold mt-1">{blended.toFixed(0)}</div>
                    <div className="text-sm opacity-80 mt-1">g CO₂e / t·km blended average</div>
                  </>
                );
              })()}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20">
                <div className="font-bold text-blue-700 dark:text-blue-300">602</div>
                <div className="text-slate-500">Air (g/t·km)</div>
              </div>
              <div className="p-3 rounded bg-indigo-50 dark:bg-indigo-900/20">
                <div className="font-bold text-indigo-700 dark:text-indigo-300">15</div>
                <div className="text-slate-500">Sea (g/t·km)</div>
              </div>
              <div className="p-3 rounded bg-amber-50 dark:bg-amber-900/20">
                <div className="font-bold text-amber-700 dark:text-amber-300">110</div>
                <div className="text-slate-500">Road (g/t·km)</div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Sea freight is ~40× more carbon-efficient than air. Shift more volume to ocean to reduce footprint.
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">🌱 Decarbonization Targets</h3>
        <div className="space-y-4">
          {[
            { label: 'Shift 10% air volume to sea (YoY)', pct: 35, target: 'Target: 10% by Q4' },
            { label: 'Sustainable aviation fuel (SAF) uptake', pct: 8, target: 'Target: 5% by Q2' },
            { label: 'Electric last-mile delivery (Antananarivo)', pct: 22, target: 'Target: 30% by Q4' },
            { label: 'Carbon offset program enrollment', pct: 60, target: 'Verra VCS registered' },
          ].map(t => (
            <div key={t.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{t.label}</span>
                <span className="text-xs text-slate-500">{t.target}</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" style={{width: `${t.pct}%`}} />
              </div>
              <div className="text-xs text-right text-slate-500 mt-0.5">{t.pct}%</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function PlRow({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? 'font-semibold' : ''} ${highlight ? 'text-emerald-600 text-base' : 'text-slate-700 dark:text-slate-300'}`}>
      <span>{label}</span>
      <span className={value < 0 ? 'text-rose-600' : ''}>{formatMoney(Math.abs(value))}</span>
    </div>
  );
}

function FunnelCard({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color: string }) {
  const colors: Record<string,string> = {
    blue: 'from-blue-500 to-brand', emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-pink-600',
    indigo: 'from-indigo-500 to-violet-600', violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className={`p-4 rounded-lg bg-gradient-to-br ${colors[color]} text-white shadow-sm`}>
      <div className="text-xs opacity-90 uppercase font-semibold tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs opacity-80 mt-0.5">{sub}</div>}
    </div>
  );
}

function SnapshotCard({ label, value, icon, sub }: { label: string; value: React.ReactNode; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 mb-2">{icon}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{label}</div>
      <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
