'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Input, Select, Field, Modal, EmptyState } from '@/components/ui';
import { db, toast } from '@/lib/store';
import type { Invoice } from '@/lib/types';
import type { DB } from '@/lib/store';
import { Receipt, Plus, Download, Send, CheckCircle, XCircle, FileText } from 'lucide-react';
import { formatDate, formatMoney, statusColor, titleCase } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useQueryParams } from '@/lib/useQueryParams';
import { generateInvoicePDF, downloadBlob } from '@/lib/documents';

export default function InvoicesPage() {
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [presetShipmentId, setPresetShipmentId] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<string>('all');
  const params = useQueryParams();
  const router = useRouter();

  // Load DB once on mount; sync when data changes
  useEffect(() => {
    setData(db.getAll());
    const onData = () => setData(db.getAll());
    window.addEventListener('ff:data-changed', onData);
    return () => window.removeEventListener('ff:data-changed', onData);
  }, []);

  // React to ?new=1 & ?shipmentId=XXX
  useEffect(() => {
    if (params.get('new') === '1') {
      setPresetShipmentId(params.get('shipmentId') || undefined);
      setModalOpen(true);
    }
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
    const created = db.createInvoice(inv);
    setData(db.getAll());
    setModalOpen(false);
    // Clear ?new=1 from URL so refresh/back doesn't re-open empty modal
    router.replace('/invoices/');
    toast({ title: '✅ Invoice draft created', description: `${created.number} · ${formatMoney(created.total, created.currency)} for ${created.customerName}`, variant: 'success' });
  }

  function mark(id: string, status: Invoice['status']) {
    const patch: Partial<Invoice> = { status };
    if (status === 'paid') patch.paidDate = new Date().toISOString().slice(0, 10);
    if (status === 'sent' && !db.getAll().invoices.find(i => i.id === id)?.sentAt) {
      (patch as any).sentAt = new Date().toISOString();
    }
    db.updateInvoice(id, patch);
    setData(db.getAll());
    const statLabel: Record<Invoice['status'], string> = {
      draft: 'saved as draft',
      paid: 'marked paid',
      sent: 'sent to customer',
      overdue: 'flagged overdue',
    };
    toast({ title: `Invoice ${statLabel[status] ?? 'updated'}`, variant: 'success' });
  }

  function openNew() {
    setPresetShipmentId(undefined);
    setModalOpen(true);
  }

  if (!data) return <PageShell title="Invoices & Billing"><div className="p-6">Loading…</div></PageShell>;

  return (
    <PageShell
      title="Invoices & Billing"
      subtitle="Create invoices, track payments, and submit to OOBO/DGI for Madagascar e-invoicing."
    >
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
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{stats.draft}</div>
          <div className="text-xs text-slate-400 mt-1">Not yet sent</div>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mt-6">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition ${filter === f ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> New Invoice</Button>
      </div>

      <Card className="mt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="No invoices yet"
            description="Create your first invoice to bill a customer."
            action={<Button onClick={openNew}><Plus className="w-4 h-4" /> Create invoice</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
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
                  <tr key={i.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{i.number}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{i.customerName}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(i.issueDate)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatMoney(i.total, i.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('invoice', i.status)}`}>{titleCase(i.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {i.status === 'draft' && (
                          <button title="Send invoice" onClick={() => mark(i.id, 'sent')} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition"><Send className="w-4 h-4" /></button>
                        )}
                        {(i.status === 'sent' || i.status === 'overdue') && (
                          <button title="Mark paid" onClick={() => mark(i.id, 'paid')} className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition"><CheckCircle className="w-4 h-4" /></button>
                        )}
                        <button title="Download PDF" onClick={() => {
                          const full = data.invoices.find(x => x.id === i.id);
                          if (full) downloadBlob(generateInvoicePDF(full), `${full.number}.pdf`);
                        }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"><Download className="w-4 h-4" /></button>
                        {!i.einvoice?.ooboUid && (
                          <button title="Sign & submit OOBO/DGI fiscal e-invoice (RSA-SHA256)" onClick={async () => {
                            toast({ title: '🔐 Signing e-invoice…', description: `${i.number} RSA-SHA256`, variant: 'info' });
                            await db.submitOobo(i.id);
                            setData(db.getAll());
                            toast({ title: '✅ Fiscal e-invoice signed', description: `${i.number} · QR + RSA stamp attached`, variant: 'success' });
                          }} className="p-1.5 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 transition" aria-label="Sign OOBO">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8"/><path d="m16 6-4-4-4 4"/><rect width="20" height="8" x="2" y="14" rx="2"/></svg>
                          </button>
                        )}
                        {i.einvoice?.ooboUid && (
                          <span title={`OOBO UID: ${i.einvoice.ooboUid}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            ✓ OOBO
                          </span>
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

      <NewInvoiceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          // clear ?new=1 from URL on manual close
          if (params.get('new') === '1') router.replace('/invoices/');
        }}
        data={data}
        preselectedShipmentId={presetShipmentId}
        onSubmit={create}
      />
    </PageShell>
  );
}

// ------------------------------------------------------------------
// New Invoice Modal
// ------------------------------------------------------------------
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
  const defaultCustomerId = data.customers[0]?.id || '';
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [shipmentId, setShipmentId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('USD');
  const [items, setItems] = useState<{ description: string; amount: string }[]>([
    { description: 'Freight services', amount: '' },
  ]);

  // Reset + prefill when the modal is opened (the `open` key changes)
  useEffect(() => {
    if (!open) return;
    const sh = preselectedShipmentId ? data.shipments.find(s => s.id === preselectedShipmentId) : undefined;
    if (sh) {
      setCustomerId(sh.customerId || defaultCustomerId);
      setShipmentId(sh.id);
      setCurrency(sh.currency || 'USD');
      setItems([
        { description: `${sh.mode === 'air' ? 'Air' : 'Ocean'} Freight — ${sh.portOfLoading} → ${sh.portOfDischarge} (${sh.reference})`, amount: String(Math.round(sh.totalAmount * 0.7)) },
        { description: 'Customs clearance & documentation', amount: String(Math.round(sh.totalAmount * 0.15)) },
        { description: 'Inland transportation & delivery', amount: String(Math.round(sh.totalAmount * 0.15)) },
      ]);
    } else {
      setCustomerId(defaultCustomerId);
      setShipmentId('');
      setCurrency('USD');
      setItems([{ description: 'Freight services', amount: '' }]);
    }
  }, [open, preselectedShipmentId, data, defaultCustomerId]);

  const setItem = (i: number, patch: Partial<{ description: string; amount: string }>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems([...items, { description: '', amount: '0' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const parsed = items
    .map((it) => ({ description: it.description.trim(), amount: Number(it.amount) || 0 }))
    .filter((it) => it.description.length > 0);

  const subtotal = parsed.reduce((s, it) => s + it.amount, 0);
  const tax = 0; // VAT handled via OOBO when submitting
  const total = subtotal + tax;
  const canSubmit = !!customerId && parsed.length > 0 && total > 0;

  const submit = () => {
    const cust = data.customers.find((c) => c.id === customerId);
    if (!cust || !canSubmit) return;
    onSubmit({
      customerId,
      customerName: cust.name,
      customerEmail: cust.email,
      shipmentId: shipmentId || undefined,
      items: parsed,
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
    <Modal open={open} onClose={onClose} title="Create New Invoice" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Customer">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Linked Shipment (optional)">
            <Select value={shipmentId} onChange={(e) => {
              const id = e.target.value;
              setShipmentId(id);
              if (id) {
                const sh = data.shipments.find(s => s.id === id);
                if (sh) {
                  setCustomerId(sh.customerId);
                  setCurrency(sh.currency);
                }
              }
            }}>
              <option value="">— None —</option>
              {data.shipments.map((s) => (
                <option key={s.id} value={s.id}>{s.reference} — {s.customerName}</option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MGA">MGA</option>
              <option value="GBP">GBP</option>
            </Select>
          </Field>
          <Field label="Issue Date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due Date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">Line Items</div>
            <button type="button" className="text-xs text-brand font-medium hover:underline" onClick={addItem}>+ Add line</button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-8 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:border-brand outline-none"
                  placeholder="Description (e.g. Ocean freight TNR→Hamburg)"
                  value={it.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                />
                <input
                  className="col-span-3 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:border-brand outline-none"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={it.amount}
                  onChange={(e) => setItem(i, { amount: e.target.value })}
                />
                <button
                  type="button"
                  className="col-span-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg flex items-center justify-center transition"
                  onClick={() => removeItem(i)}
                  aria-label="Remove line"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Tax / VAT</span><span>{formatMoney(tax, currency)}</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-lg font-bold text-slate-900 dark:text-white">
            <span>Total</span>
            <span className="text-brand">{formatMoney(total, currency)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Saved as draft. You'll be able to send, download PDF, and submit to OOBO after.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {canSubmit ? `Save as draft (${formatMoney(total, currency)})` : 'Add line items'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
