'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, StatCard, Badge, Button } from '@/components/ui';
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
} from 'lucide-react';
// 'TrendUp' was a typo alias:
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
  const router = useRouter();

  useEffect(() => {
    setData(db.getAll());
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
    const air = data.shipments.filter((s) => s.mode === 'air').length;
    const sea = data.shipments.filter((s) => s.mode === 'sea').length;
    // P&L estimate
    const pipelineRevenue = data.shipments.filter(s => s.status !== 'cancelled' && s.status !== 'delivered').reduce((sum, s) => sum + s.totalAmount, 0);
    const estGrossProfit = data.shipments.reduce((sum, s) => {
      const cost = s.totalAmount * 0.80; // rough blended cost baseline
      return sum + (s.totalAmount - cost);
    }, 0);
    const totalCo2 = data.shipments.reduce((sum, s) => sum + (s.co2e || 0), 0);
    const confirmedBookings = data.bookings.filter((b) => b.status === 'confirmed').length;
    const pendingBookings = data.bookings.filter((b) => b.status === 'requested').length;
    const emailsOpened = data.emails.filter((e) => e.status === 'opened' || e.status === 'clicked').length;
    const emailOpenRate = data.emails.length ? Math.round(emailsOpened / data.emails.length * 100) : 0;
    return {
      total: data.shipments.length,
      active: active.length,
      inTransit,
      inCustoms,
      pendingTrucking,
      revenue,
      outstanding,
      air,
      sea,
      pipelineRevenue,
      estGrossProfit,
      totalCo2,
      confirmedBookings,
      pendingBookings,
      emailsSent: data.emails.length,
      emailOpenRate,
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
    }
  };

  return (
    <PageShell
      title="Dashboard"
      subtitle={`Welcome back. You have ${stats.active} active shipments today.`}
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
        <Button variant="ghost" onClick={() => { if (confirm('Reset demo data?')) { localStorage.removeItem('freightflow_auth_v1'); db.reset(); location.reload(); } }} className="shrink-0">
          Reset
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Shipments"
          value={stats.active}
          sub={`${stats.total} total · ${stats.air} air / ${stats.sea} sea`}
          icon={<Package className="w-6 h-6" />}
          accent="blue"
        />
        <StatCard
          label="In Transit"
          value={stats.inTransit}
          sub="Vessels & flights currently underway"
          icon={<Ship className="w-6 h-6" />}
          accent="indigo"
        />
        <StatCard
          label="In Customs"
          value={stats.inCustoms}
          sub="Awaiting clearance or inspection"
          icon={<ShieldCheck className="w-6 h-6" />}
          accent="amber"
        />
        <StatCard
          label="Trucking Dispatches"
          value={stats.pendingTrucking}
          sub="Scheduled / en route"
          icon={<Truck className="w-6 h-6" />}
          accent="violet"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Paid Revenue (YTD)"
          value={formatMoney(stats.revenue)}
          sub="Across paid invoices"
          icon={<DollarSign className="w-6 h-6" />}
          accent="emerald"
        />
        <StatCard
          label="Est. Gross Profit"
          value={formatMoney(stats.estGrossProfit)}
          sub="~20% blended margin"
          icon={<TrendUp />}
          accent="emerald"
        />
        <StatCard
          label="Pipeline (Active)"
          value={formatMoney(stats.pipelineRevenue)}
          sub="Booked, in-transit, customs"
          icon={<ArrowUpRight className="w-6 h-6" />}
          accent="indigo"
        />
        <StatCard
          label="Shipment CO₂e"
          value={`${(stats.totalCo2 / 1000).toFixed(1)} t`}
          sub={`${data.shipments.length} active jobs`}
          icon={<Leaf />}
          accent="emerald"
        />
      </div>

      <Card className="p-5 bg-gradient-to-r from-brand to-brand-dark text-white border-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <Award /> Competitive Benchmark
          </div>
          <div className="text-xl font-bold mt-1">How does FreightFlow compare to CargoWise?</div>
          <p className="text-white/80 text-sm mt-1 max-w-2xl">
            Feature-by-feature matrix against the industry leader — 98% cost savings for SME forwarders.
          </p>
        </div>
        <Link href="/benchmark">
          <Button variant="secondary" className="bg-white text-brand hover:bg-slate-100">
            View Benchmark <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming shipments */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Upcoming Shipments</h2>
            <Link href="/shipments" className="text-xs text-brand hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-200">
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
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/shipments/?id=${s.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{s.reference}</div>
                        <div className="text-xs text-slate-500">{s.customerName}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-700">
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
                          <span className={overdue ? 'text-rose-600 font-medium' : 'text-slate-700'}>
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

        {/* Activity feed */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="p-4">
            <ol className="space-y-4 relative">
              <div className="absolute left-[19px] top-1 bottom-1 w-px bg-slate-200" />
              {recentActivity.map((a) => (
                <li key={a.id} className="flex gap-3 relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-white ${activityColor(a.type)}`}
                  >
                    {activityIcon(a.type)}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <p className="text-sm text-slate-700 leading-snug">{a.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(a.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Carrier e-Bookings
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.confirmedBookings} confirmed
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{stats.pendingBookings} awaiting carrier</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Customer Emails
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.emailsSent} sent · {stats.emailOpenRate}% open
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Open/click tracked</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Customs Cleared
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {data.shipments.filter((s) => s.customsStatus === 'cleared').length} shipments
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Issues / Inspections
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {data.shipments.filter((s) => s.customsStatus === 'inspection' || s.customsStatus === 'rejected').length} flagged
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

// Tiny inline icons so we don't add more imports
function ReceiptIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
