'use client';

import { useEffect, useState } from 'react';
import type { Shipment, ShipmentLeg, LegMode, LegStatus } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Button, Badge, Select, Field, Input } from './ui';
import {
  Truck,
  Plane,
  Ship,
  Train,
  Anchor,
  Package,
  Plus,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Route,
} from 'lucide-react';
import { formatDate, formatDateTime, titleCase, daysFromNow } from '@/lib/utils';

const LEG_MODE_ICON: Record<LegMode, React.ReactNode> = {
  pickup: <Truck className="w-4 h-4" />,
  trucking: <Truck className="w-4 h-4" />,
  sea: <Ship className="w-4 h-4" />,
  air: <Plane className="w-4 h-4" />,
  rail: <Train className="w-4 h-4" />,
  barge: <Anchor className="w-4 h-4" />,
  delivery: <Package className="w-4 h-4" />,
};

const LEG_MODE_COLOR: Record<LegMode, string> = {
  pickup: 'amber',
  trucking: 'orange',
  sea: 'indigo',
  air: 'sky',
  rail: 'slate',
  barge: 'teal',
  delivery: 'emerald',
};

const LEG_STATUS_COLOR: Record<LegStatus, string> = {
  planned: 'slate',
  booked: 'blue',
  in_transit: 'amber',
  completed: 'emerald',
  delayed: 'rose',
};

const LEG_STATUS_ICON: Record<LegStatus, React.ReactNode> = {
  planned: <Clock className="w-3 h-3" />,
  booked: <CheckCircle2 className="w-3 h-3" />,
  in_transit: <Route className="w-3 h-3 animate-pulse" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  delayed: <AlertTriangle className="w-3 h-3" />,
};

