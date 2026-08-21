'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { Card, Button, Input, Select, Field, Modal, EmptyState, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { Customer } from '@/lib/types';
import type { DB } from '@/lib/store';
import { Users, Plus, Mail, Phone, MapPin, Building2, Package, ArrowLeft, DollarSign, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils';
import { useQueryParams } from '@/lib/useQueryParams';
import CustomerCRM from '@/components/CustomerCRM';

export default function CustomersPage() {
  const [data, setData] = useState<DB | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const params = useQueryParams();

  useEffect(() => {
    setData(db.getAll());
    if (params.get('new') === '1') setModalOpen(true);
  }, [params]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.customers.filter((c) => {
      if (!q) return true;
      return (c.name + c.email + c.country + c.contactPerson).toLowerCase().includes(q.toLowerCase());
    });
  }, [data, q]);

  function create(c: Omit<Customer, 'id' | 'createdAt'>) {
    db.createCustomer(c);
    setData(db.getAll());
    setModalOpen(false);
  }

  if (!data) return <PageShell title="Customers"><div>Loading…</div></PageShell>;

  // Detail view
  const detailId = params.get('id');
  const selected = detailId ? data.customers.find((c) => c.id === detailId) || null : null;

  if (selected) {
    return (
      <PageShell title="Customer 360" subtitle="Full relationship view">
        <Button variant="ghost" onClick={() => router.push('/customers/')}>
          <ArrowLeft className="w-4 h-4" /> Back to customers
        </Button>
        <CustomerCRM customer={selected} />
      </PageShell>
    );
  }

  return (
    <PageShell title="Customers" subtitle={`${data.customers.length} customers in your directory`}>
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <Input
          placeholder="Search customers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Add Customer</Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile icon={<Users className="w-5 h-5" />} label="Total Customers" value={data.customers.length} color="blue" />
        <SummaryTile icon={<Package className="w-5 h-5" />} label="Active Shipments" value={data.shipments.filter(s => !['delivered','cancelled'].includes(s.status)).length} color="indigo" />
        <SummaryTile
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Paid"
          value={formatMoney(data.invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total,0))}
          color="emerald"
        />
        <SummaryTile
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Overdue Invoices"
          value={data.invoices.filter(i=>i.status==='overdue').length}
          color="rose"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="w-12 h-12" />} title="No customers found" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const shipments = data.shipments.filter((s) => s.customerId === c.id);
            const revenue = data.invoices
              .filter((i) => i.customerId === c.id && i.status === 'paid')
              .reduce((s, i) => s + i.total, 0);
            const openAr = data.invoices
              .filter((i) => i.customerId === c.id && (i.status === 'sent' || i.status === 'overdue'))
              .reduce((s, i) => s + i.total, 0);
            const creditPct = c.creditLimit && openAr > 0 ? Math.min(100, (openAr / c.creditLimit) * 100) : 0;
            return (
              <Card
                key={c.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => router.push(`/customers/?id=${c.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand to-brand-light text-white flex items-center justify-center font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-brand transition-colors">{c.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {c.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {c.tags?.includes('VIP') && <Badge color="amber"><Star className="w-3 h-3" />VIP</Badge>}
                    {creditPct > 80 && <Badge color="rose"><AlertTriangle className="w-3 h-3" />Watch</Badge>}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Building2 className="w-4 h-4 text-slate-400" /> {c.contactPerson}</div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Mail className="w-4 h-4 text-slate-400" /> <a href={`mailto:${c.email}`} className="text-brand hover:underline" onClick={(e)=>e.stopPropagation()}>{c.email}</a></div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><Phone className="w-4 h-4 text-slate-400" /> {c.phone}</div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300"><MapPin className="w-4 h-4 text-slate-400 mt-0.5" /> <span className="truncate">{c.address}</span></div>
                </div>
                {c.creditLimit ? (
                  <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Credit used</span>
                      <span>{formatMoney(openAr)} / {formatMoney(c.creditLimit)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${creditPct > 80 ? 'bg-rose-500' : creditPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${creditPct}%`}} />
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><Package className="w-4 h-4" /> {shipments.length} shipments</div>
                  <div className="text-emerald-600 font-semibold">{formatMoney(revenue)} paid</div>
                </div>
                <div className="text-[11px] text-slate-400 mt-2">Customer since {formatDate(c.createdAt)}</div>
                <div className="mt-2 text-right">
                  <span className="text-xs text-brand font-medium">Open 360° view →</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <NewCustomerModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={create} />
    </PageShell>
  );
}

function SummaryTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  const colors: Record<string,string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  };
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      </div>
    </Card>
  );
}

function NewCustomerModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (c: Omit<Customer, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('Madagascar');
  const [creditLimit, setCreditLimit] = useState('10000');
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [accountManager, setAccountManager] = useState('Lina Ratsimba');

  useEffect(() => {
    if (!open) {
      setName(''); setContactPerson(''); setEmail(''); setPhone(''); setAddress(''); setCountry('Madagascar');
    }
  }, [open]);

  const submit = () => {
    onSubmit({
      name, contactPerson, email, phone, address, country,
      creditLimit: Number(creditLimit) || 0,
      paymentTerms: Number(paymentTerms) || 30,
      accountManager,
      tags: [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New Customer" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Company Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Contact Person"><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
          <Field label="Account Manager">
            <Select value={accountManager} onChange={(e) => setAccountManager(e.target.value)}>
              <option>Lina Ratsimba</option>
              <option>Hery Rakoto</option>
              <option>Sitraka Andriamihaja</option>
              <option>Unassigned</option>
            </Select>
          </Field>
        </div>
        <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Credit Limit (USD)"><Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} /></Field>
          <Field label="Payment Terms (days)"><Input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !email}>Add Customer</Button>
        </div>
      </div>
    </Modal>
  );
}
