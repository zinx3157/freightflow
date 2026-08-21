'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/store';
import type { JournalEntry } from '@/lib/types';
import { Card, Badge, Button, Input, Select, Field } from './ui';
import { BookOpen, Plus, TrendingDown, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils';

const TYPE_META: Record<JournalEntry['type'], { label: string; color: any; icon: React.ReactNode }> = {
  invoice_receivable: { label: 'AR Invoice', color: 'blue', icon: <FileText className="w-3 h-3" /> },
  invoice_paid: { label: 'Payment Received', color: 'emerald', icon: <DollarSign className="w-3 h-3" /> },
  freight_cost: { label: 'Freight COGS', color: 'amber', icon: <TrendingDown className="w-3 h-3" /> },
  customs_duty: { label: 'Customs/Duty', color: 'rose', icon: <FileText className="w-3 h-3" /> },
  trucking_cost: { label: 'Trucking COGS', color: 'amber', icon: <TrendingDown className="w-3 h-3" /> },
  quote_accepted: { label: 'Quote Accepted', color: 'indigo', icon: <TrendingUp className="w-3 h-3" /> },
  credit_note: { label: 'Credit Note', color: 'rose', icon: <TrendingDown className="w-3 h-3" /> },
  bank_deposit: { label: 'Bank Deposit', color: 'emerald', icon: <DollarSign className="w-3 h-3" /> },
  other: { label: 'Other', color: 'slate', icon: <FileText className="w-3 h-3" /> },
};

export default function Ledger({ compact = false }: { compact?: boolean }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'other' as JournalEntry['type'],
    reference: '',
    description: '',
    debitAccount: '1200 - Accounts Receivable',
    creditAccount: '4000 - Revenue (Sea Freight)',
    amount: 0,
    currency: 'USD',
  });

  const refresh = () => setEntries(db.allJournal().sort((a, b) => b.date.localeCompare(a.date)));
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, []);

  const stats = useMemo(() => {
    let revenue = 0, cogs = 0, ar = 0, cash = 0, duties = 0;
    entries.forEach((e) => {
      if (e.type === 'invoice_receivable') { revenue += e.amount; ar += e.amount; }
      if (e.type === 'bank_deposit') { cash += e.amount; ar -= e.amount; }
      if (e.type === 'freight_cost' || e.type === 'trucking_cost') cogs += e.amount;
      if (e.type === 'customs_duty') duties += e.amount;
    });
    const gp = revenue - cogs - duties;
    return { revenue, cogs, ar, cash, duties, gp, margin: revenue ? gp / revenue : 0 };
  }, [entries]);

  const filtered = entries.filter((e) => filter === 'all' || e.type === filter);

  const save = () => {
    db.addJournalEntry({
      date: draft.date, type: draft.type, reference: draft.reference, description: draft.description,
      debitAccount: draft.debitAccount, creditAccount: draft.creditAccount,
      amount: Number(draft.amount), currency: draft.currency, createdBy: 'Current User',
    });
    setAdding(false);
    setDraft({ ...draft, reference: '', description: '', amount: 0 });
    refresh();
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{compact ? 'General Ledger (YTD)' : 'General Ledger & Journal'}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Double-entry bookkeeping: AR, AP, revenue, COGS, duties</p>
          </div>
        </div>
        {!compact && <Button size="sm" onClick={() => setAdding((v) => !v)}><Plus className="w-4 h-4" />{adding ? 'Cancel' : 'Journal entry'}</Button>}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'} mb-4`}>
        <Tile label="Revenue" value={formatMoney(stats.revenue)} color="blue" />
        <Tile label="COGS + Duties" value={formatMoney(stats.cogs + stats.duties)} color="amber" />
        <Tile label="Gross Profit" value={formatMoney(stats.gp)} sub={`${(stats.margin * 100).toFixed(1)}% margin`} color="emerald" />
        <Tile label="A/R Outstanding" value={formatMoney(stats.ar)} color="rose" />
      </div>

      {adding && !compact && (
        <div className="mb-4 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}>
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Reference"><Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="INV-2026-0104" /></Field>
          <div className="md:col-span-2"><Field label="Description"><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description..." /></Field></div>
          <Field label="Amount (USD)"><Input type="number" value={draft.amount || ''} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field>
          <Field label="Debit account"><Input value={draft.debitAccount} onChange={(e) => setDraft({ ...draft, debitAccount: e.target.value })} /></Field>
          <Field label="Credit account"><Input value={draft.creditAccount} onChange={(e) => setDraft({ ...draft, creditAccount: e.target.value })} /></Field>
          <div className="md:col-span-3 flex justify-end"><Button onClick={save} disabled={!draft.amount}>Post entry</Button></div>
        </div>
      )}

      {!compact && (
        <>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-3 flex-wrap">
            {['all', ...Object.keys(TYPE_META)].map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-2.5 py-1 rounded text-xs font-medium capitalize ${filter === k ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {k === 'all' ? 'All' : TYPE_META[k as JournalEntry['type']].label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-2 py-2 text-left font-semibold">Date</th>
                  <th className="px-2 py-2 text-left font-semibold">Type</th>
                  <th className="px-2 py-2 text-left font-semibold">Reference</th>
                  <th className="px-2 py-2 text-left font-semibold">Description</th>
                  <th className="px-2 py-2 text-right font-semibold">Debit</th>
                  <th className="px-2 py-2 text-right font-semibold">Credit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const meta = TYPE_META[e.type];
                  const isRevenue = e.type === 'invoice_receivable' || e.type === 'bank_deposit' || e.type === 'quote_accepted';
                  return (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-400 text-xs">{formatDate(e.date)}</td>
                      <td className="px-2 py-2"><Badge color={meta.color}>{meta.icon}{meta.label}</Badge></td>
                      <td className="px-2 py-2 font-mono text-xs">{e.reference}</td>
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-300 text-xs">{e.description}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-800 dark:text-slate-200">{isRevenue ? '' : formatMoney(e.amount, e.currency)}</td>
                      <td className="px-2 py-2 text-right font-mono text-emerald-600">{isRevenue ? formatMoney(e.amount, e.currency) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function Tile({ label, value, sub, color }: { label: string; value: React.ReactNode; sub?: string; color: 'blue' | 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    blue: 'from-blue-500 to-brand',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
  };
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className={`inline-block w-1.5 h-6 bg-gradient-to-b ${colors[color]} rounded-full mr-2 align-middle`} />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 align-middle">{label}</span>
      <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}
