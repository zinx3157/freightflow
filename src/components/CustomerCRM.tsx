'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Button, Badge, Input, Textarea, Select, Field, Modal } from './ui';
import { Phone, Mail, MapPin, Calendar, DollarSign, Package, FileText, Truck, TrendingUp, Clock, Plus, MessageSquare, PhoneCall, Users, AlertTriangle, Star } from 'lucide-react';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';

type NoteType = 'note' | 'call' | 'meeting' | 'email' | 'document' | 'complaint';
const NOTE_META: Record<NoteType, { label: string; icon: React.ReactNode; color: any }> = {
  note: { label: 'Note', icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'slate' },
  call: { label: 'Call', icon: <PhoneCall className="w-3.5 h-3.5" />, color: 'blue' },
  meeting: { label: 'Meeting', icon: <Users className="w-3.5 h-3.5" />, color: 'indigo' },
  email: { label: 'Email', icon: <Mail className="w-3.5 h-3.5" />, color: 'violet' },
  document: { label: 'Document', icon: <FileText className="w-3.5 h-3.5" />, color: 'amber' },
  complaint: { label: 'Complaint', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'rose' },
};

export default function CustomerCRM({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ type: 'note' as NoteType, title: '', body: '' });

  const refresh = () => {
    const d = db.getAll();
    setNotes(db.notesForCustomer(customer.id));
    setShipments(d.shipments.filter((s) => s.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setInvoices(d.invoices.filter((i) => i.customerId === customer.id));
    setQuotes(d.quotes.filter((q) => q.customerName === customer.name));
  };
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, [customer.id]);

  const metrics = useMemo(() => {
    const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const openAr = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const shipmentCount = shipments.length;
    const active = shipments.filter((s) => !['delivered', 'cancelled'].includes(s.status)).length;
    const totalValue = shipments.reduce((s, x) => s + x.totalAmount, 0);
    return { totalRevenue, openAr, shipmentCount, active, totalValue };
  }, [shipments, invoices]);

  const creditUsed = metrics.openAr;
  const creditLimit = customer.creditLimit || 0;
  const creditPct = creditLimit ? Math.min(100, (creditUsed / creditLimit) * 100) : 0;

  const addNote = () => {
    if (!draft.title) return;
    db.addCustomerNote({
      customerId: customer.id,
      type: draft.type,
      title: draft.title,
      body: draft.body,
      author: 'Current User',
    });
    setDraft({ type: 'note', title: '', body: '' });
    setAddOpen(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Customer header card */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.name}</h2>
              {customer.tags?.map((t) => <Badge key={t} color={t === 'VIP' ? 'amber' : 'blue'}>{t}</Badge>)}
              {metrics.openAr > (customer.creditLimit || 0) * 0.8 && <Badge color="rose"><AlertTriangle className="w-3 h-3" />Credit watch</Badge>}
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 space-y-0.5">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{customer.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{customer.phone}</div>
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{customer.address}, {customer.country}</div>
              <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />Customer since {formatDate(customer.createdAt)}</div>
              {customer.accountManager && <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-500" />Account manager: {customer.accountManager}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Mail className="w-3.5 h-3.5" /> Email</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" /> Add note</Button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <KPITile label="Shipments" value={metrics.shipmentCount} sub={`${metrics.active} active`} icon={<Package className="w-4 h-4" />} color="blue" />
          <KPITile label="Total booked" value={formatMoney(metrics.totalValue)} icon={<DollarSign className="w-4 h-4" />} color="indigo" />
          <KPITile label="Paid revenue" value={formatMoney(metrics.totalRevenue)} icon={<TrendingUp className="w-4 h-4" />} color="emerald" />
          <KPITile label="Open A/R" value={formatMoney(metrics.openAr)} icon={<Clock className="w-4 h-4" />} color="amber" />
          <KPITile label="Credit limit" value={formatMoney(customer.creditLimit || 0)} sub={`${creditPct.toFixed(0)}% used · Net ${customer.paymentTerms || 30} days`} icon={<DollarSign className="w-4 h-4" />} color={creditPct > 80 ? 'rose' : 'slate'} />
        </div>

        {creditLimit > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${creditPct > 80 ? 'bg-rose-500' : creditPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${creditPct}%` }} />
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline / notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand" /> Activity Timeline</h3>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" /> New entry</Button>
            </div>
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />
              {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet. Add the first call, meeting, or email record.</p>}
              {notes.map((n) => {
                const m = NOTE_META[n.type as NoteType];
                return (
                  <div key={n.id} className="relative">
                    <div className={`absolute -left-[22px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${
                      n.type === 'complaint' ? 'from-rose-500 to-rose-700' :
                      n.type === 'call' ? 'from-blue-500 to-blue-700' :
                      n.type === 'meeting' ? 'from-indigo-500 to-indigo-700' :
                      n.type === 'email' ? 'from-violet-500 to-violet-700' :
                      'from-slate-500 to-slate-700'
                    }`}>{m.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{n.title}</span>
                        <Badge color={m.color}>{m.label}</Badge>
                      </div>
                      {n.body && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{n.body}</p>}
                      <div className="text-[11px] text-slate-400 mt-1">{n.author} · {formatDateTime(n.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              {/* Synthetic activity */}
              {shipments.slice(0, 5).map((s) => (
                <div key={s.id} className="relative">
                  <div className="absolute -left-[22px] top-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-brand flex items-center justify-center text-white"><Package className="w-3 h-3" /></div>
                  <div>
                    <div className="text-sm"><span className="font-semibold text-slate-900 dark:text-white">Shipment {s.reference}</span> <span className="text-slate-500">— {s.commodity} ({s.mode} {s.direction})</span></div>
                    <div className="text-[11px] text-slate-400">{formatDate(s.createdAt)} · {formatMoney(s.totalAmount, s.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-amber-500" /> Recent Shipments</h3>
            {shipments.length === 0 ? (
              <p className="text-sm text-slate-500">No shipments yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {shipments.slice(0, 6).map((s) => (
                  <a key={s.id} href={`/shipments/?id=${s.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-2 -mx-2">
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{s.reference}</div>
                      <div className="text-xs text-slate-500">{s.portOfLoading} → {s.portOfDischarge} · {s.commodity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatMoney(s.totalAmount, s.currency)}</div>
                      <Badge color={s.status === 'delivered' ? 'emerald' : s.status === 'in_transit' ? 'blue' : 'slate'}>{s.status.replace('_', ' ')}</Badge>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column: invoices, quotes */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /> Invoices</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 6).map((i) => (
                  <div key={i.id} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white text-xs">{i.number}</div>
                      <div className="text-xs text-slate-500">{formatDate(i.issueDate)} · due {formatDate(i.dueDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(i.total, i.currency)}</div>
                      <Badge color={i.status === 'paid' ? 'emerald' : i.status === 'overdue' ? 'rose' : 'amber'}>{i.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Quotes</h3>
            {quotes.length === 0 ? <p className="text-sm text-slate-500">No quotes yet.</p> : (
              <div className="space-y-2">
                {quotes.slice(0, 5).map((q) => (
                  <div key={q.id} className="p-2 rounded border border-slate-200 dark:border-slate-700 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white text-xs">{q.number}</div>
                      <div className="text-xs text-slate-500">{q.origin} → {q.destination}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(q.total)}</div>
                      <Badge color={q.status === 'accepted' ? 'emerald' : q.status === 'rejected' ? 'rose' : 'amber'}>{q.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add timeline entry" size="md">
        <div className="space-y-3">
          <Field label="Type">
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as NoteType })}>
              {Object.entries(NOTE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Q3 forecast call" /></Field>
          <Field label="Details"><Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4} placeholder="Notes from the call..." /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={!draft.title}>Save entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function KPITile({ label, value, sub, icon, color }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; color: string }) {
  const grads: Record<string, string> = {
    blue: 'from-blue-500 to-brand', emerald: 'from-emerald-500 to-teal-600', amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600', indigo: 'from-indigo-500 to-violet-600', slate: 'from-slate-500 to-slate-700',
  };
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grads[color]} text-white flex items-center justify-center mb-2`}>{icon}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-base font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}
