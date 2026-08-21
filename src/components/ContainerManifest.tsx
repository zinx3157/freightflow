'use client';

import React, { useEffect, useState } from 'react';
import type { ContainerPackage, Shipment } from '@/lib/types';
import { db } from '@/lib/store';
import { Button, Card, Badge, Input, Select, Modal, Label, Field } from './ui';
import { Package2, Plus, Thermometer, Droplets, Skull, Trash2, Edit3 } from 'lucide-react';

const CONTAINER_TYPES: ContainerPackage['containerType'][] = ['20GP', '40GP', '40HC', '45HC', 'REEFER_20', 'REEFER_40', 'LCL', 'ULD_AKE', 'ULD_PMC', 'BULK'];

const TYPE_LABEL: Record<string, string> = {
  '20GP': '20ft Standard',
  '40GP': '40ft Standard',
  '40HC': '40ft High Cube',
  '45HC': '45ft High Cube',
  'REEFER_20': '20ft Reefer',
  'REEFER_40': '40ft Reefer',
  'LCL': 'LCL (consol)',
  'ULD_AKE': 'ULD AKE (air, LD3)',
  'ULD_PMC': 'ULD PMC (air, pallet)',
  'BULK': 'Bulk / loose',
};

const isReefer = (t?: string) => t === 'REEFER_20' || t === 'REEFER_40';

function emptyContainer(shipmentId: string, mode: 'air' | 'sea'): Omit<ContainerPackage, 'id'> {
  const isAir = mode === 'air';
  return {
    shipmentId,
    containerNumber: '',
    sealNumber: '',
    containerType: isAir ? 'ULD_AKE' : '40HC',
    tareWeight: 0,
    grossWeight: 0,
    packages: 0,
    description: '',
    volume: 0,
    temperature: isReefer(isAir ? 'ULD_AKE' : '40HC') ? 5 : undefined,
    humidity: undefined,
    dangerous: false,
    unNumber: '',
  };
}

