'use client';

import { useEffect, useState } from 'react';
import { useQueryParams } from '@/lib/useQueryParams';
import PageShell from '@/components/PageShell';
import { Card, Button, Input, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { Shipment } from '@/lib/types';
import {
  Search,
  Package,
  Plane,
  Ship,
  MapPin,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertCircle,
  CircleDot,
  Download,
  ExternalLink,
  ShieldCheck,
  Leaf,
  Zap,
  Quote,
} from 'lucide-react';
import { formatDate, formatDateTime, statusColor, titleCase, daysFromNow, formatMoney } from '@/lib/utils';
import { generateShipmentBL, downloadBlob } from '@/lib/documents';

const STAGES: { key: Shipment['status']; label: string; icon: React.ReactNode }[] = [
  { key: 'quoted', label: 'Quoted', icon: <CircleDot className="w-4 h-4" /> },
  { key: 'booked', label: 'Booked', icon: <Package className="w-4 h-4" /> },
  { key: 'picked_up', label: 'Picked Up', icon: <Truck className="w-4 h-4" /> },
  { key: 'in_transit', label: 'In Transit', icon: <Ship className="w-4 h-4" /> },
  { key: 'customs', label: 'Customs', icon: <FileCheck className="w-4 h-4" /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 className="w-4 h-4" /> },
];

const CUSTOMS_STAGES = ['pending', 'docs_received', 'declared', 'inspection', 'duties_paid', 'cleared'];

export default function TrackingPage() {
  const params = useQueryParams();
  const [data, setData] = useState<ReturnType<typeof db.getAll> | null>(null);
  const [query, setQuery] = useState(params.get('ref') || params.get('awb') || params.get('bl') || '');
  const [result, setResult] = useState<Shipment | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { setData(db.getAll()); }, []);
  useEffect(() => {
    const ref = params.get('ref') || params.get('awb') || params.get('bl');
    if (ref) setQuery(ref);
  }, [params]);

  function search() {
    if (!data) return;
    const qq = query.trim().toLowerCase();
    if (!qq) { setResult(null); setNotFound(false); return; }
    const hit = data.shipments.find((s) =>
      s.reference.toLowerCase() === qq ||
      s.mawbOrBl.toLowerCase() === qq ||
      s.mawbOrBl.toLowerCase().includes(qq) ||
      s.reference.toLowerCase().includes(qq)
    ) || null;
    setResult(hit);
    setNotFound(!hit);
  }

  useEffect(() => { if (query && data) search(); /* eslint-disable-next-line */ }, [data]);

  const portalFor = (s: Shipment) => {
    let h = 0;
    for (let i = 0; i < s.id.length; i++) h = (h << 5) - h + s.id.charCodeAt(i);
    return 'tkn_' + Math.abs(h).toString(36) + '_' + s.id.slice(-4);
  };

  return (
    <PageShell title="Track & Trace" subtitle="Enter a shipment reference, AWB or B/L number to see live status.">
      <Card className="p-6 bg-gradient-to-br from-brand via-brand-dark to-indigo-700 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-emerald-400 blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5" /> Live tracking · no login required
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Where is my shipment?</h2>
          <p className="text-white/80 text-sm mb-5">Track by FRT reference, AWB (057-…) or B/L number. Try <code className="bg-white/20 px-1.5 py-0.5 rounded">FRT-2026-0001</code> or <code className="bg-white/20 px-1.5 py-0.5 rounded">FRT-2026-0002</code></p>
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Reference, AWB or B/L…"
                className="w-full pl-10 pr-3 py-3 rounded-lg text-slate-900 bg-white outline-none"
              />
            </div>
            <Button variant="secondary" size="lg" className="bg-white text-brand hover:bg-slate-100" onClick={search}>
              <Search className="w-4 h-4" /> Track
            </Button>
          </div>
        </div>
      </Card>

      {notFound && (
        <Card className="p-10 text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white">No shipment found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            We couldn't find a shipment matching <strong>{query}</strong>. Double-check your reference or request a quote for a new shipment.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <a href="/get-quote"><Button variant="outline"><Quote className="w-4 h-4" /> Get a new quote</Button></a>
          </div>
        </Card>
      )}

      {result && <ShipmentTracker s={result} portalToken={portalFor(result)} />}

      {!result && !notFound && data && (
        <>
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Try a demo tracking number</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Click any shipment to see a live status timeline — same view your customers see on their branded portal.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.shipments.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setQuery(s.reference); setResult(s); setNotFound(false); }}
                  className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand hover:shadow-sm transition bg-white dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    {s.mode === 'air' ? <Plane className="w-4 h-4 text-blue-500" /> : <Ship className="w-4 h-4 text-indigo-500" />}
                    <span className="font-bold text-slate-900 dark:text-white">{s.reference}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ml-auto ${statusColor('shipment', s.status)}`}>{titleCase(s.status)}</span>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{s.portOfLoading} → {s.portOfDischarge}</div>
                  <div className="text-xs text-slate-500 mt-0.5">ETA {formatDate(s.eta)} · {s.commodity}</div>
                </button>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
              <h4 className="font-semibold text-slate-900 dark:text-white">Real-time visibility</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Share a branded portal link with your customers for live tracking — no login required.</p>
            </Card>
            <Card className="p-5">
              <Leaf className="w-8 h-8 text-emerald-600 mb-2" />
              <h4 className="font-semibold text-slate-900 dark:text-white">CO₂ per shipment</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customers see the carbon footprint of their freight, calculated using GLEC framework factors.</p>
            </Card>
            <Card className="p-5">
              <a href="/get-quote" className="block">
                <Quote className="w-8 h-8 text-brand mb-2" />
                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">Need a quote? <ExternalLink className="w-3.5 h-3.5" /></h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request an all-in air, sea or road freight quote in under a minute.</p>
              </a>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

function ShipmentTracker({ s, portalToken }: { s: Shipment; portalToken: string }) {
  const currentIdx = STAGES.findIndex((st) => st.key === s.status);
  const customsIdx = s.customsStatus ? CUSTOMS_STAGES.indexOf(s.customsStatus) : -1;
  const overdue = s.status !== 'delivered' && new Date(s.eta) < new Date();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{s.reference}</span>
              {s.mode === 'air' ? <Badge color="blue"><Plane className="w-3 h-3" /> AIR</Badge> : <Badge color="indigo"><Ship className="w-4 h-4" /> SEA</Badge>}
              <Badge color={s.direction === 'import' ? 'emerald' : 'blue'}>{titleCase(s.direction)}</Badge>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('shipment', s.status)}`}>{titleCase(s.status)}</span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 mt-1">{s.commodity} · {s.carrier} {s.vesselOrFlight}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => downloadBlob(generateShipmentBL(s), `${s.reference}_${s.mode === 'air' ? 'AWB' : 'BL'}.pdf`)}>
              <Download className="w-3.5 h-3.5" /> Download {s.mode === 'air' ? 'AWB' : 'B/L'}
            </Button>
            <Button size="sm" onClick={() => window.open(`/portal/?t=${portalToken}`, '_blank')}>
              <ExternalLink className="w-3.5 h-3.5" /> Open customer portal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Origin
            </div>
            <div className="font-semibold text-slate-900 dark:text-white">{s.portOfLoading}</div>
            <div className="text-slate-500 text-xs">{s.origin}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Destination
            </div>
            <div className="font-semibold text-slate-900 dark:text-white">{s.portOfDischarge}</div>
            <div className="text-slate-500 text-xs">{s.destination}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
              <Calendar className="w-3.5 h-3.5 text-brand" /> Schedule
            </div>
            <div className="text-slate-700 dark:text-slate-300">ETD: <strong>{formatDate(s.etd)}</strong></div>
            <div className={`text-sm font-semibold ${overdue ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
              ETA: {formatDate(s.eta)} <span className="text-xs font-normal text-slate-500">({daysFromNow(s.eta)})</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-5">Shipment Journey</h3>
        <div className="relative pl-2">
          <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
          <ol className="space-y-5">
            {STAGES.map((st, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <li key={st.key} className="flex gap-4 relative">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 z-10 ring-4 ring-white dark:ring-slate-900 ${
                    done ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                  }`}>
                    {st.icon}
                  </div>
                  <div className="pt-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{st.label}</span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> In Progress
                        </span>
                      )}
                      {isCurrent && s.status === 'in_transit' && <Badge color="blue">Live on map</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {i === 0 && 'Quote prepared and customer confirmed booking.'}
                      {i === 1 && 'Space confirmed with carrier; documentation in progress.'}
                      {i === 2 && 'Cargo collected from shipper and moved to terminal.'}
                      {i === 3 && `${s.mode === 'air' ? 'Flight' : 'Vessel'} departed; in transit to destination.`}
                      {i === 4 && (s.customsStatus === 'inspection' ? 'Customs inspection required — our broker is handling it.' : 'Shipment undergoing customs clearance at destination.')}
                      {i === 5 && 'Delivered to consignee. Proof of delivery on file.'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-brand" /> Customs Status
          </h3>
          {s.customsStatus ? (
            <div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor('customs', s.customsStatus)}`}>
                {titleCase(s.customsStatus)}
              </span>
              <div className="mt-4 grid grid-cols-6 gap-1">
                {CUSTOMS_STAGES.map((cs, i) => (
                  <div key={cs} className="text-center">
                    <div className={`h-1.5 rounded-full ${i <= customsIdx ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    <div className="text-[10px] text-slate-500 mt-1 capitalize truncate">{cs.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
              {s.duties ? (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <strong>Duties & taxes:</strong> {formatMoney(s.duties, s.currency)}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Customs entry not yet filed.</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Cargo Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Weight</div><div className="font-bold text-lg text-slate-900 dark:text-white">{s.weight.toLocaleString()} kg</div></div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Volume</div><div className="font-bold text-lg text-slate-900 dark:text-white">{s.volume} CBM</div></div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Pieces</div><div className="font-bold text-lg text-slate-900 dark:text-white">{s.pieces}</div></div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Incoterm</div><div className="font-bold text-lg text-slate-900 dark:text-white">{s.incoterm}</div></div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">{s.mode === 'air' ? 'MAWB' : 'B/L'}</div><div className="font-mono text-sm text-slate-700 dark:text-slate-300">{s.mawbOrBl}</div></div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Reference</div><div className="font-mono text-sm text-slate-700 dark:text-slate-300">{s.reference}</div></div>
          </div>
          {s.co2e ? (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200">CO₂e: {(s.co2e / 1000).toFixed(2)} tonnes</div>
                <div className="text-emerald-700 dark:text-emerald-400">Calculated using GLEC emission factors</div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
