'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Select, Field, Modal, Input } from '@/components/ui';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import type { WarehouseReceipt, WhsStatus } from '@/lib/types';
import { useQueryParams } from '@/lib/useQueryParams';
import {
  Warehouse, Plus, Package, Snowflake, AlertTriangle, Truck, ArrowRight,
  ClipboardCheck, CheckCircle2, Clock, MapPin, Thermometer, Download, QrCode,
  ArrowLeft, Boxes, Container, Layers
} from 'lucide-react';
import { formatDate, formatDateTime, titleCase } from '@/lib/utils';

const STATUS_LIST: WhsStatus[] = ['expected', 'arrived', 'unloaded', 'received', 'putaway', 'picked', 'stuffed', 'stripped', 'released', 'loaded_out'];

const STATUS_META: Record<WhsStatus, { label: string; color: 'blue'|'emerald'|'amber'|'rose'|'violet'|'indigo'|'slate' }> = {
  expected: { label: 'Expected', color: 'slate' },
  arrived: { label: 'Arrived', color: 'blue' },
  unloaded: { label: 'Unloaded', color: 'indigo' },
  received: { label: 'Received', color: 'violet' },
  putaway: { label: 'Put away', color: 'emerald' },
  picked: { label: 'Picked', color: 'amber' },
  stuffed: { label: 'Stuffed', color: 'indigo' },
  stripped: { label: 'Stripped', color: 'violet' },
  released: { label: 'Released', color: 'emerald' },
  loaded_out: { label: 'Loaded out', color: 'emerald' },
};

