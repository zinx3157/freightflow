'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal } from '@/components/ui';
import RateCalculator from '@/components/RateCalculator';
import { db } from '@/lib/store';
import type { RateCard, RateMode, RateUnit } from '@/lib/types';
import { Plus, Edit3, Trash2, Plane, Ship, Truck, TrendingUp, CheckCircle2, Sparkles, List } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import RateShopper from '@/components/RateShopper';

const MODES: { v: RateMode; icon: React.ReactNode; label: string }[] = [
  { v: 'air', icon: <Plane className="w-4 h-4" />, label: 'Air' },
  { v: 'sea', icon: <Ship className="w-4 h-4" />, label: 'Sea' },
  { v: 'road', icon: <Truck className="w-4 h-4" />, label: 'Road' },
];

const UNITS: { v: RateUnit; label: string }[] = [
  { v: 'kg', label: 'Per kg (chargeable)' },
  { v: 'cbm', label: 'Per CBM' },
  { v: 'container_20', label: 'Per 20ft container' },
  { v: 'container_40', label: 'Per 40ft container' },
  { v: 'container_40hc', label: 'Per 40ft HC' },
  { v: 'truck', label: 'Per truck' },
  { v: 'shipment', label: 'Flat per shipment' },
];

function emptyRate(): Omit<RateCard, 'id' | 'createdAt'> {
  const today = new Date();
  const in90 = new Date(); in90.setDate(in90.getDate() + 90);
  return {
    carrier: '',
    mode: 'sea',
    direction: 'export',
    origin: '',
    destination: '',
    validFrom: today.toISOString().slice(0, 10),
    validUntil: in90.toISOString().slice(0, 10),
    buyRate: 0,
    sellRate: 0,
    currency: 'USD',
    unit: 'container_40hc',
    minCharge: 0,
    transitDaysMin: 30,
    transitDaysMax: 40,
    frequency: 'Weekly',
    active: true,
    commodity: 'General',
  };
}

