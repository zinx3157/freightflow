'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal, EmptyState } from '@/components/ui';
import { db } from '@/lib/store';
import type { TruckingDispatch, TruckingStatus } from '@/lib/types';
import type { DB } from '@/lib/store';
import { Truck, Plus, Phone, MapPin, Calendar, Weight, DollarSign, Navigation, ArrowLeft, Edit3, Fuel, Users, Building2 } from 'lucide-react';
import { formatDate, formatDateTime, formatMoney, statusColor, titleCase } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import GpsTracker from '@/components/GpsTracker';

const STATUS_LIST: TruckingStatus[] = ['scheduled', 'dispatched', 'en_route', 'loaded', 'unloaded', 'completed'];

export default function TruckingPage() {
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const router = useRouter();
  const params = useQueryParams();

  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
  }, [params]);

  const items = useMemo(() => {
    if (!data) return [];
    return data.trucking.filter((t) => (filter === 'all' ? true : t.status === filter));
  }, [data, filter]);

  const stats = useMemo(() => {
    if (!data) return { active: 0, completed: 0, totalCost: 0, scheduled: 0, enRoute: 0 };
    return {
      active: data.trucking.filter((t) => t.status !== 'completed').length,
      completed: data.trucking.filter((t) => t.status === 'completed').length,
      scheduled: data.trucking.filter((t) => t.status === 'scheduled').length,
      enRoute: data.trucking.filter((t) => t.status === 'en_route').length,
      totalCost: data.trucking.reduce((s, t) => s + t.cost, 0),
    };
  }, [data]);

  function create(t: Omit<TruckingDispatch, 'id' | 'reference'>) {
    db.createTrucking(t);
    setData(db.getAll());
    setModalOpen(false);
  }

  function updateStatus(id: string, status: TruckingStatus) {
    const patch: Partial<TruckingDispatch> = { status };
    if (status === 'completed') patch.completedDate = new Date().toISOString().slice(0, 10);
    db.updateTrucking(id, patch);
    setData(db.getAll());
  }

  // Detail view
  const detailId = params.get('id');
  const selected = data && detailId ? data.trucking.find((t) => t.id === detailId) || null : null;

  if (!data) return <PageShell title="Trucking"><div>Loading…</div></PageShell>;

  if (selected) {
    const linkedShipment = selected.shipmentId ? data.shipments.find((s) => s.id === selected.shipmentId) : null;
    const pings = db.gpsForTrucking(selected.id);
    const lastPing = pings[pings.length - 1];
    return (
      <PageShell
        title={selected.reference}
        subtitle={`${selected.vehicleType} · ${selected.driverName} · ${titleCase(selected.status)}`}
      >
        <Button variant="ghost" onClick={() => router.push('/trucking/')}>
          <ArrowLeft className="w-4 h-4" /> Back to dispatches
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GpsTracker trucking={selected} />

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" /> Route Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Pickup</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{selected.pickupLocation}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <div className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Delivery</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{selected.deliveryLocation}</div>
                </div>
              </div>
              {selected.notes && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200">
                  📝 {selected.notes}
                </div>
              )}
            </Card>

            {linkedShipment && (
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  📦 Linked Shipment
                </h3>
                <button
                  onClick={() => router.push(`/shipments/?id=${linkedShipment.id}`)}
                  className="w-full text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{linkedShipment.reference}</div>
                      <div className="text-sm text-slate-500">{linkedShipment.commodity} · {linkedShipment.portOfLoading} → {linkedShipment.portOfDischarge}</div>
                    </div>
                    <Badge color={linkedShipment.status === 'delivered' ? 'emerald' : 'blue'}>{titleCase(linkedShipment.status)}</Badge>
                  </div>
                </button>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Status</h3>
              <Select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value as TruckingStatus)}
              >
                {STATUS_LIST.map((st) => (<option key={st} value={st}>{titleCase(st)}</option>))}
              </Select>
              <div className="mt-3 text-sm text-slate-500">
                Scheduled: {formatDate(selected.scheduledDate)}
                {selected.completedDate && <span className="text-emerald-600 block">Completed: {formatDate(selected.completedDate)}</span>}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-brand" /> Driver & Vehicle</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Driver</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{selected.driverName}</div>
                    <a href={`tel:${selected.driverPhone}`} className="text-brand text-xs">{selected.driverPhone}</a>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Vehicle</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{selected.vehiclePlate}</div>
                    <div className="text-xs text-slate-500">{selected.vehicleType}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Weight className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Cargo Weight</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{selected.weight.toLocaleString()} kg</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Cost</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{formatMoney(selected.cost)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-500">Customer</div>
                    <div className="font-semibold text-slate-900 dark:text-white">{selected.customerName}</div>
                  </div>
                </div>
              </div>
            </Card>

            {lastPing && (
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-500" /> Last Telemetry
                </h3>
                <div className="text-xs text-slate-500 space-y-2">
                  <div className="flex justify-between"><span>Lat/Lng</span><span className="font-mono text-slate-700 dark:text-slate-300">{lastPing.lat.toFixed(4)}, {lastPing.lng.toFixed(4)}</span></div>
                  <div className="flex justify-between"><span>Speed</span><span className="font-semibold text-slate-900 dark:text-white">{lastPing.speedKmh || 0} km/h</span></div>
                  <div className="flex justify-between"><span>Heading</span><span className="font-semibold text-slate-900 dark:text-white">{lastPing.heading || 0}°</span></div>
                  <div className="flex justify-between"><span>Received</span><span className="font-semibold">{formatDateTime(lastPing.timestamp)}</span></div>
                </div>
              </Card>
            )}

            <Card className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Fuel className="w-4 h-4 text-amber-500" /> Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" size="sm">📸 Upload POD</Button>
                <Button variant="outline" className="w-full" size="sm">📧 Notify Customer</Button>
                <Button variant="outline" className="w-full" size="sm">📍 Report Incident</Button>
              </div>
            </Card>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Inland Trucking & Dispatch" subtitle="Manage pickups, deliveries and your fleet.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatTile icon={<Navigation className="w-5 h-5" />} label="Active Dispatches" value={stats.active} color="blue" />
        <StatTile icon={<Truck className="w-5 h-5" />} label="En Route Now" value={stats.enRoute} color="emerald" />
        <StatTile icon={<Calendar className="w-5 h-5" />} label="Scheduled" value={stats.scheduled} color="indigo" />
        <StatTile icon={<Edit3 className="w-5 h-5" />} label="Completed" value={stats.completed} color="slate" />
        <StatTile icon={<DollarSign className="w-5 h-5" />} label="Total Trucking Cost" value={formatMoney(stats.totalCost)} color="amber" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium ${filter === 'all' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
          >
            All ({data.trucking.length})
          </button>
          {STATUS_LIST.map((s) => {
            const n = data.trucking.filter((x) => x.status === s).length;
            if (n === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === s ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
              >
                {s.replace('_', ' ')} ({n})
              </button>
            );
          })}
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Dispatch</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 ? (
          <Card className="md:col-span-2">
            <EmptyState icon={<Truck className="w-12 h-12" />} title="No dispatches found" description="Schedule a new truck pickup or delivery." action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Create dispatch</Button>} />
          </Card>
        ) : (
          items.map((t) => (
            <Card
              key={t.id}
              className="p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/trucking/?id=${t.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{t.reference}</span>
                    {t.shipmentRef && (
                      <Badge color="blue" className="text-[10px]">
                        → {t.shipmentRef}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">{t.customerName}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('trucking', t.status)}`}>
                  {titleCase(t.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">Pickup</div>
                    <div>{t.pickupLocation}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-slate-400">Delivery</div>
                    <div>{t.deliveryLocation}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Vehicle</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{t.vehiclePlate}</div>
                  <div className="text-slate-500 dark:text-slate-400">{t.vehicleType}</div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Driver</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{t.driverName}</div>
                  <div className="text-slate-500 dark:text-slate-400">{t.driverPhone}</div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Scheduled</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(t.scheduledDate)}</div>
                  {t.completedDate && <div className="text-emerald-600">Done {formatDate(t.completedDate)}</div>}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  <Weight className="w-4 h-4 inline mr-1 text-slate-400" />
                  {t.weight.toLocaleString()} kg · <strong>{formatMoney(t.cost)}</strong>
                </div>
                <Select
                  value={t.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); updateStatus(t.id, e.target.value as TruckingStatus); }}
                  className="w-36"
                >
                  {STATUS_LIST.map((st) => (<option key={st} value={st}>{titleCase(st)}</option>))}
                </Select>
              </div>
              {t.notes && (
                <div className="mt-3 text-xs text-slate-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md p-2">
                  📝 {t.notes}
                </div>
              )}
              <div className="mt-2 text-right">
                <span className="text-xs text-brand font-medium">View details & live GPS →</span>
              </div>
            </Card>
          ))
        )}
      </div>

      <NewDispatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
        preselectedShipmentId={params.get('shipmentId') || undefined}
        onSubmit={create}
      />
    </PageShell>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    slate: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wide">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      </div>
    </Card>
  );
}

