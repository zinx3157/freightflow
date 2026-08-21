'use client';

import { useEffect, useState } from 'react';
import type { Shipment, DGEntry } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Button, Badge, Input, Select, Field, Label } from './ui';
import { AlertTriangle, Plus, Trash2, CheckCircle2, Skull, Flame, Wind, PackageOpen } from 'lucide-react';
import { DG_LIBRARY, classColor, lookupUN } from '@/lib/dgr';

export default function DangerousGoodsPanel({ shipment }: { shipment: Shipment }) {
  const [entries, setEntries] = useState<DGEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [unQuery, setUnQuery] = useState('');
  const [unHits, setUnHits] = useState<typeof DG_LIBRARY>([]);
  const [draft, setDraft] = useState<Partial<DGEntry>>({
    shipmentId: shipment.id,
    dgClass: '9',
    packingGroup: 'II',
    packages: 1,
    netWeightKg: 0,
    grossWeightKg: 0,
    sdsAttached: false,
    declarationAttached: false,
    approved: false,
  });

  const refresh = () => setEntries(db.dgForShipment(shipment.id));
  useEffect(() => { refresh(); const on = () => refresh(); window.addEventListener('ff:data-changed', on); return () => window.removeEventListener('ff:data-changed', on); }, [shipment.id]);

  const doSearch = (q: string) => {
    setUnQuery(q);
    setUnHits(lookupUN(q));
  };

  const pick = (info: typeof DG_LIBRARY[0]) => {
    setDraft((d) => ({ ...d, unNumber: info.unNumber, properShippingName: info.properShippingName, dgClass: info.dgClass as any, packagingInstructions: info.airPi }));
    setUnQuery(info.unNumber + ' — ' + info.properShippingName);
    setUnHits([]);
  };

  const save = () => {
    if (!draft.unNumber || !draft.properShippingName) return;
    db.addDG({
      shipmentId: shipment.id,
      unNumber: draft.unNumber!,
      properShippingName: draft.properShippingName!,
      dgClass: draft.dgClass || '9',
      packingGroup: draft.packingGroup,
      packagingInstructions: draft.packagingInstructions,
      netWeightKg: Number(draft.netWeightKg) || 0,
      grossWeightKg: Number(draft.grossWeightKg) || 0,
      packages: Number(draft.packages) || 1,
      flashpoint: draft.flashpoint,
      marinePollutant: !!draft.marinePollutant,
      limitedQuantity: !!draft.limitedQuantity,
      sdsAttached: !!draft.sdsAttached,
      declarationAttached: !!draft.declarationAttached,
      approved: !!draft.approved,
      approver: draft.approver,
    });
    setAdding(false);
    setDraft({ shipmentId: shipment.id, dgClass: '9', packages: 1, netWeightKg: 0, grossWeightKg: 0 });
    setUnQuery('');
    refresh();
  };

  const toggle = (id: string, key: keyof DGEntry) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    db.updateDG(id, { [key]: !(e as any)[key] } as any);
    refresh();
  };

  const isDg = entries.length > 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDg ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Dangerous Goods (DGR)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">IMO/IATA declarations, UN numbers, packing groups</p>
          </div>
        </div>
        {isDg && <Badge color="rose">{entries.length} UN line{entries.length > 1 ? 's' : ''}</Badge>}
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}><Plus className="w-4 h-4" /> {adding ? 'Cancel' : 'Add DGD Line'}</Button>
      </div>

      {!isDg && !adding && (
        <div className="text-sm text-slate-500 dark:text-slate-400 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <PackageOpen className="w-4 h-4" />
          No dangerous goods declared for this shipment. Cargo is treated as general cargo.
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((e) => {
            const c = classColor(e.dgClass);
            return (
              <div key={e.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-md ${c.bg} ${c.text} ring-2 ${c.ring} flex items-center justify-center font-bold text-sm shrink-0`}>
                      {e.dgClass}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{e.unNumber}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{e.properShippingName}</span>
                        {e.marinePollutant && <Badge color="blue">Marine Pollutant</Badge>}
                        {e.limitedQuantity && <Badge color="amber">LQ</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span>Class {e.dgClass}</span>
                        {e.packingGroup && <span>PG {e.packingGroup}</span>}
                        {e.packagingInstructions && <span>IATA: {e.packagingInstructions}</span>}
                        <span>{e.packages} pkg</span>
                        <span>Net {e.netWeightKg} kg / Gross {e.grossWeightKg} kg</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { db.deleteDG(e.id); refresh(); }} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CheckChip checked={!!e.sdsAttached} onClick={() => toggle(e.id, 'sdsAttached')} label="SDS Attached" />
                  <CheckChip checked={!!e.declarationAttached} onClick={() => toggle(e.id, 'declarationAttached')} label="DGD Signed" />
                  <CheckChip checked={!!e.approved} onClick={() => toggle(e.id, 'approved')} label={e.approved ? `Approved by ${e.approver || 'DGR Officer'}` : 'Needs DGR Approval'} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <div>
            <Label>UN number lookup</Label>
            <div className="relative">
              <Input value={unQuery} onChange={(e) => doSearch(e.target.value)} placeholder="e.g. UN3480 or lithium" />
              {unHits.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {unHits.map((h) => (
                    <button key={h.unNumber} onClick={() => pick(h)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand">{h.unNumber}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{h.properShippingName}</span>
                        <Badge color="rose">Class {h.dgClass}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Class/Div">
              <Select value={draft.dgClass} onChange={(e) => setDraft({ ...draft, dgClass: e.target.value as any })}>
                {['1','1.1','1.2','1.3','1.4','2.1','2.2','2.3','3','4.1','4.2','4.3','5.1','5.2','6.1','6.2','7','8','9'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Packing Group">
              <Select value={draft.packingGroup} onChange={(e) => setDraft({ ...draft, packingGroup: e.target.value as any })}>
                <option value="">—</option>
                <option value="I">I (high danger)</option>
                <option value="II">II (medium)</option>
                <option value="III">III (low)</option>
              </Select>
            </Field>
            <Field label="Packages"><Input type="number" value={draft.packages || ''} onChange={(e) => setDraft({ ...draft, packages: Number(e.target.value) })} /></Field>
            <Field label="IATA PI / UN Pkg"><Input value={draft.packagingInstructions || ''} onChange={(e) => setDraft({ ...draft, packagingInstructions: e.target.value })} placeholder="e.g. PI965" /></Field>
            <Field label="Net weight (kg)"><Input type="number" value={draft.netWeightKg || ''} onChange={(e) => setDraft({ ...draft, netWeightKg: Number(e.target.value) })} /></Field>
            <Field label="Gross weight (kg)"><Input type="number" value={draft.grossWeightKg || ''} onChange={(e) => setDraft({ ...draft, grossWeightKg: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex gap-3 flex-wrap text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.marinePollutant} onChange={(e) => setDraft({ ...draft, marinePollutant: e.target.checked })} /> Marine pollutant</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.limitedQuantity} onChange={(e) => setDraft({ ...draft, limitedQuantity: e.target.checked })} /> Limited Quantity (LQ)</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.sdsAttached} onChange={(e) => setDraft({ ...draft, sdsAttached: e.target.checked })} /> SDS attached</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.declarationAttached} onChange={(e) => setDraft({ ...draft, declarationAttached: e.target.checked })} /> DGD signed</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!draft.approved} onChange={(e) => setDraft({ ...draft, approved: e.target.checked, approver: e.target.checked ? 'DGR Officer' : undefined })} /> Approve as DGR officer</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setAdding(false); setUnQuery(''); }}>Cancel</Button>
            <Button onClick={save} disabled={!draft.unNumber}><AlertTriangle className="w-4 h-4" /> Add DGD Line</Button>
          </div>
        </div>
      )}

      {!entries.length && !adding && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <DGQuickClass icon={<Flame className="w-4 h-4" />} label="Flammable" cls="3" />
          <DGQuickClass icon={<Skull className="w-4 h-4" />} label="Toxic" cls="6.1" />
          <DGQuickClass icon={<Wind className="w-4 h-4" />} label="Gases" cls="2.1" />
        </div>
      )}
    </Card>
  );
}

function CheckChip({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100'}`}>
      <CheckCircle2 className="w-3 h-3" /> {label}
    </button>
  );
}

function DGQuickClass({ icon, label, cls }: { icon: React.ReactNode; label: string; cls: string }) {
  const c = classColor(cls);
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${c.bg} ${c.text} border ${c.ring}`}>
      {icon}<span className="font-semibold">{label}</span><span className="ml-auto font-mono text-[10px]">Class {cls}</span>
    </div>
  );
}
