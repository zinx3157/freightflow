'use client';

import { useEffect, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Badge, Modal, Field, Input } from '@/components/ui';
import { db } from '@/lib/store';
import type { DocApproval } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import {
  FileCheck2, Clock, CheckCircle2, XCircle, AlertTriangle, Plus,
  Shield, FileSignature, Award, User, Calendar
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

const CATEGORIES = ['BL Release', 'Certificate', 'License', 'Commercial Invoice', 'Packing List', 'Customs Doc', 'Other'];

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DocApproval[]>([]);
  const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'|'expiring'>('pending');
  const [showNew, setShowNew] = useState(false);

  const refresh = () => setItems(db.allApprovals());
  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('ff:data-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('ff:data-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const today = new Date();
  const in30 = new Date(Date.now()+30*86400000);
  const in7 = new Date(Date.now()+7*86400000);

  const filtered = items.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'approved') return a.status === 'approved';
    if (filter === 'rejected') return a.status === 'rejected';
    if (filter === 'expiring') {
      if (!a.expiryDate) return false;
      const d = new Date(a.expiryDate);
      return d < in30;
    }
    return true;
  });

  const stats = {
    total: items.length,
    pending: items.filter(a => a.status === 'pending').length,
    approved: items.filter(a => a.status === 'approved').length,
    rejected: items.filter(a => a.status === 'rejected').length,
    expiring7d: items.filter(a => a.expiryDate && new Date(a.expiryDate) < in7).length,
  };

  const myName = user?.name || 'Current User';
  const iAmReviewer = (a: DocApproval) =>
    a.status === 'pending' && !!a.reviewers.find(r => r.name === myName && r.status === 'pending');

  const decide = (id: string, decision: 'approved'|'rejected', comment?: string) => {
    db.decideApproval(id, myName, decision, comment);
    refresh();
  };

  return (
    <PageShell title="Document Approvals" subtitle="Approval chains, license expiry alerts, sign-off workflow">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<FileCheck2 className="w-5 h-5"/>} label="Total" value={stats.total} color="slate" />
          <StatCard icon={<Clock className="w-5 h-5"/>} label="Pending" value={stats.pending} color={stats.pending>0?'amber':'slate'} />
          <StatCard icon={<CheckCircle2 className="w-5 h-5"/>} label="Approved" value={stats.approved} color="emerald" />
          <StatCard icon={<XCircle className="w-5 h-5"/>} label="Rejected" value={stats.rejected} color="rose" />
          <StatCard icon={<AlertTriangle className="w-5 h-5"/>} label="Expiring ≤7d" value={stats.expiring7d} color={stats.expiring7d>0?'rose':'slate'} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex-wrap">
            {(['pending','all','approved','rejected','expiring'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${filter === f ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {f === 'expiring' ? '⏰ Expiring' : f}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4"/> Request Approval</Button>
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="p-10 text-center text-slate-500">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No {filter === 'all' ? '' : filter} approvals
            </Card>
          )}
          {filtered.map(a => (
            <ApprovalRow key={a.id} approval={a} myName={myName} mine={iAmReviewer(a)} onDecide={decide} />
          ))}
        </div>
      </div>

      {showNew && <NewApprovalModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); refresh(); }} />}
    </PageShell>
  );
}