export default function ContainerManifest({ shipment }: { shipment: Shipment }) {
  const [containers, setContainers] = useState<ContainerPackage[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerPackage | null>(null);
  const [draft, setDraft] = useState<Omit<ContainerPackage, 'id'>>(emptyContainer(shipment.id, shipment.mode));

  const reload = () => setContainers(db.containersForShipment(shipment.id));
  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('ff:data-changed', onChange);
    return () => window.removeEventListener('ff:data-changed', onChange);
  }, [shipment.id]);

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyContainer(shipment.id, shipment.mode));
    setModalOpen(true);
  };
  const openEdit = (c: ContainerPackage) => {
    setEditing(c);
    setDraft({ ...c });
    setModalOpen(true);
  };
  const save = () => {
    if (editing) {
      db.updateContainer(editing.id, draft);
    } else {
      db.addContainer(draft);
    }
    setModalOpen(false);
    reload();
  };
  const del = (id: string) => {
    if (confirm('Remove this package/container?')) {
      db.deleteContainer(id);
      reload();
    }
  };

  const totalWeight = containers.reduce((a, c) => a + (c.grossWeight || 0), 0);
  const totalPkgs = containers.reduce((a, c) => a + (c.packages || 0), 0);
  const totalVol = containers.reduce((a, c) => a + (c.volume || 0), 0);
  const reefers = containers.filter((c) => isReefer(c.containerType)).length;
  const dg = containers.filter((c) => c.dangerous).length;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
            <Package2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Container & Package Manifest</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">VGM, seals, reefers, dangerous goods</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> Add {shipment.mode === 'air' ? 'ULD' : 'container'}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <MiniStat label="Containers/ULDs" value={containers.length} />
        <MiniStat label="Total weight" value={`${totalWeight.toLocaleString()} kg`} />
        <MiniStat label="Packages" value={totalPkgs.toLocaleString()} />
        <MiniStat label="Volume" value={`${totalVol.toFixed(1)} CBM`} />
        <MiniStat label="Reefers / DG" value={`${reefers} / ${dg}`} />
      </div>

      {containers.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          No containers yet. Click "Add" to build the manifest — required for VGM and eBL issuance.
        </div>
      ) : (
        <div className="space-y-2">
          {containers.map((c) => (
            <div key={c.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-brand transition-colors">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {c.containerNumber || <span className="text-slate-400 italic">no number</span>}
                    </span>
                    <Badge color="slate">{TYPE_LABEL[c.containerType || 'BULK'] || c.containerType}</Badge>
                    {isReefer(c.containerType) && <Badge color="blue"><Thermometer className="w-3 h-3" />{c.temperature}°C</Badge>}
                    {c.dangerous && <Badge color="rose"><Skull className="w-3 h-3" />DG {c.unNumber}</Badge>}
                  </div>
                  {c.sealNumber && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Seal: <span className="font-mono font-semibold">{c.sealNumber}</span></div>}
                  {c.description && <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{c.description}</div>}
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                    <span>Tare: {c.tareWeight?.toLocaleString() || 0} kg</span>
                    <span>Gross: <b>{c.grossWeight?.toLocaleString() || 0} kg</b></span>
                    <span>Pkgs: {c.packages}</span>
                    <span>Vol: {c.volume} CBM</span>
                    {c.humidity && <span className="inline-flex items-center gap-1"><Droplets className="w-3 h-3" />{c.humidity}%</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${shipment.mode === 'air' ? 'ULD' : 'container'}` : `Add ${shipment.mode === 'air' ? 'ULD' : 'container'}`} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select value={draft.containerType || '40HC'} onChange={(e) => setDraft({ ...draft, containerType: e.target.value as any })}>
              {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t as keyof typeof TYPE_LABEL]}</option>)}
            </Select>
          </Field>
          <Field label={shipment.mode === 'air' ? 'ULD ID' : 'Container #'}>
            <Input value={draft.containerNumber || ''} onChange={(e) => setDraft({ ...draft, containerNumber: e.target.value.toUpperCase() })} placeholder="e.g. MSKU1234567" />
          </Field>
          <Field label="Seal #">
            <Input value={draft.sealNumber || ''} onChange={(e) => setDraft({ ...draft, sealNumber: e.target.value.toUpperCase() })} placeholder="e.g. MG-SEAL-20193" />
          </Field>
          <Field label="Tare weight (kg)">
            <Input type="number" value={draft.tareWeight || 0} onChange={(e) => setDraft({ ...draft, tareWeight: Number(e.target.value) })} />
          </Field>
          <Field label="Gross weight (kg)">
            <Input type="number" value={draft.grossWeight || 0} onChange={(e) => setDraft({ ...draft, grossWeight: Number(e.target.value) })} />
          </Field>
          <Field label="Pieces">
            <Input type="number" value={draft.packages || 0} onChange={(e) => setDraft({ ...draft, packages: Number(e.target.value) })} />
          </Field>
          <Field label="Volume (CBM)">
            <Input type="number" step="0.1" value={draft.volume || 0} onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })} />
          </Field>
          {isReefer(draft.containerType) && (
            <>
              <Field label="Temperature (°C)">
                <Input type="number" value={draft.temperature ?? ''} onChange={(e) => setDraft({ ...draft, temperature: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="e.g. 5" />
              </Field>
              <Field label="Humidity (%)">
                <Input type="number" value={draft.humidity ?? ''} onChange={(e) => setDraft({ ...draft, humidity: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="e.g. 65" />
              </Field>
            </>
          )}
          <div className="col-span-2">
            <Field label="Contents description">
              <textarea
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                placeholder="e.g. Vanilla beans - cartons on 20 pallets"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </Field>
          </div>
          <div className="col-span-2 flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!draft.dangerous} onChange={(e) => setDraft({ ...draft, dangerous: e.target.checked })} className="rounded border-slate-300 dark:border-slate-700" />
              Dangerous goods (IMDG / IATA DGR)
            </label>
            {draft.dangerous && (
              <div className="flex-1">
                <Field label="UN Number">
                  <Input value={draft.unNumber || ''} onChange={(e) => setDraft({ ...draft, unNumber: e.target.value })} placeholder="e.g. UN3480" />
                </Field>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save changes' : 'Add to manifest'}</Button>
        </div>
      </Modal>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