const ZONE_COLORS: Record<string, string> = {
  CFS_EXPORT: 'bg-blue-50 text-blue-700 border-blue-200',
  CFS_IMPORT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REEFER: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  DG_LOCKER: 'bg-rose-50 text-rose-700 border-rose-200',
  YARD: 'bg-amber-50 text-amber-700 border-amber-200',
  BAY_A: 'bg-slate-50 text-slate-700 border-slate-200',
  BAY_B: 'bg-slate-50 text-slate-700 border-slate-200',
  BAY_C: 'bg-slate-50 text-slate-700 border-slate-200',
  QC: 'bg-violet-50 text-violet-700 border-violet-200',
  DOOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function WarehousePage() {
  const router = useRouter();
  const params = useQueryParams();
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
  }, [params]);

  const receipts = useMemo(() => {
    if (!data) return [];
    return data.warehouseReceipts.filter((w) => zoneFilter === 'all' ? true : w.zone === zoneFilter);
  }, [data, zoneFilter]);

  const stats = useMemo(() => {
    if (!data) return null;
    const expected = data.warehouseReceipts.filter(w => w.status === 'expected').length;
    const onHand = data.warehouseReceipts.filter(w => ['received','putaway','picked'].includes(w.status)).length;
    const dg = data.warehouseReceipts.filter(w => w.dangerous).length;
    const reefer = data.warehouseReceipts.filter(w => w.temperature !== undefined).length;
    const totalPieces = data.warehouseReceipts.reduce((s, w) => s + w.pieces, 0);
    const totalWeight = data.warehouseReceipts.reduce((s, w) => s + w.weightKg, 0);
    return { expected, onHand, dg, reefer, totalPieces, totalWeight };
  }, [data]);

  const detailId = params.get('id');
  const selected = data && detailId ? data.warehouseReceipts.find(w => w.id === detailId) || null : null;

  const advance = (id: string, stage: WhsStatus, msg: string) => {
    db.advanceWarehouseReceipt(id, stage, msg, 'Current User');
    setData(db.getAll());
  };

  if (!data || !stats) return <PageShell title="Warehouse"><div>Loading…</div></PageShell>;

  if (selected) {
    const items = db.itemsForReceipt(selected.id);
    return (
      <PageShell title={selected.number} subtitle={`${titleCase(selected.type)} · ${selected.commodity}`}>
        <Button variant="ghost" onClick={() => router.push('/warehouse/')}>
          <ArrowLeft className="w-4 h-4" /> Back to warehouse
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg text-slate-900 dark:text-white">{selected.number}</span>
                    <Badge color={selected.dangerous ? 'rose' : 'blue'}>
                      {selected.dangerous ? <AlertTriangle className="w-3 h-3" /> : null}
                      {titleCase(selected.type)}
                    </Badge>
                    <Badge color={STATUS_META[selected.status].color}>{STATUS_META[selected.status].label}</Badge>
                    {selected.temperature !== undefined && (
                      <Badge color="blue"><Thermometer className="w-3 h-3" />{selected.temperature}°C</Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{selected.customerName} · {selected.commodity}</div>
                </div>
                <Badge className={`border ${ZONE_COLORS[selected.zone] || ''}`}>{selected.zone.replace('_', ' ')}</Badge>
              </div>

              {/* Progress stepper */}
              <div className="mb-5 overflow-x-auto">
                <div className="flex items-center gap-1 min-w-[620px]">
                  {STATUS_LIST.map((st, i) => {
                    const stages = selected.type === 'cfs_stuff'
                      ? ['expected','arrived','unloaded','received','putaway','stuffed','loaded_out']
                      : selected.type === 'cfs_strip'
                      ? ['expected','arrived','unloaded','received','stripped','released']
                      : ['expected','arrived','unloaded','received','putaway','released'];
                    const idx = stages.indexOf(st);
                    if (idx < 0) return null;
                    const current = stages.indexOf(selected.status);
                    const done = idx <= current;
                    return (
                      <div key={st} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 ${
                            done ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-600'
                          }`}>{idx+1}</div>
                          <div className={`mt-1 text-[9px] font-semibold uppercase text-center ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                            {STATUS_META[st].label}
                          </div>
                        </div>
                        {i < stages.length - 1 && <div className={`h-0.5 flex-1 ${idx < current ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick advance actions */}
              <div className="flex flex-wrap gap-2">
                {selected.status === 'expected' && (
                  <Button onClick={() => advance(selected.id, 'arrived', 'Truck arrived at dock door')}>
                    <Truck className="w-4 h-4" /> Register Arrival
                  </Button>
                )}
                {selected.status === 'arrived' && (
                  <Button onClick={() => advance(selected.id, 'unloaded', 'Cargo unloaded from trailer')}>
                    <Boxes className="w-4 h-4" /> Confirm Unload
                  </Button>
                )}
                {selected.status === 'unloaded' && (
                  <Button onClick={() => advance(selected.id, 'received', 'Quantity & condition check complete')}>
                    <ClipboardCheck className="w-4 h-4" /> Confirm Receipt
                  </Button>
                )}
                {selected.status === 'received' && (
                  <Button variant="outline" onClick={() => advance(selected.id, 'putaway', 'Cargo placed into assigned location')}>
                    <Layers className="w-4 h-4" /> Put Away
                  </Button>
                )}
                {selected.type === 'cfs_strip' && selected.status === 'unloaded' && (
                  <Button variant="outline" onClick={() => advance(selected.id, 'stripped', 'Container devanned')}>
                    <Container className="w-4 h-4" /> Confirm Devan
                  </Button>
                )}
                {(selected.status === 'putaway' || selected.status === 'picked' || selected.status === 'stripped') && (
                  <Button onClick={() => advance(selected.id, 'released', 'Cargo released to consignee / carrier')}>
                    <CheckCircle2 className="w-4 h-4" /> Release Cargo
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="w-4 h-4" /> Print WHR
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand" /> Cargo Items ({items.length})
              </h3>
              {items.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">No piece-level items scanned yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-2 font-semibold">Label</th>
                        <th className="text-left py-2 px-2 font-semibold">Description</th>
                        <th className="text-right py-2 px-2 font-semibold">Weight (kg)</th>
                        <th className="text-left py-2 px-2 font-semibold">Dims (cm)</th>
                        <th className="text-left py-2 px-2 font-semibold">HS Code</th>
                        <th className="text-left py-2 px-2 font-semibold">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(it => (
                        <tr key={it.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 px-2 font-mono font-semibold text-slate-900 dark:text-white">{it.pieceLabel}</td>
                          <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{it.description}</td>
                          <td className="py-2 px-2 text-right">{it.weightKg.toFixed(1)}</td>
                          <td className="py-2 px-2 text-slate-500">{it.dimsCm || '—'}</td>
                          <td className="py-2 px-2 font-mono text-violet-600">{it.hsCode || '—'}</td>
                          <td className="py-2 px-2"><Badge>{it.location || 'unassigned'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <Info label="Customer" value={selected.customerName} />
                <Info label="Location" value={selected.location} icon={<MapPin className="w-4 h-4 text-slate-400" />} />
                <Info label="Zone" value={<Badge className={ZONE_COLORS[selected.zone] || ''}>{selected.zone.replace('_',' ')}</Badge>} />
                {selected.containerNumber && <Info label="Container" value={<span className="font-mono">{selected.containerNumber}</span>} />}
                {selected.sealNumber && <Info label="Seal" value={<span className="font-mono">{selected.sealNumber}</span>} />}
                {selected.marksAndNumbers && <Info label="Marks & Nos." value={selected.marksAndNumbers} />}
                {selected.temperature !== undefined && <Info label="Temp" value={`${selected.temperature}°C`} icon={<Thermometer className="w-4 h-4 text-cyan-500" />} />}
                <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
                <Info label="Pieces" value={selected.pieces.toLocaleString()} icon={<Package className="w-4 h-4" />} />
                <Info label="Weight" value={`${selected.weightKg.toLocaleString()} kg`} />
                <Info label="Volume" value={`${selected.volumeCbm.toFixed(1)} CBM`} />
                {selected.etaDate && <Info label="ETA" value={formatDate(selected.etaDate)} icon={<Clock className="w-4 h-4" />} />}
                {selected.arrivedAt && <Info label="Arrived" value={formatDateTime(selected.arrivedAt)} />}
                {selected.releasedAt && <Info label="Released" value={formatDateTime(selected.releasedAt)} />}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Event Log</h3>
              <div className="space-y-2">
                {selected.events.map((e, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded bg-slate-50 dark:bg-slate-800/40 text-sm">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${i === selected.events.length - 1 ? 'bg-brand animate-pulse' : 'bg-slate-300'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">{titleCase(e.stage)} {e.officer ? <span className="text-xs text-slate-500">· {e.officer}</span> : null}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{e.message}</div>
                      <div className="text-[11px] text-slate-400">{formatDate(e.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Warehouse / CFS" subtitle="Container freight station, receiving, put-away, stuffing & stripping.">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={<Warehouse className="w-5 h-5" />} label="Expected" value={stats.expected} color="blue" />
        <StatCard icon={<Package className="w-5 h-5" />} label="On Hand" value={stats.onHand} color="emerald" />
        <StatCard icon={<Snowflake className="w-5 h-5" />} label="Reefer" value={stats.reefer} color="cyan" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Dangerous" value={stats.dg} color="rose" />
        <StatCard icon={<Boxes className="w-5 h-5" />} label="Pieces" value={stats.totalPieces.toLocaleString()} color="indigo" />
        <StatCard icon={<QrCode className="w-5 h-5" />} label="Weight (t)" value={(stats.totalWeight/1000).toFixed(1)} color="amber" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
          <button onClick={() => setZoneFilter('all')} className={`px-3 py-1.5 text-sm rounded-md font-medium ${zoneFilter==='all' ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-600 dark:text-slate-400'}`}>All Zones ({data.warehouseReceipts.length})</button>
          {['CFS_EXPORT','CFS_IMPORT','REEFER','DG_LOCKER','YARD'].map(z => {
            const n = data.warehouseReceipts.filter(w=>w.zone===z).length;
            if (n===0) return null;
            return (
              <button key={z} onClick={() => setZoneFilter(z)} className={`px-3 py-1.5 text-sm rounded-md font-medium ${zoneFilter===z ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-600 dark:text-slate-400'}`}>
                {z.replace('_',' ')} ({n})
              </button>
            );
          })}
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New WHR</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map(w => (
          <Card key={w.id} className="p-5 cursor-pointer hover:shadow-md transition" onClick={() => router.push(`/warehouse/?id=${w.id}`)}>
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white">{w.number}</span>
                  <Badge color={STATUS_META[w.status].color}>{STATUS_META[w.status].label}</Badge>
                </div>
                <div className="text-sm text-slate-500 mt-0.5">{w.customerName}</div>
              </div>
              {w.dangerous && <Badge color="rose"><AlertTriangle className="w-3 h-3" />DG</Badge>}
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{w.commodity} · {w.pieces} pcs · {w.weightKg.toLocaleString()}kg</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{w.location}</span>
              </div>
              {w.containerNumber && (
                <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Container className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{w.containerNumber}</span>
                </div>
              )}
              {w.temperature !== undefined && (
                <div className="text-cyan-600 flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  <span>Reefer at {w.temperature}°C</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Badge className={ZONE_COLORS[w.zone] || ''}>{w.zone.replace('_',' ')}</Badge>
              <span className="text-xs text-brand font-medium">Open WHR →</span>
            </div>
          </Card>
        ))}
      </div>

      <NewWhrModal open={modalOpen} onClose={() => setModalOpen(false)} data={data} onCreated={() => { setData(db.getAll()); setModalOpen(false); }} />
    </PageShell>
  );
}

function Info({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs uppercase text-slate-500 flex items-center gap-1">{icon}{label}</span>
      <span className="text-slate-900 dark:text-white font-medium text-right">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  const colors: Record<string,string> = {
    blue: 'from-blue-500 to-brand', emerald: 'from-emerald-500 to-teal-600',
    cyan: 'from-cyan-500 to-sky-600', rose: 'from-rose-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600', indigo: 'from-indigo-500 to-violet-600',
  };
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-slate-500 font-semibold tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white truncate">{value}</div>
      </div>
    </Card>
  );
}

function NewWhrModal({ open, onClose, data, onCreated }: { open: boolean; onClose: () => void; data: DB; onCreated: () => void }) {
  const [type, setType] = useState<'inbound'|'outbound'|'cfs_stuff'|'cfs_strip'>('inbound');
  const [customerName, setCustomerName] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [commodity, setCommodity] = useState('');
  const [pieces, setPieces] = useState('0');
  const [weight, setWeight] = useState('0');
  const [volume, setVolume] = useState('0');
  const [zone, setZone] = useState('CFS_IMPORT');
  const [location, setLocation] = useState('Bay A, Dock 3');
  const [etaDate, setEtaDate] = useState(new Date().toISOString().slice(0,10));

  useEffect(() => {
    if (type.startsWith('cfs_')) setZone(type === 'cfs_stuff' ? 'CFS_EXPORT' : 'CFS_IMPORT');
    else setZone(type === 'inbound' ? 'CFS_IMPORT' : 'CFS_EXPORT');
  }, [type]);

  const submit = () => {
    db.createWarehouseReceipt({
      type, customerName, shipmentId: shipmentId || undefined,
      commodity, status: 'expected', location, zone: zone as any,
      pieces: Number(pieces), weightKg: Number(weight), volumeCbm: Number(volume),
      etaDate,
    });
    onCreated();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Warehouse Receipt" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value as any)}>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="cfs_stuff">CFS Stuff (export)</option>
              <option value="cfs_strip">CFS Strip (import)</option>
            </Select>
          </Field>
          <Field label="Customer"><Input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Customer name" /></Field>
          <Field label="Linked Shipment">
            <Select value={shipmentId} onChange={e=>setShipmentId(e.target.value)}>
              <option value="">— None —</option>
              {data.shipments.map(s => <option key={s.id} value={s.id}>{s.reference} — {s.customerName}</option>)}
            </Select>
          </Field>
          <Field label="ETA Date"><Input type="date" value={etaDate} onChange={e=>setEtaDate(e.target.value)} /></Field>
        </div>
        <Field label="Commodity"><Input value={commodity} onChange={e=>setCommodity(e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Pieces"><Input type="number" value={pieces} onChange={e=>setPieces(e.target.value)} /></Field>
          <Field label="Weight (kg)"><Input type="number" value={weight} onChange={e=>setWeight(e.target.value)} /></Field>
          <Field label="Volume (CBM)"><Input type="number" step="0.1" value={volume} onChange={e=>setVolume(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Zone">
            <Select value={zone} onChange={e=>setZone(e.target.value)}>
              {['CFS_EXPORT','CFS_IMPORT','REEFER','DG_LOCKER','YARD','BAY_A','BAY_B','BAY_C','QC','DOOR'].map(z =>
                <option key={z} value={z}>{z.replace('_',' ')}</option>
              )}
            </Select>
          </Field>
          <Field label="Location"><Input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Bay B, Position 14" /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!customerName || !commodity}>Create WHR</Button>
        </div>
      </div>
    </Modal>
  );
}