export default function RatesPage() {
  const [rates, setRates] = useState<RateCard[]>([]);
  const [filter, setFilter] = useState<RateMode | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [draft, setDraft] = useState<Omit<RateCard, 'id' | 'createdAt'>>(emptyRate());
  const [tab, setTab] = useState<'cards'|'shopper'>('cards');

  const refresh = () => setRates(db.allRates());
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, []);

  const openNew = (mode?: RateMode) => {
    setEditing(null);
    setDraft({ ...emptyRate(), mode: mode || 'sea' });
    setModalOpen(true);
  };
  const openEdit = (r: RateCard) => { setEditing(r); setDraft(r); setModalOpen(true); };
  const save = () => {
    if (!draft.carrier || !draft.origin || !draft.destination) return;
    if (editing) db.updateRate(editing.id, draft); else db.addRate(draft);
    setModalOpen(false);
    refresh();
  };
  const del = (id: string) => { if (confirm('Delete this rate?')) { db.deleteRate(id); refresh(); } };

  const filtered = rates.filter((r) => filter === 'all' || r.mode === filter).sort((a, b) => b.sellRate - a.sellRate > 0 ? 1 : -1);
  const activeCount = rates.filter((r) => r.active).length;
  const avgMargin = rates.length ? Math.round(rates.reduce((s, r) => s + (r.sellRate - r.buyRate) / r.sellRate * 100, 0) / rates.length) : 0;

  return (
    <PageShell title="Rate Management" subtitle="Buy & sell rates across carriers, lanes and modes — powers instant quoting">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatPill icon={<Plane className="w-5 h-5" />} label="Air rates" value={rates.filter((r) => r.mode === 'air').length} color="blue" />
          <StatPill icon={<Ship className="w-5 h-5" />} label="Sea rates" value={rates.filter((r) => r.mode === 'sea').length} color="indigo" />
          <StatPill icon={<Truck className="w-5 h-5" />} label="Road rates" value={rates.filter((r) => r.mode === 'road').length} color="amber" />
          <StatPill icon={<TrendingUp className="w-5 h-5" />} label="Avg. margin" value={`${avgMargin}%`} color="emerald" />
        </div>

        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          <button onClick={() => setTab('cards')} className={`px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 ${tab==='cards' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
            <List className="w-4 h-4"/> Rate Cards ({activeCount})
          </button>
          <button onClick={() => setTab('shopper')} className={`px-4 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2 ${tab==='shopper' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
            <Sparkles className="w-4 h-4"/> AI Spot Shopper
          </button>
        </div>

        {tab === 'shopper' ? (
          <RateShopper />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="p-4 flex items-center gap-2 flex-wrap border-b border-slate-200 dark:border-slate-800">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/50">
                  <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded text-sm font-medium transition ${filter === 'all' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>All</button>
                  {MODES.map((m) => (
                    <button key={m.v} onClick={() => setFilter(m.v)} className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition ${filter === m.v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                      {m.icon}{m.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <Button size="sm" onClick={() => openNew(filter !== 'all' ? filter as RateMode : 'sea')}><Plus className="w-4 h-4" /> New rate</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                      <th className="px-4 py-3 text-left font-semibold">Lane</th>
                      <th className="px-4 py-3 text-left font-semibold">Mode</th>
                      <th className="px-4 py-3 text-right font-semibold">Buy</th>
                      <th className="px-4 py-3 text-right font-semibold">Sell</th>
                      <th className="px-4 py-3 text-right font-semibold">Margin</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const margin = r.sellRate > 0 ? Math.round((r.sellRate - r.buyRate) / r.sellRate * 100) : 0;
                      const modeIcon = r.mode === 'air' ? <Plane className="w-4 h-4 text-blue-500" /> : r.mode === 'sea' ? <Ship className="w-4 h-4 text-indigo-500" /> : <Truck className="w-4 h-4 text-amber-500" />;
                      return (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{r.carrier}</div>
                            <div className="text-xs text-slate-500">{r.commodity} · {r.frequency}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-700 dark:text-slate-300">{r.origin} → {r.destination}</div>
                            <div className="text-xs text-slate-500">{r.transitDaysMin}-{r.transitDaysMax} days · valid until {r.validUntil}</div>
                          </td>
                          <td className="px-4 py-3"><Badge color={r.mode === 'air' ? 'blue' : r.mode === 'sea' ? 'indigo' : 'amber'}>{modeIcon}{r.mode}</Badge></td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatMoney(r.buyRate, r.currency)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatMoney(r.sellRate, r.currency)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge color={margin >= 20 ? 'emerald' : margin >= 10 ? 'amber' : 'rose'}>{margin}%</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.active ? <Badge color="emerald"><CheckCircle2 className="w-3 h-3" />Active</Badge> : <Badge color="slate">Inactive</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => del(r.id)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-500">No rate cards yet. Add your first rate to enable instant quoting.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div>
            <RateCalculator />
          </div>
        </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit rate: ${editing.carrier}` : 'Add new rate card'} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carrier"><Input value={draft.carrier} onChange={(e) => setDraft({ ...draft, carrier: e.target.value })} placeholder="e.g. Maersk" /></Field>
          <Field label="Commodity"><Input value={draft.commodity || ''} onChange={(e) => setDraft({ ...draft, commodity: e.target.value })} placeholder="General / Pharma / DG" /></Field>
          <Field label="Mode">
            <Select value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as any })}>
              {MODES.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as any })}>
              <option value="export">Export</option>
              <option value="import">Import</option>
              <option value="both">Both</option>
            </Select>
          </Field>
          <Field label="Origin"><Input value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} placeholder="Toamasina" /></Field>
          <Field label="Destination"><Input value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} placeholder="Hamburg" /></Field>
          <Field label="Pricing unit">
            <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as any })}>
              {UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="MGA">MGA</option><option value="GBP">GBP</option>
            </Select>
          </Field>
          <Field label="Buy rate (cost)"><Input type="number" value={draft.buyRate} onChange={(e) => setDraft({ ...draft, buyRate: Number(e.target.value) })} /></Field>
          <Field label="Sell rate (charged)"><Input type="number" value={draft.sellRate} onChange={(e) => setDraft({ ...draft, sellRate: Number(e.target.value) })} /></Field>
          <Field label="Min charge"><Input type="number" value={draft.minCharge || 0} onChange={(e) => setDraft({ ...draft, minCharge: Number(e.target.value) })} /></Field>
          <Field label="Frequency"><Input value={draft.frequency || ''} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="Weekly" /></Field>
          <Field label="Transit min (days)"><Input type="number" value={draft.transitDaysMin || 0} onChange={(e) => setDraft({ ...draft, transitDaysMin: Number(e.target.value) })} /></Field>
          <Field label="Transit max (days)"><Input type="number" value={draft.transitDaysMax || 0} onChange={(e) => setDraft({ ...draft, transitDaysMax: Number(e.target.value) })} /></Field>
          <Field label="Valid from"><Input type="date" value={draft.validFrom} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} /></Field>
          <Field label="Valid until"><Input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} /></Field>
          <div className="col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              Rate is active and available for quoting
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}><CheckCircle2 className="w-4 h-4" /> {editing ? 'Save changes' : 'Add rate'}</Button>
        </div>
      </Modal>
    </PageShell>
  );
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: 'blue' | 'indigo' | 'amber' | 'emerald' }) {
  const grads = {
    blue: 'from-blue-500 to-brand',
    indigo: 'from-indigo-500 to-purple-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
  };
  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${grads[color]} text-white flex items-center justify-center`}>{icon}</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}
