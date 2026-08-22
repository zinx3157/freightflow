'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Select, Field } from '@/components/ui';
import { db } from '@/lib/store';
import type { Shipment, CustomsStatus, ShipmentStatus, TruckingDispatch, Customer } from '@/lib/types';
import {
  ArrowLeft,
  Plane,
  Ship,
  MapPin,
  Building,
  Calendar,
  Weight,
  Box,
  Hash,
  FileText,
  ClipboardCheck,
  Truck,
  DollarSign,
  Printer,
  Mail,
  Leaf,
  TrendingUp,
  Download,
  Share2,
  Zap,
  Package2,
  FileDigit,
  Send,
  Scale,
} from 'lucide-react';
import { formatDate, formatDateTime, formatMoney, statusColor, titleCase, daysFromNow } from '@/lib/utils';
import { generateShipmentBL, downloadBlob } from '@/lib/documents';
import HSClassifier from './HSClassifier';
import CarrierBookingPanel from './CarrierBooking';
import ContainerManifest from './ContainerManifest';
import EmailCenter from './EmailCenter';
import DangerousGoodsPanel from './DangerousGoodsPanel';
import DocumentsManager from './DocumentsManager';
import CustomsDeclarationPanel from './CustomsDeclaration';
import RoutingTimeline from './RoutingTimeline';
// Portal URL uses query param ?t=... for static export compat

// Emissions factors (g CO2e per tonne-km) — widely used estimates from GLEC framework / Smart Freight Centre
const EMISSIONS_FACTOR = {
  air: 602,    // g CO2e / tonne-km (air cargo, long-haul average)
  sea: 15,     // g CO2e / tonne-km (ocean container, average)
  road: 110,   // g CO2e / tonne-km (road freight, heavy truck)
};

const SHIPMENT_STAGES: ShipmentStatus[] = [
  'quoted',
  'booked',
  'picked_up',
  'in_transit',
  'customs',
  'delivered',
];

const CUSTOMS_STAGES: CustomsStatus[] = [
  'pending',
  'docs_received',
  'declared',
  'inspection',
  'duties_paid',
  'cleared',
];

function tokenFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return 'tkn_' + Math.abs(h).toString(36) + '_' + id.slice(-4);
}

