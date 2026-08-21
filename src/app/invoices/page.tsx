'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal, EmptyState } from '@/components/ui';
import { db } from '@/lib/store';
import type { Invoice } from '@/lib/types';
import type { DB } from '@/lib/store';
import { Receipt, Plus, Download, Send, CheckCircle, XCircle } from 'lucide-react';
import { formatDate, formatMoney, statusColor, titleCase } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import { generateInvoicePDF, downloadBlob } from '@/lib/documents';

export default function InvoicesPage() {
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const params = useQueryParams();
  const router = useRouter();

  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
  }, [params]);

  const items = useMemo(() => {
    if (!data) return [];
    return data.invoices.filter((i) => (filter === 'all' ? true : i.status === filter));
  }, [data, filter]);

  const stats = useMemo(() => {
    if (!data) return { paid: 0, sent: 0, overdue: 0, draft: 0 };
    const paid = data.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const sent = data.invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdue = data.invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const draft = data.invoices.filter((i) => i.status === 'draft').length;
    return { paid, sent, overdue, draft };
  }, [data]);

  function create(inv: Omit<Invoice, 'id' | 'number'>) {
    db.createInvoice(inv);
    setData(db.getAll());
    setModalOpen(false);
  }

  function mark(id: string, status: Invoice['status']) {
    const patch: Partial<Invoice> = { status };
    if (status === 'paid') patch.paidDate = new Date().toISOString().slice(0, 10);
    db.updateInvoice(id, patch);
    setData(db.getAll());
  }

  if (!data) return <PageShell title="Invoices"><div>Loading…</div></PageShell>;

  return (
    <PageShell title="Invoices & Billing" subtitle="Manage customer invoices and payments.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-xs text-slate-500 uppercase font-semibold">Paid</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(stats.paid)}</div>
          <div className="text-xs text-slate-400 mt-1">Received</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-500 uppercase font-semibold">Outstanding (Sent)</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{formatMoney(stats.sent)}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting payment</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-500 uppercase font-semibold">Overdue</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{formatMoney(stats.overdue)}</div>
          <div className="text-xs text-slate-400 mt-1">Requires follow-up</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-slate-500 uppercase font-semibold">Drafts</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{stats.draft}</div>
          <div className="text-xs text-slate-400 mt-1">Not yet sent</div>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize ${filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState icon={<Receipt className="w-12 h-12" />} title="No invoices" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/70 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Issue Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{i.number}</td>
                    <td className="px-4 py-3 text-slate-700">{i.customerName}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(i.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(i.total, i.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('invoice', i.status)}`}>{titleCase(i.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {i.status === 'draft' && (
                          <button title="Send" onClick={() => mark(i.id, 'sent')} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Send className="w-4 h-4" /></button>
                        )}
                        {(i.status === 'sent' || i.status === 'overdue') && (
                          <button title="Mark paid" onClick={() => mark(i.id, 'paid')} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600"><CheckCircle className="w-4 h-4" /></button>
                        )}
                        <button title="Download PDF" onClick={() => {
                          const full = data.invoices.find(x => x.id === i.id);
                          if (full) downloadBlob(generateInvoicePDF(full), `${full.number}.pdf`);
                        }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        data={data}
        preselectedShipmentId={params.get('shipmentId') || undefined}
        onSubmit={create}
      />
    </PageShell>
  );
}

function NewInvoiceModal({
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
  onSubmit: (inv: Omit<Invoice, 'id' | 'number'>) => void;
}) {
  const [customerId, setCustomerId] = useState(data.customers[0]?.id || '');
  const [shipmentId, setShipmentId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('USD');
  const [items, setItems] = useState<{ description: string; amount: string }[]>([
    { description: 'Ocean Freight', amount: '' },
    { description: 'Customs Clearance', amount: '' },
    { description: 'Inland Trucking', amount: '' },
  ]);

  useEffect(() => {
    if (preselectedShipmentId) {
      setShipmentId(preselectedShipmentId);
      const sh = data.shipments.find((s) => s.id === preselectedShipmentId);
      if (sh) {
        setCustomerId(sh.customerId);
        setCurrency(sh.currency);
        setItems([
          { description: `${sh.mode === 'air' ? 'Air' : 'Ocean'} Freight ${sh.portOfLoading} → ${sh.portOfDischarge}`, amount: String(Math.round(sh.totalAmount * 0.7)) },
          { description: 'Customs Clearance & Documentation', amount: String(Math.round(sh.totalAmount * 0.15)) },
          { description: 'Inland Transportation', amount: String(Math.round(sh.totalAmount * 0.15)) },
        ]);
      }
    }
  }, [preselectedShipmentId, open, data]);

  const setItem = (i: number, patch: Partial<{ description: string; amount: string }>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems([...items, { description: '', amount: '0' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const parsed = items.map((it) => ({ description: it.description, amount: Number(it.amount) || 0 }));
  const subtotal = parsed.reduce((s, it) => s + it.amount, 0);
  const tax = 0;
  const total = subtotal + tax;

  const submit = () => {
    const cust = data.customers.find((c) => c.id === customerId);
    if (!cust) return;
    onSubmit({
      customerId,
      customerName: cust.name,
      shipmentId: shipmentId || undefined,
      items: parsed.filter((it) => it.description.trim()),
      subtotal,
      tax,
      total,
      status: 'draft',
      issueDate,
      dueDate,
      currency,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Invoice" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {data.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Linked Shipment (optional)">
            <Select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
              <option value="">— None —</option>
              {data.shipments.map((s) => <option key={s.id} value={s.id}>{s.reference} — {s.customerName}</option>)}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option>USD</option><option>EUR</option><option>MGA</option><option>GBP</option>
            </Select>
          </Field>
          <Field label="Issue Date"><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Field>
          <Field label="Due Date"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase text-slate-600">Line Items</div>
            <button className="text-xs text-brand font-medium hover:underline" onClick={addItem}>+ Add line</button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input className="col-span-8 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" placeholder="Description" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                <input className="col-span-3 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" type="number" placeholder="Amount" value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} />
                <button className="col-span-1 text-rose-500 hover:bg-rose-50 rounded-lg" onClick={() => removeItem(i)}><XCircle className="w-4 h-4 mx-auto" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Tax</span><span>{formatMoney(tax, currency)}</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-200 text-lg font-bold"><span>Total</span><span className="text-brand">{formatMoney(total, currency)}</span></div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={total <= 0}>Create Invoice (Draft)</Button>
        </div>
      </div>
    </Modal>
  );
}
