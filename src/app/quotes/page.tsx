'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal, EmptyState } from '@/components/ui';
import { db } from '@/lib/store';
import { withBasePath } from '@/lib/basePath';
import type { Quote, ShipmentMode, ShipmentDirection, QuoteRequest } from '@/lib/types';
import type { DB } from '@/lib/store';
import { FileText, Plus, ArrowUpRight, Calendar, Weight, Box, Send, Check, X, Trash2, Download, Inbox, MessageSquare, Sparkles, ExternalLink } from 'lucide-react';
import { formatDate, formatMoney, statusColor, titleCase, daysFromNow } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import { generateQuotePDF, downloadBlob } from '@/lib/documents';
import PortAutocomplete from '@/components/PortAutocomplete';

export default function QuotesPage() {
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [qrOpen, setQrOpen] = useState(false);
  const params = useQueryParams();
  const router = useRouter();

  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
  }, [params]);

  const reload = () => setData(db.getAll());

  const items = useMemo(() => {
    if (!data) return [];
    return data.quotes.filter((q) => (filter === 'all' ? true : q.status === filter));
  }, [data, filter]);

  function create(q: Omit<Quote, 'id' | 'number' | 'createdAt'>) {
    db.createQuote(q);
    setData(db.getAll());
    setModalOpen(false);
  }

  function setStatus(id: string, status: Quote['status']) {
    db.updateQuote(id, { status });
    setData(db.getAll());
  }

  if (!data) return <PageShell title="Quotes"><div>Loading…</div></PageShell>;

  const stats = {
    pending: data.quotes.filter((q) => q.status === 'pending').length,
    accepted: data.quotes.filter((q) => q.status === 'accepted').length,
    total: data.quotes.reduce((s, q) => s + q.total, 0),
  };

  return (
    <PageShell title="Quotes" subtitle="Issue, track and convert freight quotes.">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500 uppercase font-semibold">Pending</div><div className="text-2xl font-bold">{stats.pending}</div></div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><Check className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500 uppercase font-semibold">Accepted</div><div className="text-2xl font-bold">{stats.accepted}</div></div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><ArrowUpRight className="w-5 h-5" /></div>
          <div><div className="text-xs text-slate-500 uppercase font-semibold">Pipeline Value</div><div className="text-2xl font-bold">{formatMoney(stats.total)}</div></div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <button onClick={() => setQrOpen(true)} className="w-full flex items-center gap-3 text-left">
            <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center relative">
              <Inbox className="w-5 h-5" />
              {(data?.quoteRequests.filter((q) => q.status === 'new').length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center">{data?.quoteRequests.filter((q) => q.status === 'new').length}</span>
              )}
            </div>
            <div><div className="text-xs text-slate-500 uppercase font-semibold">Inbox Requests</div><div className="text-2xl font-bold">{data?.quoteRequests.length || 0}</div></div>
          </button>
        </Card>
      </div>

      {/* Incoming public quote requests */}
      {qrOpen && data && (
        <QuoteRequestsInbox
          requests={data.quoteRequests}
          onClose={() => setQrOpen(false)}
          onQuote={(qr) => {
            // Pre-fill new quote modal from request
            setQrOpen(false);
            setModalOpen(true);
            // Quick respond by sending email
            db.logEmail({
              to: qr.customerEmail,
              subject: `Quote request received — ${qr.commodity} ${qr.origin}→${qr.destination}`,
              template: 'quote',
              body: `Dear ${qr.customerName},\n\nThank you for your quote request. We're preparing a detailed offer for ${qr.commodity} ${qr.origin}→${qr.destination} (${qr.weight}kg / ${qr.volume} CBM) and will reply within 4 business hours.\n\nFreightFlow Sales.`,
            });
            db.updateQuoteRequest(qr.id, { status: 'quoted' });
            reload();
          }}
          onDelete={(id) => { db.deleteQuoteRequest(id); reload(); }}
        />
      )}


      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'pending', 'accepted', 'rejected', 'converted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Quote</Button>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState icon={<FileText className="w-12 h-12" />} title="No quotes yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold">Quote #</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Route</th>
                  <th className="px-4 py-3 text-left font-semibold">Mode</th>
                  <th className="px-4 py-3 text-left font-semibold">Cargo</th>
                  <th className="px-4 py-3 text-left font-semibold">Valid Until</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{q.number}</td>
                    <td className="px-4 py-3 text-slate-700">{q.customerName}</td>
                    <td className="px-4 py-3 text-slate-700">{q.origin} → {q.destination}</td>
                    <td className="px-4 py-3">
                      <Badge color={q.mode === 'air' ? 'blue' : 'indigo'}>{q.mode === 'air' ? 'Air' : 'Sea'} · {titleCase(q.direction)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{q.commodity}</div>
                      <div className="text-xs text-slate-400">{q.weight}kg · {q.volume} CBM</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(q.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('quote', q.status)}`}>{titleCase(q.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                          <button title="Download PDF" onClick={() => { const full = data.quotes.find(x => x.id === q.id); if (full) downloadBlob(generateQuotePDF(full), `${full.number}.pdf`); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Download className="w-4 h-4" /></button>
                          {q.status === 'pending' && (
                            <>
                            <button title="Accept" onClick={() => setStatus(q.id, 'accepted')} className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><Check className="w-4 h-4" /></button>
                            <button title="Reject" onClick={() => setStatus(q.id, 'rejected')} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"><X className="w-4 h-4" /></button>
                            <button title="Convert to Shipment" onClick={() => {
                              const newShipment = db.convertQuoteToShipment(q.id);
                              if (newShipment) router.push(`/shipments/?id=${newShipment.id}`);
                            }} className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600"><Send className="w-4 h-4" /></button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewQuoteModal open={modalOpen} onClose={() => setModalOpen(false)} customers={data.customers} onSubmit={create} />
    </PageShell>
  );
}

function QuoteRequestsInbox({ requests, onClose, onQuote, onDelete }: {
  requests: QuoteRequest[];
  onClose: () => void;
  onQuote: (qr: QuoteRequest) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Incoming Quote Requests</h3>
          <Badge color="violet">{requests.filter((q) => q.status === 'new').length} new</Badge>
        </div>
        <div className="flex items-center gap-2">
          <a href={withBasePath('/get-quote')} target="_blank" className="text-xs text-brand font-medium inline-flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Public quote form
          </a>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
      {requests.length === 0 ? (
        <EmptyState icon={<Inbox className="w-12 h-12" />} title="No incoming requests yet" description="Share your public quote page link to let customers request freight rates 24/7." />
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {requests.map((q) => (
            <div key={q.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white">{q.customerName}</span>
                  {q.company && <span className="text-xs text-slate-500">({q.company})</span>}
                  {q.status === 'new' ? <Badge color="violet">NEW</Badge> : q.status === 'quoted' ? <Badge color="emerald">Quoted</Badge> : <Badge color="slate">{q.status}</Badge>}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                  <Badge color={q.mode === 'air' ? 'blue' : q.mode === 'sea' ? 'indigo' : 'amber'}>{q.mode} · {q.direction}</Badge>
                  {q.origin} → {q.destination}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span>{q.commodity}</span>
                  <span>{q.weight}kg · {q.volume} CBM · {q.pieces} pcs</span>
                  {q.incoterm && <span>{q.incoterm}</span>}
                </div>
                {q.notes && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{q.notes}"</div>}
                <div className="text-[11px] text-slate-400 mt-1">{q.customerEmail} · {daysFromNow(q.createdAt)} · ref {q.token.toUpperCase()}</div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="sm" onClick={() => onQuote(q)} disabled={q.status === 'quoted'}>
                  <Sparkles className="w-3 h-3" /> {q.status === 'quoted' ? 'Replied' : 'Reply with quote'}
                </Button>
                <button onClick={() => { if (confirm('Delete request?')) onDelete(q.id); }} className="text-xs text-rose-500 hover:text-rose-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NewQuoteModal({
  open,
  onClose,
  customers,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  customers: DB['customers'];
  onSubmit: (q: Omit<Quote, 'id' | 'number' | 'createdAt'>) => void;
}) {
  const [customerName, setCustomerName] = useState(customers[0]?.name || '');
  const [mode, setMode] = useState<ShipmentMode>('sea');
  const [direction, setDirection] = useState<ShipmentDirection>('export');
  const [origin, setOrigin] = useState('Antananarivo, MG');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('1000');
  const [volume, setVolume] = useState('5');
  const [commodity, setCommodity] = useState('General Cargo');
  const [freightRate, setFreightRate] = useState('3000');
  const [customsFee, setCustomsFee] = useState('500');
  const [truckingFee, setTruckingFee] = useState('300');
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  const total = Number(freightRate) + Number(customsFee) + Number(truckingFee);

  const submit = () => {
    onSubmit({
      customerName,
      mode,
      direction,
      origin,
      destination,
      weight: Number(weight),
      volume: Number(volume),
      commodity,
      status: 'pending',
      freightRate: Number(freightRate),
      customsFee: Number(customsFee),
      truckingFee: Number(truckingFee),
      total,
      validUntil,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Quote" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Customer">
            <Select value={customerName} onChange={(e) => setCustomerName(e.target.value)}>
              {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as ShipmentMode)}>
              <option value="sea">Sea</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field label="Direction">
            <Select value={direction} onChange={(e) => setDirection(e.target.value as ShipmentDirection)}>
              <option value="export">Export</option>
              <option value="import">Import</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PortAutocomplete label="Origin" value={origin} onChange={setOrigin} mode={mode} required />
          <PortAutocomplete label="Destination" value={destination} onChange={setDestination} mode={mode} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Weight (kg)"><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          <Field label="Volume (CBM)"><Input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} /></Field>
          <Field label="Commodity"><Input value={commodity} onChange={(e) => setCommodity(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Freight (USD)"><Input type="number" value={freightRate} onChange={(e) => setFreightRate(e.target.value)} /></Field>
          <Field label="Customs Fee (USD)"><Input type="number" value={customsFee} onChange={(e) => setCustomsFee(e.target.value)} /></Field>
          <Field label="Trucking (USD)"><Input type="number" value={truckingFee} onChange={(e) => setTruckingFee(e.target.value)} /></Field>
          <Field label="Valid Until"><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
          <span className="text-sm text-slate-600">Total Quote Amount</span>
          <span className="text-2xl font-bold text-brand">{formatMoney(total)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!destination}>Issue Quote</Button>
        </div>
      </div>
    </Modal>
  );
}