export default function ShipmentDetail({
  shipmentId,
  onBack,
  onChange,
}: {
  shipmentId: string;
  onBack?: () => void;
  onChange?: () => void;
}) {
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [trucking, setTrucking] = useState<TruckingDispatch[]>([]);

  useEffect(() => {
    const d = db.getAll();
    const s = d.shipments.find((x) => x.id === shipmentId) || null;
    setShipment(s);
    setCustomer(s ? d.customers.find((c) => c.id === s.customerId) || null : null);
    setTrucking(d.trucking.filter((t) => t.shipmentId === shipmentId));
  }, [shipmentId]);

  function update(patch: Partial<Shipment>) {
    if (!shipment) return;
    const next: Shipment = { ...shipment, ...patch };
    // Auto-compute CO2e when weight or mode changes
    if (patch.weight !== undefined || patch.mode !== undefined || shipment.co2e === undefined) {
      const approxKm = next.mode === 'air' ? 8500 : 12000;
      const tonnes = Math.max(next.weight, 1) / 1000;
      const factor = EMISSIONS_FACTOR[next.mode];
      const kgCo2 = (factor * tonnes * approxKm) / 1000;
      next.co2e = Math.round(kgCo2);
    }
    const updated = db.updateShipment(shipment.id, next);
    if (updated) {
      setShipment(updated);
      onChange?.();
    }
  }

  const pnl = useMemo(() => {
    if (!shipment) return null;
    const estFreightCost = shipment.freightCost ?? Math.round(shipment.totalAmount * 0.65);
    const estCustomsCost = shipment.customsCost ?? Math.round((shipment.duties || 0) + shipment.totalAmount * 0.08);
    const truckingDirect = trucking.reduce((s, x) => s + (x.cost || 0), 0);
    const estTruckingCost = shipment.truckingCost ?? (truckingDirect || Math.round(shipment.totalAmount * 0.12));
    const estOtherCost = shipment.otherCost ?? 0;
    const totalCost = estFreightCost + estCustomsCost + estTruckingCost + estOtherCost;
    const profit = shipment.totalAmount - totalCost;
    const margin = shipment.totalAmount > 0 ? (profit / shipment.totalAmount) * 100 : 0;
    return { estFreightCost, estCustomsCost, estTruckingCost, estOtherCost, totalCost, profit, margin };
  }, [shipment, trucking]);

  if (!shipment || !pnl) {
    return (
      <PageShell title="Shipment Details">
        <div className="text-slate-500">Loading…</div>
      </PageShell>
    );
  }

  const { estFreightCost, estCustomsCost, estTruckingCost, estOtherCost, totalCost, profit, margin } = pnl;

  function back() {
    if (onBack) return onBack();
    router.push('/shipments/');
  }

  const stageIdx = SHIPMENT_STAGES.indexOf(shipment.status);
  const customsIdx = shipment.customsStatus ? CUSTOMS_STAGES.indexOf(shipment.customsStatus) : -1;

  return (
    <PageShell
      title={shipment.reference}
      subtitle={`${titleCase(shipment.mode)} · ${titleCase(shipment.direction)} · ${shipment.commodity}`}
    >
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Button variant="ghost" onClick={back}>
          <ArrowLeft className="w-4 h-4" /> Back to list
        </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => downloadBlob(generateShipmentBL(shipment), `${shipment.reference}_${shipment.mode === 'air' ? 'AWB' : 'BL'}.pdf`)}>
              <Download className="w-4 h-4" /> {shipment.mode === 'air' ? 'Download AWB' : 'Download B/L'}
            </Button>
            <Button variant="outline" onClick={() => {
              const url = `${window.location.origin}/portal/?t=${tokenFor(shipment.id)}`;
              navigator.clipboard?.writeText(url);
              alert(`Customer portal link copied:\n\n${url}\n\nShare this with your customer for live tracking.`);
            }}>
              <Share2 className="w-4 h-4" /> Share Portal Link
            </Button>
            <button
              onClick={() => {
                document.getElementById('email-center')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Mail className="w-4 h-4" /> Email Customer
            </button>
            <Button onClick={() => router.push(`/invoices/?new=1&shipmentId=${shipment.id}`)}>
              <DollarSign className="w-4 h-4" /> Create Invoice
            </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {shipment.mode === 'air' ? (
                    <Badge color="blue" className="text-sm py-1 px-2.5"><Plane className="w-3.5 h-3.5" /> AIR FREIGHT</Badge>
                  ) : (
                    <Badge color="indigo" className="text-sm py-1 px-2.5"><Ship className="w-3.5 h-3.5" /> SEA FREIGHT</Badge>
                  )}
                  <Badge color={shipment.direction === 'import' ? 'emerald' : 'blue'} className="text-sm py-1 px-2.5">
                    {titleCase(shipment.direction)}
                  </Badge>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor('shipment', shipment.status)}`}>
                    {titleCase(shipment.status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-slate-500 text-sm">
                  <Building className="w-4 h-4" />
                  <span>{shipment.customerName}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Shipment Value</div>
                <div className="text-xl font-bold text-slate-900">{formatMoney(shipment.totalAmount, shipment.currency)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{shipment.incoterm}</div>
              </div>
            </div>

            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Shipment Progress</div>
              <div className="relative flex justify-between px-4">
                <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200" />
                <div
                  className="absolute top-4 left-8 h-0.5 bg-brand transition-all"
                  style={{
                    width: `calc(${(Math.max(stageIdx, 0) / (SHIPMENT_STAGES.length - 1)) * 100}% - ${(Math.max(stageIdx, 0) / (SHIPMENT_STAGES.length - 1)) * 64}px)`,
                  }}
                />
                {SHIPMENT_STAGES.map((st, i) => {
                  const done = i <= stageIdx;
                  return (
                    <div key={st} className="relative z-10 flex flex-col items-center" style={{ width: 0 }}>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                          done ? 'bg-brand text-white border-brand' : 'bg-white text-slate-400 border-slate-300'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className={`mt-2 text-[10px] font-semibold uppercase whitespace-nowrap ${done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {titleCase(st)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Batch 6: Multi-leg door-to-door routing timeline */}
          <RoutingTimeline shipment={shipment} />

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold tracking-wide">From</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{shipment.portOfLoading}</div>
                <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {shipment.origin}
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    ETD: <span className="font-medium text-slate-800">{formatDate(shipment.etd)}</span>
                    <span className="text-xs text-slate-400">({daysFromNow(shipment.etd)})</span>
                  </div>
                  {shipment.atd && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      ATD: <span className="font-medium text-slate-800">{formatDate(shipment.atd)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold tracking-wide">To</div>
                <div className="text-lg font-semibold text-slate-900 mt-1">{shipment.portOfDischarge}</div>
                <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" /> {shipment.destination}
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    ETA: <span className="font-medium text-slate-800">{formatDate(shipment.eta)}</span>
                    <span className="text-xs text-slate-400">({daysFromNow(shipment.eta)})</span>
                  </div>
                  {shipment.ata && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      ATA: <span className="font-medium text-slate-800">{formatDate(shipment.ata)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-slate-500 uppercase font-semibold">Carrier</div><div className="font-medium text-slate-800 mt-0.5">{shipment.carrier}</div></div>
              <div><div className="text-xs text-slate-500 uppercase font-semibold">{shipment.mode === 'air' ? 'Flight' : 'Vessel'}</div><div className="font-medium text-slate-800 mt-0.5">{shipment.vesselOrFlight}</div></div>
              <div><div className="text-xs text-slate-500 uppercase font-semibold">{shipment.mode === 'air' ? 'MAWB' : 'B/L'}</div><div className="font-mono font-medium text-slate-800 mt-0.5">{shipment.mawbOrBl}</div></div>
              <div><div className="text-xs text-slate-500 uppercase font-semibold">Incoterm</div><div className="font-medium text-slate-800 mt-0.5">{shipment.incoterm}</div></div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Box className="w-4 h-4 text-brand" /> Cargo Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoTile icon={<Weight className="w-4 h-4" />} label="Gross Weight" value={`${shipment.weight.toLocaleString()} kg`} />
              <InfoTile icon={<Box className="w-4 h-4" />} label="Volume" value={`${shipment.volume} CBM`} />
              <InfoTile icon={<Hash className="w-4 h-4" />} label="Pieces" value={String(shipment.pieces)} />
              <InfoTile icon={<Scale className="w-4 h-4 text-brand" />} label={shipment.mode === 'air' ? 'Chargeable Wt (IATA)' : 'W/M Chargeable'} value={`${(shipment.chargeableWeight ?? shipment.weight).toLocaleString(undefined,{maximumFractionDigits:1})} kg`} />
              <InfoTile icon={<ClipboardCheck className="w-4 h-4" />} label="Commodity" value={shipment.commodity} />
            </div>
            {shipment.hsCode && (
              <div className="mt-4 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 flex items-center gap-3 flex-wrap">
                <FileDigit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">HS Code (classified)</div>
                  <div className="font-mono font-bold text-violet-900 dark:text-violet-100">{shipment.hsCode} — {shipment.hsDescription}</div>
                </div>
                {shipment.dutyRate !== undefined && (
                  <Badge color="violet">Duty est. {shipment.dutyRate}%</Badge>
                )}
              </div>
            )}
            {shipment.notes && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Notes</div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{shipment.notes}</p>
              </div>
            )}
          </Card>

          {/* Batch 3: HS Tariff Classifier */}
          <HSClassifier
            commodity={shipment.commodity}
            destination={shipment.destination}
            customsValue={shipment.totalAmount}
            initialHsCode={shipment.hsCode}
            onSelect={(sel) => update({ hsCode: sel.hsCode, hsDescription: sel.hsDescription, dutyRate: sel.dutyRate, dutyEstimate: sel.dutyEstimate })}
          />

          {/* Batch 3: Carrier e-Booking */}
          <CarrierBookingPanel shipment={shipment} />

          {/* Batch 3: Container & Package Manifest */}
          <ContainerManifest shipment={shipment} />

          {/* Batch 4: Dangerous Goods (DGR) */}
          <DangerousGoodsPanel shipment={shipment} />

          {/* Batch 4: Documents Manager */}
          <DocumentsManager relatedType="shipment" relatedId={shipment.id} relatedRef={shipment.reference} relatedObject={shipment} />

          {/* Batch 5: Customs Declaration SAD/ASYCUDA — replaces basic customs card */}
          <CustomsDeclarationPanel shipment={shipment} />

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand" /> Inland Trucking
            </h3>
            {trucking.length === 0 ? (
              <div className="text-sm text-slate-500">
                No trucking dispatch linked yet.{' '}
                <button
                  onClick={() => router.push(`/trucking/?new=1&shipmentId=${shipment.id}`)}
                  className="text-brand font-medium hover:underline"
                >
                  Schedule pickup/delivery →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {trucking.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{t.reference}</div>
                      <div className="text-sm text-slate-500">{t.vehicleType} · {t.vehiclePlate} · {t.driverName}</div>
                      <div className="text-xs text-slate-500 mt-1">{t.pickupLocation} → {t.deliveryLocation}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('trucking', t.status)}`}>
                      {titleCase(t.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Field label="Update Status">
                <Select value={shipment.status} onChange={(e) => update({ status: e.target.value as ShipmentStatus })}>
                  {SHIPMENT_STAGES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>
              <Button className="w-full" variant="outline" onClick={() => router.push(`/trucking/?new=1&shipmentId=${shipment.id}`)}>
                <Truck className="w-4 h-4" /> Schedule Trucking
              </Button>
              <Button className="w-full" variant="outline" onClick={() => router.push(`/invoices/?new=1&shipmentId=${shipment.id}`)}>
                <DollarSign className="w-4 h-4" /> Generate Invoice
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Customer</h3>
            <div className="text-slate-900 font-semibold">{shipment.customerName}</div>
            {customer && (
              <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                <div>{customer.contactPerson}</div>
                <div>{customer.email}</div>
                <div>{customer.phone}</div>
                <div className="mt-2">{customer.address}</div>
                <div>{customer.country}</div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Shipment Timeline</h3>
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4 pl-4 text-sm">
              <TimelineItem date={shipment.createdAt} title="Shipment created" desc={`Booking confirmed for ${shipment.customerName}`} />
              {shipment.atd && <TimelineItem date={shipment.atd} title={`Departed ${shipment.portOfLoading}`} desc={shipment.vesselOrFlight} />}
              {shipment.customsStatus === 'cleared' && <TimelineItem title="Customs cleared" desc="All duties paid and docs released" />}
              {shipment.ata && <TimelineItem date={shipment.ata} title={`Arrived ${shipment.portOfDischarge}`} desc="Awaiting unloading" />}
              {shipment.status === 'delivered' && <TimelineItem title="Delivered to consignee" desc="POD received" highlight />}
            </ol>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Shipment P&L
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Revenue (sell)</span><span className="text-slate-900 font-medium">{formatMoney(shipment.totalAmount, shipment.currency)}</span>
              </div>
              <PLLine label="Freight cost" value={estFreightCost} currency={shipment.currency} />
              <PLLine label="Customs / duties" value={estCustomsCost} currency={shipment.currency} />
              <PLLine label="Trucking / inland" value={estTruckingCost} currency={shipment.currency} />
              <PLLine label="Other costs" value={estOtherCost} currency={shipment.currency} />
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between">
                <span className="text-slate-700 font-semibold">Total cost</span>
                <span className="text-slate-900 font-semibold">{formatMoney(totalCost, shipment.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Gross profit</span>
                <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatMoney(profit, shipment.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Margin</span>
                <span className={`text-xs font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Costs are auto-estimated from revenue/linked trucking. Override by entering actuals in a future release.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-600" /> Carbon Footprint (CO₂e)
            </h3>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {shipment.co2e ? (shipment.co2e / 1000).toFixed(2) : '—'}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">tonnes CO₂e</div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Est. using GLEC factors · {shipment.mode === 'air' ? 'Air: 602 g/t·km' : 'Sea: 15 g/t·km'} · {(shipment.weight / 1000).toFixed(2)} t
            </div>
            <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                style={{
                  width: `${Math.max(
                    5,
                    Math.min(
                      100,
                      100 - Math.min(100, ((shipment.co2e || 0) / (shipment.mode === 'air' ? 20000 : 5000)) * 100)
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span>Greener</span><span>More CO₂</span>
            </div>
          </Card>

          {/* Batch 3: Shipment-specific Email Automation */}
          <EmailCenter scope="shipment" scopeRef={shipment} />
        </div>
      </div>
    </PageShell>
  );
}

function PLLine({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="text-slate-800">{formatMoney(value, currency)}</span>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase">{icon}{label}</div>
      <div className="text-base font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function TimelineItem({ date, title, desc, highlight }: { date?: string; title: string; desc?: string; highlight?: boolean }) {
  return (
    <li className="relative">
      <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white ${highlight ? 'bg-emerald-500' : 'bg-brand'}`} />
      <div className={`font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{title}</div>
      {desc && <div className="text-slate-500 text-xs mt-0.5">{desc}</div>}
      {date && <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(date)}</div>}
    </li>
  );
}