// Extracted as its own component so the comment-input useState follows Rules of Hooks
// (one useState per row, not useState inside a loop).
function ApprovalRow({
  approval: a, myName, mine, onDecide,
}: {
  approval: DocApproval;
  myName: string;
  mine: boolean;
  onDecide: (id: string, decision: 'approved'|'rejected', comment?: string) => void;
}) {
  const today = new Date();
  const in30 = new Date(Date.now()+30*86400000);
  const expiringSoon = !!a.expiryDate && new Date(a.expiryDate) < in30;
  const expired = !!a.expiryDate && new Date(a.expiryDate) < today;
  const [comment, setComment] = useState('');

  return (
    <Card className={`p-4 ${mine ? 'ring-2 ring-brand/40' : ''} ${expired ? 'border-rose-300 dark:border-rose-800' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
          a.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : a.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
          : expiringSoon ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {a.status === 'approved' ? <CheckCircle2 className="w-5 h-5"/>
           : a.status === 'rejected' ? <XCircle className="w-5 h-5"/>
           : <Clock className="w-5 h-5"/>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                {a.docName}
                <StatusBadge status={a.status} />
                {expired && <Badge color="rose">EXPIRED</Badge>}
                {expiringSoon && !expired && <Badge color="amber">Expires {formatDate(a.expiryDate!)}</Badge>}
                {mine && <Badge color="blue">Awaiting your review</Badge>}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3"/>{a.category}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3"/>Requested by {a.requestedBy}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{formatDateTime(a.requestedAt)}</span>
                {a.expiryDate && <span className="flex items-center gap-1"><Award className="w-3 h-3"/>Expires {formatDate(a.expiryDate)}</span>}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {a.reviewers.map((r,i) => (
              <div key={i} className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border ${
                r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' :
                r.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800' :
                'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                {r.status === 'approved' ? <CheckCircle2 className="w-3 h-3"/> : r.status === 'rejected' ? <XCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                <span className="font-medium">{r.name}</span>
                <span className="opacity-70">· {r.role}</span>
                {r.comment && <span className="opacity-80 italic">"{r.comment}"</span>}
              </div>
            ))}
          </div>

          {mine && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
              <Input placeholder="Optional comment..." value={comment} onChange={e => setComment(e.target.value)} className="flex-1 min-w-[200px]" />
              <Button onClick={() => { onDecide(a.id, 'approved', comment || undefined); setComment(''); }}><CheckCircle2 className="w-4 h-4"/> Approve</Button>
              <Button variant="danger" onClick={() => { onDecide(a.id, 'rejected', comment || undefined); setComment(''); }}><XCircle className="w-4 h-4"/> Reject</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return <Badge color="emerald">Approved</Badge>;
  if (status === 'rejected') return <Badge color="rose">Rejected</Badge>;
  return <Badge color="amber">Pending</Badge>;
}

function StatCard({icon,label,value,color}:{icon:React.ReactNode;label:string;value:number;color:string}) {
  const colors: Record<string,string> = {
    slate:'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    amber:'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    emerald:'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    rose:'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    blue:'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  };
  return (
    <Card className={`p-4 flex items-center gap-3 ${colors[color]||colors.slate}`}>
      <div className="w-10 h-10 rounded-lg bg-white/40 dark:bg-black/20 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </Card>
  );
}

function NewApprovalModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}) {
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reviewers, setReviewers] = useState('Lina Ratsimba, Andry R.');
  const [expiry, setExpiry] = useState('');
  const submit = () => {
    if (!docName) return;
    db.requestApproval({
      docName, category,
      requestedBy: 'Current User',
      requestedAt: new Date().toISOString(),
      reviewers: reviewers.split(',').map(s => ({ name: s.trim(), role: 'Reviewer', status: 'pending' as const })).filter(r => r.name),
      expiryDate: expiry || undefined,
    });
    onCreated();
  };
  return (
    <Modal open={true} onClose={onClose} title="Request Document Approval" size="md">
      <div className="space-y-3">
        <Field label="Document name"><Input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="e.g. Original B/L for FRT-2026-0009" /></Field>
        <Field label="Category">
          <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Reviewers (comma-separated names)"><Input value={reviewers} onChange={e=>setReviewers(e.target.value)} placeholder="Lina Ratsimba, Andry R."/></Field>
        <Field label="Expiry date (for permits/licenses)"><Input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!docName}><FileSignature className="w-4 h-4"/> Send Request</Button>
        </div>
      </div>
    </Modal>
  );
}
