'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, StatCard, Badge, Button } from '@/components/ui';
import { Sparkline, ProgressBar, ProgressRing } from '@/components/Sparkline';
import { ExceptionsCenter } from '@/components/ExceptionsCenter';
import { ProfitabilityAnalytics } from '@/components/ProfitabilityAnalytics';
import { CarrierPerformance } from '@/components/CarrierPerformance';
import { ShipmentKanban } from '@/components/ShipmentKanban';
import { db } from '@/lib/store';
import type { Shipment, Activity } from '@/lib/types';
import type { DB } from '@/lib/store';
import {
  Package,
  Plane,
  Ship,
  Truck,
  ShieldCheck,
  DollarSign,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Award,
  TrendingUp,
  Zap,
  Mail,
  FileDigit,
  LayoutGrid,
  List,
  Target,
} from 'lucide-react';
const TrendUp = TrendingUp;
import { formatMoney, formatDate, formatDateTime, statusColor, titleCase, daysFromNow } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function StatusPill({ kind, status }: { kind: string; status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor(kind, status)}`}>
      {titleCase(status)}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DB | null>(null);
  const [kanbanMode, setKanbanMode] = useState(false);
  const router = useRouter();

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

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.shipments.filter(
      (s) => !['delivered', 'cancelled'].includes(s.status)
    );
    const inTransit = data.shipments.filter((s) => s.status === 'in_transit').length;
    const inCustoms = data.shipments.filter(
      (s) => s.status === 'customs' || s.customsStatus === 'inspection'
    ).length;
    const pendingTrucking = data.trucking.filter(
      (t) => t.status !== 'completed'
    ).length;
    const revenue = data.invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.total, 0);
    const outstanding = data.invoices
      .filter((i) => i.status === 'sent')
      .reduce((s, i) => s + i.total, 0);
    const overdueInvoices = data.invoices.filter((i) => i.status === 'sent' && new Date(i.dueDate) < new Date()).length;
    const air = data.shipments.filter((s) => s.mode === 'air').length;
    const sea = data.shipments.filter((s) => s.mode === 'sea').length;
    const pipelineRevenue = data.shipments.filter(s => s.status !== 'cancelled' && s.status !== 'delivered').reduce((sum, s) => sum + s.totalAmount, 0);
    const estGrossProfit = data.shipments.reduce((sum, s) => {
      const cost = (s.freightCost || s.totalAmount * 0.78) + (s.customsCost || 0) + (s.truckingCost || 0) + (s.otherCost || 0);
      return sum + (s.totalAmount - cost);
    }, 0);
    const totalCo2 = data.shipments.reduce((sum, s) => sum + (s.co2e || 0), 0);
    const confirmedBookings = data.bookings.filter((b) => b.status === 'confirmed').length;
    const pendingBookings = data.bookings.filter((b) => b.status === 'requested').length;
    const emailsOpened = data.emails.filter((e) => e.status === 'opened' || e.status === 'clicked').length;
    const emailOpenRate = data.emails.length ? Math.round(emailsOpened / data.emails.length * 100) : 0;

    // 30-day revenue sparkline (simulated based on paid invoices)
    const now = Date.now();
    const spark: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayRev = data.invoices
        .filter((inv) => inv.status === 'paid' && new Date(inv.paidDate || inv.issueDate) >= dayStart && new Date(inv.paidDate || inv.issueDate) < dayEnd)
        .reduce((s, inv) => s + inv.total, 0);
      spark.push(dayRev || (Math.random() * 2500 + 800));
    }
    // Shipments sparkline (per-day created last 14 days)
    const shipSpark: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const n = data.shipments.filter((s) => new Date(s.createdAt) >= dayStart && new Date(s.createdAt) < dayEnd).length;
      shipSpark.push(n || Math.round(Math.random() * 3 + 1));
    }

    // KPI targets (Magaya/CargoWise style monthly goals)
    const revenueTarget = 200000;
    const shipmentTarget = 50;
    const customerTarget = 15;
    const onTimeTarget = 95;
    const revenueProgress = Math.min(100, (revenue / revenueTarget) * 100);
    const shipmentProgress = Math.min(100, (data.shipments.length / shipmentTarget) * 100);
    const activeCustomers = new Set(data.shipments.map(s => s.customerId)).size;
    const customerProgress = Math.min(100, (activeCustomers / customerTarget) * 100);
    const onTime = Math.round(85 + Math.random() * 12); // simulated

    return {
      total: data.shipments.length,
      active: active.length,
      inTransit,
      inCustoms,
      pendingTrucking,
      revenue,
      outstanding,
      overdueInvoices,
      air,
      sea,
      pipelineRevenue,
      estGrossProfit,
      totalCo2,
      confirmedBookings,
      pendingBookings,
      emailsSent: data.emails.length,
      emailOpenRate,
      revenueSpark: spark,
      shipmentSpark: shipSpark,
      revenueTarget,
      shipmentTarget,
      customerTarget,
      revenueProgress,
      shipmentProgress,
      customerProgress,
      onTime,
      onTimeTarget,
      activeCustomers,
      openApprovals: (data.docApprovals || []).filter(a => a.status === 'pending').length,
    };
  }, [data]);

  if (!data || !stats) {
    return (
      <PageShell title="Dashboard" subtitle="Loading…">
        <div className="text-sm text-slate-500">Loading dashboard…</div>
      </PageShell>
    );
  }

  const upcoming = [...data.shipments]
    .filter((s) => s.status !== 'delivered' && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime())
    .slice(0, 6);

  const recentActivity = data.activities.slice(0, 8);

  const activityIcon = (t: Activity['type']) => {
    switch (t) {
      case 'shipment': return <Package className="w-4 h-4" />;
      case 'customs': return <ShieldCheck className="w-4 h-4" />;
      case 'trucking': return <Truck className="w-4 h-4" />;
      case 'invoice': return <DollarSign className="w-4 h-4" />;
      case 'quote': return <ArrowUpRight className="w-4 h-4" />;
      case 'booking': return <Zap className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'pod': return <CheckCircle2 className="w-4 h-4" />;
      case 'warehouse': return <Package className="w-4 h-4" />;
    }
  };
  const activityColor = (t: Activity['type']) => {
    switch (t) {
      case 'shipment': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
      case 'customs': return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300';
      case 'trucking': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300';
      case 'invoice': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'quote': return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'booking': return 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300';
      case 'email': return 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300';
      case 'pod': return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300';
      case 'warehouse': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <PageShell
      title="Operations Dashboard"
      subtitle={`Welcome back. You have ${stats.active} active shipments · ${stats.overdueInvoices} overdue invoices · ${stats.openApprovals} pending approvals.`}
    >
      {/* Quick actions — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-1 no-scrollbar ff-table-wrap">
        <Button onClick={() => router.push('/shipments?new=1')} className="shrink-0">
          <Package className="w-4 h-4" /> <span className="hidden sm:inline">New Shipment</span><span className="sm:hidden">New</span>
        </Button>
        <Button variant="outline" onClick={() => router.push('/quotes?new=1')} className="shrink-0">
          <ArrowUpRight className="w-4 h-4" /> <span className="hidden sm:inline">Create Quote</span><span className="sm:hidden">Quote</span>
        </Button>
        <Button variant="outline" onClick={() => router.push('/trucking?new=1')} className="shrink-0">
          <Truck className="w-4 h-4" /> <span className="hidden sm:inline">Dispatch Truck</span><span className="sm:hidden">Truck</span>
        </Button>
        <Button variant="outline" onClick={() => router.push('/invoices?new=1')} className="shrink-0">
          <DollarSign className="w-4 h-4" /> <span className="hidden sm:inline">Issue Invoice</span><span className="sm:hidden">Invoice</span>
        </Button>
        <Button variant="outline" onClick={() => router.push('/emails')} className="shrink-0">
          <Mail className="w-4 h-4" /> <span className="hidden sm:inline">Email Center</span><span className="sm:hidden">Email</span>
        </Button>
        <Button variant="ghost" onClick={() => setKanbanMode(!kanbanMode)} className="shrink-0">
          {kanbanMode ? <><List className="w-4 h-4" /> List view</> : <><LayoutGrid className="w-4 h-4" /> Board view</>}
        </Button>
        <Button variant="ghost" onClick={() => { if (confirm('Reset demo data?')) { localStorage.removeItem('freightflow_auth_v1'); db.reset(); location.reload(); } }} className="shrink-0">
          Reset
        </Button>
      </div>

      {/* HERO KPI ROW — CargoWise/GoFreight style: sparkline stat cards + KPI target rings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 overflow-hidden relative bg-gradient-to-br from-brand to-brand-dark text-white border-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/80">Paid Revenue (MTD)</div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{formatMoney(stats.revenue)}</div>
              <div className="text-[11px] text-white/80 mt-0.5">▲ {formatMoney(stats.revenue * 0.12)} vs last month</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <Sparkline data={stats.revenueSpark} color="#ffffff" width={260} height={48} className="absolute bottom-0 left-0 right-0 opacity-80" />
          <div className="h-8" />
        </Card>

        <Card className="p-5 relative overflow-hidden">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Shipments</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{stats.active}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{stats.total} total · {stats.air}✈ {stats.sea}🚢</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <Sparkline data={stats.shipmentSpark} color="#3b82f6" width={240} height={38} />
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <ProgressRing
            value={stats.revenue}
            max={stats.revenueTarget}
            size={88}
            stroke={9}
            color="#10b981"
            label={`${Math.round(stats.revenueProgress)}%`}
            sublabel="of target"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Monthly Revenue Goal</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatMoney(stats.revenue)}</div>
            <div className="text-[11px] text-slate-500">of {formatMoney(stats.revenueTarget)}</div>
            <ProgressBar value={stats.revenue} max={stats.revenueTarget} color="#10b981" showValue={false} size="sm" className="mt-1" />
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <ProgressRing
            value={stats.activeCustomers}
            max={stats.customerTarget}
            size={88}
            stroke={9}
            color="#8b5cf6"
            label={String(stats.activeCustomers)}
            sublabel="customers"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Customers</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatMoney(stats.pipelineRevenue)}</div>
            <div className="text-[11px] text-slate-500">in pipeline</div>
            <ProgressBar value={stats.activeCustomers} max={stats.customerTarget} color="#8b5cf6" showValue={false} size="sm" className="mt-1" />
          </div>
        </Card>
      </div>

      {/* OPERATIONS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Ship className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">In Transit</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.inTransit}</div>
            <div className="text-[10px] text-slate-500">vessels & flights</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">In Customs</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.inCustoms}</div>
            <div className="text-[10px] text-slate-500">awaiting clearance</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Dispatches</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.pendingTrucking}</div>
            <div className="text-[10px] text-slate-500">scheduled / en route</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding AR</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatMoney(stats.outstanding)}</div>
            <div className="text-[10px] text-rose-600 font-semibold">{stats.overdueInvoices} overdue</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 sm:p-5 bg-gradient-to-r from-brand to-brand-dark text-white border-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Target /> KPI Snapshot · On-time delivery: <b>{stats.onTime}%</b>
          </div>
          <div className="text-lg sm:text-xl font-bold mt-1">Beta 9.3 "Pro Ops" — built with the best ideas from CargoWise, GoFreight & Magaya</div>
          <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl">
            Drag-and-drop Kanban boards · proactive Exceptions alerts · Profitability BI · Carrier reliability · Document compliance · Keyboard shortcuts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/benchmark">
            <Button variant="secondary" className="bg-white text-brand hover:bg-slate-100">
              <Award className="w-4 h-4" /> CW Benchmark
            </Button>
          </Link>
          <Link href="/shipments">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              All Shipments <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* KANBAN BOARD on toggle OR upcoming shipments */}
      {kanbanMode ? (
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-brand" /> Shipment Board
              <span className="text-xs font-normal text-slate-500">Drag cards between columns (desktop) or tap quick-move buttons</span>
            </h2>
          </div>
          <ShipmentKanban onOpen={(id) => router.push(`/shipments/?id=${id}`)} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming shipments */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">Upcoming Arrivals</h2>
              <div className="flex gap-2">
                <button onClick={() => setKanbanMode(true)} className="text-xs text-slate-500 hover:text-brand font-medium flex items-center gap-1">
                  <LayoutGrid className="w-3 h-3" /> Board view
                </button>
                <Link href="/shipments" className="text-xs text-brand hover:underline font-medium">
                  View all →
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-5 py-2.5 text-left font-semibold">Reference</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Route</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Mode</th>
                    <th className="px-5 py-2.5 text-left font-semibold">ETA</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((s: Shipment) => {
                    const overdue =
                      s.status !== 'delivered' && new Date(s.eta) < new Date();
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => router.push(`/shipments/?id=${s.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{s.reference}</div>
                          <div className="text-xs text-slate-500">{s.customerName}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-700 dark:text-slate-200">
                            {s.portOfLoading} → {s.portOfDischarge}
                          </div>
                          <div className="text-xs text-slate-400">
                            {s.direction === 'export' ? 'Export' : 'Import'}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {s.mode === 'air' ? (
                            <Badge color="blue">
                              <Plane className="w-3 h-3" /> Air
                            </Badge>
                          ) : (
                            <Badge color="indigo">
                              <Ship className="w-3 h-3" /> Sea
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {overdue ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className={overdue ? 'text-rose-600 font-medium dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}>
                              {formatDate(s.eta)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">{daysFromNow(s.eta)}</div>
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill kind="shipment" status={s.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Exceptions Center — CargoWise proactive alerts */}
          <ExceptionsCenter maxItems={6} />
        </div>
      )}

      {/* SECONDARY GRID: Profitability + Carriers + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProfitabilityAnalytics />
        <CarrierPerformance />
        {/* Activity feed */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Live Activity</h2>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <ol className="space-y-4 relative">
              <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />
              {recentActivity.map((a) => (
                <li key={a.id} className="flex gap-3 relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-white dark:ring-slate-900 ${activityColor(a.type)}`}
                  >
                    {activityIcon(a.type)}
                  </div>
                  <div className="flex-1 pt-1.5 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{a.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* TERTIARY GRID: Operations metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Carrier Bookings
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {stats.confirmedBookings} confirmed
              </div>
              <ProgressBar value={stats.confirmedBookings} max={Math.max(1, stats.confirmedBookings + stats.pendingBookings)} color="#8b5cf6" showValue={false} size="sm" className="mt-1" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.pendingBookings} awaiting carrier response</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Customer Emails
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {stats.emailOpenRate}% open rate
              </div>
              <ProgressBar value={stats.emailOpenRate} max={100} color="#0d9488" showValue={false} size="sm" className="mt-1" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stats.emailsSent} sent · open/click tracked</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                On-time Delivery
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {stats.onTime}%
              </div>
              <ProgressBar value={stats.onTime} max={100} color="#10b981" showValue={false} size="sm" className="mt-1" />
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Target {stats.onTimeTarget}% · rolling 30d</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                CO₂ Footprint
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {(stats.totalCo2 / 1000).toFixed(1)} t
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{data.shipments.length} jobs · GLEC factors</div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}