export default function RoutingTimeline({ shipment }: { shipment: Shipment }) {
  const [legs, setLegs] = useState<ShipmentLeg[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = () => setLegs(db.legsForShipment(shipment.id));

  useEffect(() => {
    refresh();
    window.addEventListener('ff:data-changed', refresh);
    return () => window.removeEventListener('ff:data-changed', refresh);
  }, [shipment.id]);

  // If no legs seeded, suggest auto-creating a basic route based on shipment
  const canSuggest = legs.length === 0 && shipment.mode;

  const suggestDefaultLegs = () => {
    const isSea = shipment.mode === 'sea';
    const isImp = shipment.direction === 'import';
    const base: Omit<ShipmentLeg, 'id'>[] = isSea
      ? (isImp
        ? [
            { shipmentId: shipment.id, seq: 1, mode: 'sea', carrier: shipment.carrier, voyageRef: shipment.vesselOrFlight, fromLocation: shipment.portOfLoading, toLocation: shipment.portOfDischarge, etd: shipment.etd, eta: shipment.eta, status: 'in_transit' as LegStatus, distanceKm: 11500, notes: 'Ocean main carriage' },
            { shipmentId: shipment.id, seq: 2, mode: 'trucking', carrier: 'Inland haulage', fromLocation: shipment.portOfDischarge, toLocation: shipment.destination, etd: shipment.eta, status: 'planned' as LegStatus, distanceKm: 350, notes: 'Final mile delivery' },
          ]
        : [
            { shipmentId: shipment.id, seq: 1, mode: 'trucking', carrier: 'Inland pickup', fromLocation: shipment.origin, toLocation: shipment.portOfLoading, etd: shipment.etd, status: 'completed' as LegStatus, distanceKm: 350, notes: 'Pre-carriage to port' },
            { shipmentId: shipment.id, seq: 2, mode: 'sea', carrier: shipment.carrier, voyageRef: shipment.vesselOrFlight, fromLocation: shipment.portOfLoading, toLocation: shipment.portOfDischarge, etd: shipment.etd, eta: shipment.eta, status: 'in_transit' as LegStatus, distanceKm: 11500, notes: 'Ocean main carriage' },
          ])
      : [ // air
          { shipmentId: shipment.id, seq: 1, mode: 'trucking', carrier: 'Inland pickup', fromLocation: shipment.origin, toLocation: shipment.portOfLoading, etd: shipment.etd, status: 'completed' as LegStatus, distanceKm: 45, notes: 'Truck to TNR airport' },
          { shipmentId: shipment.id, seq: 2, mode: 'air', carrier: shipment.carrier, voyageRef: shipment.vesselOrFlight, fromLocation: shipment.portOfLoading, toLocation: shipment.portOfDischarge, etd: shipment.etd, eta: shipment.eta, status: 'in_transit' as LegStatus, distanceKm: 8500, notes: 'Air main carriage' },
          { shipmentId: shipment.id, seq: 3, mode: 'trucking', carrier: 'Destination trucking', fromLocation: shipment.portOfDischarge, toLocation: shipment.destination, etd: shipment.eta, status: 'planned' as LegStatus, distanceKm: 60, notes: 'Delivery from airport' },
        ];
    base.forEach(l => db.addShipmentLeg(l));
    refresh();
  };

  const currentLegIdx = legs.findIndex(l => l.status === 'in_transit');
  const activeIdx = currentLegIdx >= 0 ? currentLegIdx : legs.findIndex(l => l.status === 'planned');

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Multi-leg Door-to-Door Routing</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Full journey breakdown: pre-carriage · main carriage · on-carriage</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canSuggest && (
            <Button size="sm" variant="outline" onClick={suggestDefaultLegs}>
              <Plus className="w-4 h-4" /> Auto-build route
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add leg
          </Button>
        </div>
      </div>

      {legs.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 p-6 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center">
          No legs defined yet. Click <strong>Auto-build route</strong> to generate a standard door-to-door plan, or add legs manually. CargoWise requires clunky multi-screen entry — FreightFlow builds the whole route in one click.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 to-slate-200 dark:to-slate-700" />

          <div className="space-y-0">
            {legs.map((leg, idx) => {
              const isActive = idx === activeIdx;
              const isDone = leg.status === 'completed';
              const isDelayed = leg.status === 'delayed';
              return (
                <div key={leg.id} className={`relative pl-14 py-4 ${idx === 0 ? 'pt-2' : ''} ${idx === legs.length - 1 ? 'pb-2' : ''}`}>
                  {/* Mode icon bubble */}
                  <div className={`absolute left-0 top-4 w-11 h-11 rounded-xl flex items-center justify-center border-2 shadow-sm ${
                    isActive ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/40 animate-pulse' :
                    isDone ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-500' :
                    isDelayed ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white border-rose-500' :
                    'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {LEG_MODE_ICON[leg.mode]}
                  </div>

                  {/* Sequence badge */}
                  <div className="absolute left-[3px] top-[52px] w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center border border-white dark:border-slate-900">
                    {leg.seq}
                  </div>

                  <div className={`rounded-xl p-4 transition-all ${
                    isActive ? 'bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50' :
                    isDone ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30' :
                    'bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                            Leg {leg.seq}: {titleCase(leg.mode)}
                          </span>
                          <Badge color={LEG_STATUS_COLOR[leg.status] as any}>
                            {LEG_STATUS_ICON[leg.status]} {titleCase(leg.status)}
                          </Badge>
                          {isActive && <Badge color="amber">● CURRENT LEG</Badge>}
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {leg.carrier}
                          {leg.voyageRef && <span className="font-mono text-sm text-slate-500 ml-2">· {leg.voyageRef}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="font-medium">{leg.fromLocation}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className="font-medium">{leg.toLocation}</span>
                        </div>
                        {leg.notes && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{leg.notes}</div>}
                      </div>

                      <div className="text-right text-xs space-y-1">
                        {leg.etd && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 justify-end">
                            <Calendar className="w-3 h-3" />
                            <span>ETD {formatDate(leg.etd)}</span>
                          </div>
                        )}
                        {leg.eta && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 justify-end">
                            <Calendar className="w-3 h-3" />
                            <span>ETA {formatDate(leg.eta)}{' '}<span className="text-slate-400">({daysFromNow(leg.eta)})</span></span>
                          </div>
                        )}
                        {leg.atd && <div className="text-emerald-600 dark:text-emerald-400">Departed {formatDate(leg.atd)}</div>}
                        {leg.ata && <div className="text-emerald-600 dark:text-emerald-400">Arrived {formatDate(leg.ata)}</div>}
                        {leg.distanceKm && <div className="text-slate-400">{leg.distanceKm.toLocaleString()} km</div>}
                      </div>
                    </div>

                    {/* Quick advance buttons */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {leg.status === 'planned' && (
                        <button onClick={() => { db.updateLeg(leg.id, { status: 'booked' }); refresh(); }}
                          className="text-[11px] px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold">
                          Confirm booking
                        </button>
                      )}
                      {(leg.status === 'planned' || leg.status === 'booked') && (
                        <button onClick={() => { db.updateLeg(leg.id, { status: 'in_transit', atd: new Date().toISOString() }); refresh(); }}
                          className="text-[11px] px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 font-semibold">
                          Mark departed
                        </button>
                      )}
                      {leg.status === 'in_transit' && (
                        <button onClick={() => { db.updateLeg(leg.id, { status: 'completed', ata: new Date().toISOString() }); refresh(); }}
                          className="text-[11px] px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 font-semibold">
                          Mark arrived
                        </button>
                      )}
                      {leg.status !== 'delayed' && leg.status !== 'completed' && (
                        <button onClick={() => { db.updateLeg(leg.id, { status: 'delayed' }); refresh(); }}
                          className="text-[11px] px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 font-semibold">
                          Report delay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <AddLegModal shipment={shipment} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); refresh(); }} defaultSeq={legs.length + 1} />}
    </Card>
  );
}

function AddLegModal({ shipment, onClose, onAdded, defaultSeq }: { shipment: Shipment; onClose: () => void; onAdded: () => void; defaultSeq: number }) {
  const [mode, setMode] = useState<LegMode>('trucking');
  const [carrier, setCarrier] = useState('');
  const [voyageRef, setVoyageRef] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [etd, setEtd] = useState('');
  const [eta, setEta] = useState('');
  const [status, setStatus] = useState<LegStatus>('planned');
  const [distance, setDistance] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const submit = () => {
    if (!carrier || !from || !to) return;
    db.addShipmentLeg({
      shipmentId: shipment.id,
      seq: defaultSeq,
      mode,
      carrier,
      voyageRef: voyageRef || undefined,
      fromLocation: from,
      toLocation: to,
      etd: etd || undefined,
      eta: eta || undefined,
      status,
      distanceKm: distance || undefined,
      notes: notes || undefined,
    });
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Add route leg</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as LegMode)}>
              <option value="pickup">Pickup</option>
              <option value="trucking">Trucking</option>
              <option value="rail">Rail</option>
              <option value="barge">Barge</option>
              <option value="sea">Sea (ocean)</option>
              <option value="air">Air</option>
              <option value="delivery">Delivery</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as LegStatus)}>
              <option value="planned">Planned</option>
              <option value="booked">Booked</option>
              <option value="in_transit">In transit</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </Select>
          </Field>
          <Field label="Carrier / Haulier"><Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Maersk, MSC, local trucking" /></Field>
          <Field label="Voyage / Ref"><Input value={voyageRef} onChange={(e) => setVoyageRef(e.target.value)} placeholder="Vessel/flight/truck #" /></Field>
          <Field label="From"><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Origin location" /></Field>
          <Field label="To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destination location" /></Field>
          <Field label="ETD"><Input type="date" value={etd} onChange={(e) => setEtd(e.target.value)} /></Field>
          <Field label="ETA"><Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
          <Field label="Distance (km)"><Input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} /></Field>
          <div className="col-span-2"><Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!carrier || !from || !to}><Save className="w-4 h-4" /> Add leg</Button>
        </div>
      </div>
    </div>
  );
}
