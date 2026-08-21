'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Modal, Field, Input, Select } from '@/components/ui';
import { db } from '@/lib/store';
import type { YardSlot, YardMove, YardMoveType } from '@/lib/types';
import {
  Grid3x3, Truck, Ship, Clock, AlertTriangle, Plus, ArrowUpRight,
  ArrowDownLeft, PackageCheck, PackageX, RefreshCcw
} from 'lucide-react';
import { formatDateTime, titleCase } from '@/lib/utils';

const ZONE_COLORS: Record<string,string> = {
  import_full: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  export_full: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  empty: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700',
  reefer: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  dg: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  awaiting_inspection: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
};

const MOVE_ICON: Record<YardMoveType, React.ReactNode> = {
  gate_in: <ArrowDownLeft className="w-4 h-4" />,
  gate_out: <ArrowUpRight className="w-4 h-4" />,
  yard_shift: <RefreshCcw className="w-4 h-4" />,
  mounted_to_truck: <Truck className="w-4 h-4" />,
  discharged_from_vessel: <Ship className="w-4 h-4" />,
  loaded_to_vessel: <Ship className="w-4 h-4" />,
};

export default function YardPage() {
  const [slots, setSlots] = useState<YardSlot[]>([]);
  const [moves, setMoves] = useState<YardMove[]>([]);
  const [showMove, setShowMove] = useState(false);
  const [filter, setFilter] = useState<'all'|'occupied'|'reefer'|'dg'|'longdwell'|'empty'>('all');

  const refresh = () => {
    setSlots(db.allYardSlots());
    setMoves(db.allYardMoves());
  };
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, []);

  const stats = {
    total: slots.length,
    occupied: slots.filter(s => s.container).length,
    free: slots.filter(s => !s.container).length,
    longDwell: slots.filter(s => s.container && (s.dwellHours||0) > 72).length,
    reefers: slots.filter(s => s.reefer && s.container).length,
    dg: slots.filter(s => s.dg && s.container).length,
  };

  const filtered = slots.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'occupied') return !!s.container;
    if (filter === 'empty') return !s.container;
    if (filter === 'reefer') return s.reefer;
    if (filter === 'dg') return s.dg;
    if (filter === 'longdwell') return !!s.container && (s.dwellHours||0) > 72;
    return true;
  });

  // Group by row letter
  const byRow: Record<string, YardSlot[]> = {};
  filtered.forEach(s => {
    const L = s.code.split('-')[0];
    byRow[L] = byRow[L] || [];
    byRow[L].push(s);
  });

  return (
    <PageShell title="Container Yard (Toamasina)" subtitle="Live yard plan, gate moves & dwell-time monitoring">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile icon={<Grid3x3 className="w-5 h-5" />} label="Total Slots" value={stats.total} color="slate" />
          <StatTile icon={<PackageCheck className="w-5 h-5" />} label="Occupied" value={stats.occupied} color="blue" />
          <StatTile icon={<PackageX className="w-5 h-5" />} label="Free" value={stats.free} color="emerald" />
          <StatTile icon={<Clock className="w-5 h-5" />} label=">72h Dwell" value={stats.longDwell} color={stats.longDwell>0?'rose':'slate'} />
          <StatTile icon={<div className="w-5 h-5 bg-cyan-400 rounded" />} label="Reefers" value={stats.reefers} color="cyan" />
          <StatTile icon={<AlertTriangle className="w-5 h-5" />} label="DG Units" value={stats.dg} color="amber" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
            {(['all','occupied','empty','reefer','dg','longdwell'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${filter === f ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {f.replace('longdwell','>72h dwell')}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowMove(true)}><Plus className="w-4 h-4" /> Record Move</Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="p-5 xl:col-span-2">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-brand" /> Yard Plan
              <span className="text-xs font-normal text-slate-500 ml-1">(click a slot to see container)</span>
            </h3>
            <div className="space-y-1.5 overflow-x-auto">
              {Object.keys(byRow).sort().map(row => (
                <div key={row} className="flex items-center gap-1.5">
                  <div className="w-6 text-xs font-bold text-slate-400 text-right">{row}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {byRow[row].sort((a,b) => parseInt(a.code.split('-')[1]) - parseInt(b.code.split('-')[1])).map(s => (
                      <div
                        key={s.code}
                        title={`${s.code} — ${s.container || 'EMPTY'} (${s.zone}${s.dwellHours?` · ${s.dwellHours}h dwell`:''})`}
                        className={`w-12 h-10 rounded-md border flex flex-col items-center justify-center text-[9px] font-mono font-bold cursor-pointer transition-all hover:scale-110 hover:shadow-md ${s.container ? ZONE_COLORS[s.zone] : 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 text-slate-300 dark:text-slate-600'} ${s.container && (s.dwellHours||0) > 72 ? 'ring-2 ring-rose-400 animate-pulse' : ''}`}
                      >
                        <div>{s.code.split('-')[1]}</div>
                        {s.container && <div className="text-[8px] opacity-80 leading-none">{s.container.slice(0,4)}</div>}
                        {s.reefer && s.container && <div className="text-[7px] text-cyan-600">❄</div>}
                        {s.dg && s.container && <div className="text-[7px] text-rose-600">☢</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 text-xs">
              {Object.entries(ZONE_COLORS).map(([z, c]) => (
                <span key={z} className={`px-2 py-1 rounded border font-semibold ${c}`}>{z.replace('_',' ')}</span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" /> Recent Yard Moves
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {moves.length === 0 ? (
                <p className="text-sm text-slate-500">No moves recorded yet.</p>
              ) : moves.slice(0, 20).map(m => (
                <div key={m.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                      {MOVE_ICON[m.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{m.containerNumber}</span>
                        <Badge color="slate">{titleCase(m.type.replace(/_/g,' '))}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.location}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span>{formatDateTime(m.time)}</span>
                        {m.truckPlate && <span>🚛 {m.truckPlate}</span>}
                        {m.vesselRef && <span>🚢 {m.vesselRef}</span>}
                        {m.officer && <span className="ml-auto">{m.officer}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {showMove && <NewMoveModal onClose={() => setShowMove(false)} onCreated={() => { setShowMove(false); refresh(); }} />}
      </div>
    </PageShell>
  );
}

function StatTile({icon,label,value,color}:{icon:React.ReactNode;label:string;value:React.ReactNode;color:string}) {
  const colors: Record<string,string> = {
    slate:'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue:'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    emerald:'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    amber:'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    rose:'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    cyan:'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
  };
  return (
    <Card className={`p-4 flex items-center gap-3 ${colors[color]}`}>
      <div className="w-10 h-10 rounded-lg bg-white/40 dark:bg-black/20 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </Card>
  );
}

function NewMoveModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) {
  const [type, setType] = useState<YardMoveType>('gate_in');
  const [container, setContainer] = useState('');
  const [location, setLocation] = useState('');
  const [truck, setTruck] = useState('');
  const [vessel, setVessel] = useState('');
  const [officer, setOfficer] = useState('');
  const [sealed, setSealed] = useState(true);
  const submit = () => {
    if (!container || !location) return;
    db.recordYardMove({
      type, containerNumber: container.toUpperCase(), location,
      terminal: 'Toamasina Intl Container Terminal',
      truckPlate: truck || undefined,
      vesselRef: vessel || undefined,
      officer: officer || undefined,
      sealed,
    });
    onCreated();
  };
  return (
    <Modal open={true} onClose={onClose} title="Record Yard Move" size="md">
      <div className="space-y-3">
        <Field label="Move Type">
          <Select value={type} onChange={(e) => setType(e.target.value as YardMoveType)}>
            <option value="gate_in">Gate In (truck arriving)</option>
            <option value="gate_out">Gate Out (truck leaving)</option>
            <option value="discharged_from_vessel">Discharged from Vessel</option>
            <option value="loaded_to_vessel">Loaded to Vessel</option>
            <option value="mounted_to_truck">Mounted to Truck</option>
            <option value="yard_shift">Yard Shift (rehandle)</option>
          </Select>
        </Field>
        <Field label="Container Number"><Input value={container} onChange={e => setContainer(e.target.value)} placeholder="MSKU1234567" /></Field>
        <Field label="Location / Slot"><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Gate 1, B-14, Berth 3" /></Field>
        <div className="grid grid-cols-2 gap-3">
          {(type === 'gate_in' || type === 'gate_out' || type === 'mounted_to_truck') && (
            <Field label="Truck Plate"><Input value={truck} onChange={e => setTruck(e.target.value)} placeholder="1234 TAA" /></Field>
          )}
          {(type === 'discharged_from_vessel' || type === 'loaded_to_vessel') && (
            <Field label="Vessel / Voyage"><Input value={vessel} onChange={e => setVessel(e.target.value)} placeholder="MAERSK EMDEN/042E" /></Field>
          )}
          <Field label="Officer"><Input value={officer} onChange={e => setOfficer(e.target.value)} placeholder="Your name" /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={sealed} onChange={e => setSealed(e.target.checked)} className="rounded" />
          Seal intact / applied
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!container||!location}><Plus className="w-4 h-4" /> Record Move</Button>
        </div>
      </div>
    </Modal>
  );
}
