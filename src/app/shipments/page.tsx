'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal, EmptyState } from '@/components/ui';
import PortAutocomplete from '@/components/PortAutocomplete';
import ChargeableWeightCalc from '@/components/ChargeableWeightCalc';
import { ShipmentKanban } from '@/components/ShipmentKanban';
import { db } from '@/lib/store';
import ShipmentDetail from '@/components/ShipmentDetail';
import type { Shipment, ShipmentMode, ShipmentDirection, ShipmentStatus } from '@/lib/types';
import type { DB } from '@/lib/store';
import {
  Package,
  Plus,
  Plane,
  Ship,
  Search,
  ArrowRight,
  Download,
  Scale,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';
import { formatDate, formatMoney, statusColor, titleCase, daysFromNow } from '@/lib/utils';

export default function ShipmentsPage() {
  const router = useRouter();
  const params = useQueryParams();
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modeFilter, setModeFilter] = useState<'all' | 'air' | 'sea'>('all');
  const [dirFilter, setDirFilter] = useState<'all' | 'import' | 'export'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // ALL hooks must run unconditionally before any early return.
  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
    const m = params.get('mode');
    if (m === 'air' || m === 'sea') setModeFilter(m);
  }, [params]);

  useEffect(() => {
    if (params.get('new') !== '1' && modalOpen) setModalOpen(false);
  }, [params, modalOpen]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.shipments.filter((s) => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
      if (dirFilter !== 'all' && s.direction !== dirFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q) {
        const hay = (s.reference + ' ' + s.customerName + ' ' + s.mawbOrBl + ' ' + s.vesselOrFlight + ' ' + s.origin + ' ' + s.destination).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, modeFilter, dirFilter, statusFilter, q]);

  const counts = useMemo(() => {
    if (!data) return { total: 0, air: 0, sea: 0, imp: 0, exp: 0, byStatus: {} as Record<string, number> };
    const byStatus: Record<string, number> = {};
    data.shipments.forEach((s) => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });
    return {
      total: data.shipments.length,
      air: data.shipments.filter((s) => s.mode === 'air').length,
      sea: data.shipments.filter((s) => s.mode === 'sea').length,
      imp: data.shipments.filter((s) => s.direction === 'import').length,
      exp: data.shipments.filter((s) => s.direction === 'export').length,
      byStatus,
    };
  }, [data]);

  const detailId = params.get('id');
  const selected = data && detailId ? data.shipments.find((s) => s.id === detailId) || null : null;
  const refresh = () => setData(db.getAll());

  const handleCreate = (payload: Omit<Shipment, 'id' | 'createdAt' | 'reference'>) => {
    const created = db.createShipment(payload);
    setData(db.getAll());
    setModalOpen(false);
    router.push(`/shipments/?id=${created.id}`);
  };

  if (!data) return <PageShell title="Shipments"><div>Loading…</div></PageShell>;
  if (selected) {
    return <ShipmentDetail shipmentId={selected.id} onBack={() => router.push('/shipments/')} onChange={refresh} />;
  }

  return (
    <PageShell
      title="Shipments"
      subtitle={`${counts.total} total · ${counts.air} air · ${counts.sea} sea · ${counts.imp} import · ${counts.exp} export`}
    >
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5 transition min-h-[36px] ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1.5 text-sm rounded-md font-medium flex items-center gap-1.5 transition min-h-[36px] ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kanban board"
            >
              <LayoutGrid className="w-4 h-4" /> Board
            </button>
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['all', 'air', 'sea'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition min-h-[36px] ${
                  modeFilter === m ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m === 'all' ? 'All modes' : m === 'air' ? '✈️ Air' : '🚢 Sea'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['all', 'import', 'export'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirFilter(d)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition min-h-[36px] ${
                  dirFilter === d ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d === 'all' ? 'Both' : d}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ref, customer, AWB/B/L…"
              className="pl-9 w-56"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="w-4 h-4"/> Export CSV</Button>
          <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Shipment</Button>
        </div>
      </div>

      {/* Status filter chips — GoFreight style segmented filter with counts */}
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 py-1 no-scrollbar ff-table-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors min-h-[32px] ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand'
          }`}
        >
          <Filter className="w-3 h-3 inline mr-1" />
          All ({counts.total})
        </button>
        {(['quoted', 'booked', 'picked_up', 'in_transit', 'customs', 'delivered', 'cancelled'] as ShipmentStatus[]).map((s) => {
          const n = counts.byStatus[s] || 0;
          if (n === 0 && statusFilter !== s) return null;
          const chipColor =
            s === 'delivered' ? 'emerald' :
            s === 'customs' ? 'amber' :
            s === 'in_transit' ? 'blue' :
            s === 'cancelled' ? 'rose' :
            s === 'booked' ? 'indigo' :
            s === 'picked_up' ? 'violet' : 'slate';
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors min-h-[32px] ${
                active
                  ? chipColor === 'emerald' ? 'bg-emerald-500 text-white border-emerald-500'
                  : chipColor === 'amber' ? 'bg-amber-500 text-white border-amber-500'
                  : chipColor === 'blue' ? 'bg-blue-500 text-white border-blue-500'
                  : chipColor === 'rose' ? 'bg-rose-500 text-white border-rose-500'
                  : chipColor === 'indigo' ? 'bg-indigo-500 text-white border-indigo-500'
                  : chipColor === 'violet' ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-brand'
              }`}
            >
              {titleCase(s)} ({n})
            </button>
          );
        })}
      </div>

      {viewMode === 'kanban' ? (
        <Card className="p-3 sm:p-4">
          <ShipmentKanban onOpen={(id) => router.push(`/shipments/?id=${id}`)} />
        </Card>
      ) : (
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No shipments match your filters"
            description="Try adjusting the filters or create a new shipment."
            action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Create shipment</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left font-semibold">Reference</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Route</th>
                  <th className="px-4 py-3 text-left font-semibold">Mode/Dir</th>
                  <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                  <th className="px-4 py-3 text-left font-semibold">ETD</th>
                  <th className="px-4 py-3 text-left font-semibold">ETA</th>
                  <th className="px-4 py-3 text-left font-semibold">Chg.Wt</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => router.push(`/shipments/?id=${s.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{s.reference}</div>
                      <div className="text-xs text-slate-500 font-mono">{s.mawbOrBl}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{s.customerName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                        <span className="font-mono text-xs">{s.portOfLoading}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-xs">{s.portOfDischarge}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[180px]">{s.commodity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {s.mode === 'air' ? (
                          <Badge color="blue"><Plane className="w-3 h-3" />Air</Badge>
                        ) : (
                          <Badge color="indigo"><Ship className="w-3 h-3" />Sea</Badge>
                        )}
                        <span className={`text-[11px] font-semibold ${s.direction === 'import' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {titleCase(s.direction)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-200">{s.carrier}</div>
                      <div className="text-xs text-slate-400">{s.vesselOrFlight}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div>{formatDate(s.etd)}</div>
                      <div className="text-xs text-slate-400">{daysFromNow(s.etd)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div>{formatDate(s.eta)}</div>
                      <div className="text-xs text-slate-400">{daysFromNow(s.eta)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs">
                      {s.chargeableWeight ? (
                        <span className="font-mono font-semibold">{s.chargeableWeight.toFixed(1)} kg</span>
                      ) : (
                        <span className="text-slate-400 font-mono">{s.weight} kg</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('shipment', s.status)}`}>
                        {titleCase(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      {formatMoney(s.totalAmount, s.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      <NewShipmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={data.customers}
        onSubmit={handleCreate}
      />
    </PageShell>
  );
}

// ---------- New Shipment Modal ----------

function NewShipmentModal({
  open,
  onClose,
  customers,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  customers: DB['customers'];
  onSubmit: (payload: Omit<Shipment, 'id' | 'createdAt' | 'reference'>) => void;
}) {
  const [mode, setMode] = useState<ShipmentMode>('sea');
  const [direction, setDirection] = useState<ShipmentDirection>('export');
  const [status, setStatus] = useState<ShipmentStatus>('booked');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [origin, setOrigin] = useState('Antananarivo, MG');
  const [destination, setDestination] = useState('');
  const [pol, setPol] = useState(mode === 'air' ? 'Antananarivo (TNR)' : 'Toamasina (MGTOA)');
  const [pod, setPod] = useState('');
  const [weight, setWeight] = useState('1000');
  const [volume, setVolume] = useState(mode === 'air' ? '2.5' : '15');
  const [pieces, setPieces] = useState('10');
  const [commodity, setCommodity] = useState('General Cargo');
  const [incoterm, setIncoterm] = useState('CIF');
  const [carrier, setCarrier] = useState('');
  const [vesselOrFlight, setVesselOrFlight] = useState('');
  const [mawbOrBl, setMawbOrBl] = useState('TBD');
  const [etd, setEtd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [eta, setEta] = useState(new Date(Date.now() + (mode === 'air' ? 10 : 35) * 86400000).toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState('5000');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [chargeableWeight, setChargeableWeight] = useState(1000);
  const [dims, setDims] = useState<{ l?: number; w?: number; h?: number } | undefined>(undefined);

  // Reset sensible defaults when mode changes
  useEffect(() => {
    if (mode === 'air') {
      setPol('Antananarivo (TNR)');
      setVolume('2.5');
      setEta(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
    } else {
      setPol('Toamasina (MGTOA)');
      setVolume('15');
      setEta(new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10));
    }
  }, [mode]);

  useEffect(() => {
    if (open && customers[0] && !customerId) setCustomerId(customers[0].id);
  }, [open, customers, customerId]);

  const submit = () => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    onSubmit({
      mode,
      direction,
      status,
      customerId,
      customerName: cust.name,
      customerEmail: cust.email,
      origin,
      destination,
      portOfLoading: pol,
      portOfDischarge: pod,
      weight: Number(weight) || 0,
      volume: Number(volume) || 0,
      pieces: Number(pieces) || 0,
      chargeableWeight,
      dimLengthCm: dims?.l,
      dimWidthCm: dims?.w,
      dimHeightCm: dims?.h,
      commodity,
      incoterm,
      carrier: carrier || 'TBD',
      vesselOrFlight: vesselOrFlight || 'TBD',
      mawbOrBl: mawbOrBl || 'TBD',
      etd,
      eta,
      customsStatus: 'pending',
      totalAmount: Number(totalAmount) || 0,
      currency,
      notes,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={
      <div className="flex items-center gap-2">
        {mode === 'air' ? <Plane className="w-5 h-5 text-sky-600" /> : <Ship className="w-5 h-5 text-indigo-600" />}
        Book New {mode === 'air' ? 'Air' : 'Sea'} Shipment
      </div>
    } size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as ShipmentMode)}>
              <option value="sea">Sea (FCL/LCL)</option>
              <option value="air">Air Freight</option>
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={direction} onChange={(e) => setDirection(e.target.value as ShipmentDirection)}>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
              {['quoted', 'booked', 'picked_up', 'in_transit', 'customs', 'delivered'].map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Origin City/Country">
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </Field>
          <Field label="Destination City/Country">
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Hamburg, DE" />
          </Field>
          <PortAutocomplete
            mode={mode}
            label={mode === 'air' ? 'Airport of Departure (POL)' : 'Port of Loading (POL)'}
            value={pol}
            onChange={(v) => setPol(v)}
            placeholder={mode === 'air' ? 'e.g. TNR, Antananarivo' : 'e.g. Toamasina'}
          />
          <PortAutocomplete
            mode={mode}
            label={mode === 'air' ? 'Airport of Arrival (POD)' : 'Port of Discharge (POD)'}
            value={pod}
            onChange={(v) => setPod(v)}
            placeholder={mode === 'air' ? 'e.g. CDG, Paris' : 'e.g. Hamburg'}
          />
        </div>

        <ChargeableWeightCalc
          mode={mode}
          grossKg={Number(weight) || 0}
          volumeCbm={Number(volume) || 0}
          pieces={Number(pieces) || 1}
          onChange={({ grossKg, volumeCbm, chargeableKg, pieces: pcs, dimsCm }) => {
            setWeight(String(grossKg));
            setVolume(String(volumeCbm));
            setPieces(String(pcs));
            setChargeableWeight(chargeableKg);
            setDims(dimsCm);
          }}
        />

        {/* When box-dims mode is used, disable direct CBM editing to avoid conflicts; otherwise show standard inputs */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
          <Field label="Gross Weight (kg)">
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field label={mode === 'air' ? 'Volume (CBM)' : 'Volume (CBM)'}>
            <Input type="number" step="0.01" value={volume} onChange={(e) => setVolume(e.target.value)} />
          </Field>
          <Field label="Pieces">
            <Input type="number" value={pieces} onChange={(e) => setPieces(e.target.value)} />
          </Field>
        </div>

        <Field label="Commodity / Cargo Description">
          <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={mode === 'air' ? 'Airline' : 'Carrier / Shipping Line'}>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={mode === 'air' ? 'e.g. Air France, Ethiopian, Kenya Airways' : 'e.g. Maersk, CMA CGM, MSC, Maersk'} />
          </Field>
          <Field label={mode === 'air' ? 'Flight No.' : 'Vessel / Voyage'}>
            <Input value={vesselOrFlight} onChange={(e) => setVesselOrFlight(e.target.value)} placeholder={mode === 'air' ? 'e.g. AF934' : 'e.g. MAERSK EMDEN 042E'} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={mode === 'air' ? 'MAWB Number' : 'Bill of Lading'}>
            <Input value={mawbOrBl} onChange={(e) => setMawbOrBl(e.target.value)} />
          </Field>
          <Field label="ETD">
            <Input type="date" value={etd} onChange={(e) => setEtd(e.target.value)} />
          </Field>
          <Field label="ETA">
            <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Total Amount">
            <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MGA">MGA</option>
              <option value="GBP">GBP</option>
            </Select>
          </Field>
          <Field label="Incoterm">
            <Select value={incoterm} onChange={(e) => setIncoterm(e.target.value)}>
              {['EXW', 'FOB', 'FCA', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:border-brand outline-none min-h-[72px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special handling, dangerous goods info, client instructions…"
          />
        </Field>

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Scale className="w-4 h-4" />
            <span>Chargeable weight: <b className="text-slate-800 dark:text-slate-100">{chargeableWeight.toFixed(2)} kg</b></span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={!pod || !destination || !carrier}>
              Create Shipment
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
