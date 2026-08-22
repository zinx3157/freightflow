'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Badge, Select, EmptyState, Button } from '@/components/ui';
import { db } from '@/lib/store';
import type { CustomsStatus } from '@/lib/types';
import type { DB } from '@/lib/store';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import HSOnlineAccess from '@/components/HSOnlineAccess';
import { formatDate, statusColor, titleCase } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const STATUSES: CustomsStatus[] = ['pending', 'docs_received', 'declared', 'inspection', 'duties_paid', 'cleared', 'rejected'];

export default function CustomsPage() {
  const [data, setData] = useState<DB | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const router = useRouter();

  useEffect(() => setData(db.getAll()), []);

  const items = useMemo(() => {
    if (!data) return [];
    return data.shipments
      .filter((s) => s.status !== 'cancelled')
      .filter((s) => (filter === 'all' ? true : s.customsStatus === filter))
      .sort((a, b) => new Date(a.etd).getTime() - new Date(b.etd).getTime());
  }, [data, filter]);

  const stats = useMemo(() => {
    if (!data) return { pending: 0, inspection: 0, cleared: 0, rejected: 0, totalDuties: 0 };
    return {
      pending: data.shipments.filter((s) => ['pending', 'docs_received'].includes(s.customsStatus || '')).length,
      inspection: data.shipments.filter((s) => s.customsStatus === 'inspection' || s.customsStatus === 'declared').length,
      cleared: data.shipments.filter((s) => s.customsStatus === 'cleared').length,
      rejected: data.shipments.filter((s) => s.customsStatus === 'rejected').length,
      totalDuties: data.shipments.reduce((sum, s) => sum + (s.duties || 0), 0),
    };
  }, [data]);

  function update(id: string, status: CustomsStatus) {
    db.updateShipment(id, { customsStatus: status });
    setData(db.getAll());
  }

  if (!data) return <PageShell title="Customs"><div>Loading…</div></PageShell>;

  return (
    <PageShell title="Customs Clearance" subtitle="Monitor and update customs status for all shipments.">
      <HSOnlineAccess query="Madagascar tariff HS code" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={<Clock className="w-5 h-5" />} label="Pending Docs" value={stats.pending} color="amber" />
        <MiniStat icon={<FileText className="w-5 h-5" />} label="In Declaration / Inspection" value={stats.inspection} color="indigo" />
        <MiniStat icon={<CheckCircle2 className="w-5 h-5" />} label="Cleared" value={stats.cleared} color="emerald" />
        <MiniStat icon={<AlertTriangle className="w-5 h-5" />} label="Rejected / Issues" value={stats.rejected} color="rose" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${filter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
          >
            All ({data.shipments.length})
          </button>
          {STATUSES.map((s) => {
            const n = data.shipments.filter((x) => x.customsStatus === s).length;
            if (n === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === s ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                {s.replace('_', ' ')} ({n})
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-12 h-12" />} title="No customs files match this filter" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold">Shipment</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Route</th>
                  <th className="px-4 py-3 text-left font-semibold">Cargo</th>
                  <th className="px-4 py-3 text-left font-semibold">ETA</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Duties</th>
                  <th className="px-4 py-3 text-right font-semibold">Update</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/shipments/?id=${s.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.reference}</div>
                      <div className="text-xs text-slate-500">
                        {s.mode === 'air' ? 'Air' : 'Sea'} · {titleCase(s.direction)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.customerName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.portOfLoading} → {s.portOfDischarge}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{s.commodity}</div>
                      <div className="text-xs text-slate-400">
                        {s.pieces} pc · {s.weight.toLocaleString()}kg · {s.volume} CBM
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(s.eta)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('customs', s.customsStatus || 'pending')}`}>
                        {titleCase(s.customsStatus || 'pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {s.duties ? `$${s.duties.toLocaleString()}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={s.customsStatus || 'pending'}
                        onChange={(e) => update(s.id, e.target.value as CustomsStatus)}
                        className="w-36 inline-block"
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>{titleCase(st)}</option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500 uppercase font-semibold tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </div>
    </Card>
  );
}