function NewDispatchModal({
  open,
  onClose,
  data,
  preselectedShipmentId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  data: DB;
  preselectedShipmentId?: string;
  onSubmit: (t: Omit<TruckingDispatch, 'id' | 'reference'>) => void;
}) {
  const [shipmentId, setShipmentId] = useState(preselectedShipmentId || '');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Container Truck');
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('1000');
  const [cost, setCost] = useState('500');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (preselectedShipmentId) setShipmentId(preselectedShipmentId);
  }, [preselectedShipmentId, open]);

  useEffect(() => {
    if (shipmentId) {
      const sh = data.shipments.find((s) => s.id === shipmentId);
      if (sh) {
        setCustomerName(sh.customerName);
        setPickup(
          sh.direction === 'import' ? `Port/Airport: ${sh.portOfDischarge}` : `Customer warehouse`
        );
        setDelivery(
          sh.direction === 'import' ? sh.destination : `Port/Airport: ${sh.portOfLoading}`
        );
        setWeight(String(sh.weight));
      }
    }
  }, [shipmentId, data]);

  const submit = () => {
    const sh = data.shipments.find((s) => s.id === shipmentId);
    onSubmit({
      shipmentId: shipmentId || undefined,
      shipmentRef: sh?.reference,
      customerName: customerName || sh?.customerName || 'Direct Client',
      driverName,
      driverPhone,
      vehiclePlate,
      vehicleType,
      pickupLocation: pickup,
      deliveryLocation: delivery,
      status: 'scheduled',
      scheduledDate,
      weight: Number(weight),
      cost: Number(cost),
      notes: notes || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Truck Dispatch" size="lg">
      <div className="space-y-4">
        <Field label="Link to Shipment (optional)">
          <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
            <option value="">— Standalone job —</option>
            {data.shipments
              .filter((s) => s.status !== 'delivered' && s.status !== 'cancelled')
              .map((s) => (
                <option key={s.id} value={s.id}>{s.reference} — {s.customerName} ({s.portOfLoading}→{s.portOfDischarge})</option>
              ))}
          </Select>
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Customer Name"><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
          <Field label="Vehicle Type">
            <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              <option>Container Truck</option>
              <option>40ft Container Truck</option>
              <option>20ft Container Truck</option>
              <option>Box Truck 10T</option>
              <option>Flatbed Truck</option>
              <option>Refrigerated Truck</option>
              <option>Van / Small Truck</option>
            </Select>
          </Field>
          <Field label="Driver Name"><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Rivo Andriamahefa" /></Field>
          <Field label="Driver Phone"><Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+261 ..." /></Field>
          <Field label="Vehicle Plate"><Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="1234 TAA" /></Field>
          <Field label="Weight (kg)"><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          <Field label="Pickup Location"><Input value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
          <Field label="Delivery Location"><Input value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
          <Field label="Scheduled Date"><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></Field>
          <Field label="Cost (USD)"><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        </div>
        <Field label="Notes / Special Instructions">
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg min-h-[72px] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!driverName || !vehiclePlate || !pickup || !delivery}>
            Create Dispatch
          </Button>
        </div>
      </div>
    </Modal>
  );
}
