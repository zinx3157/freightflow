'use client';

import React, { useEffect, useState } from 'react';
import type { EmailLog, Invoice, Quote, Shipment, InboundEmail } from '@/lib/types';
import { db } from '@/lib/store';
import { Button, Card, Badge, Modal, Select, Field, Label, Input, Textarea } from './ui';
import { Mail, Send, Eye, MousePointerClick, Clock, X, FileText, CheckCircle2, AlertCircle, Plus, Inbox, Archive, Trash2, Reply, Star, Paperclip, ArrowRight, Building2, Anchor, Shield, User, Truck } from 'lucide-react';
import { formatDateTime, formatDate, titleCase } from '@/lib/utils';

const TEMPLATES = [
  { id: 'invoice', label: 'Invoice', subject: (r: string) => `Invoice ${r} — Payment requested`, body: (r: string, cust: string, amount?: number) => `Dear ${cust},\n\nPlease find attached invoice ${r} for your recent shipment.\n${amount ? `Total due: USD ${amount.toLocaleString()}\n` : ''}Payment is due per our standard terms.\n\nYou can track your shipment live from our portal at any time.\n\nKind regards,\nFreightFlow Accounts Receivable` },
  { id: 'quote', label: 'Quotation', subject: (r: string) => `Freight Quotation ${r}`, body: (r: string, cust: string, amount?: number) => `Dear ${cust},\n\nThank you for your inquiry. Please find attached our quotation ${r}.\n${amount ? `All-in price: USD ${amount.toLocaleString()}\n` : ''}Valid for 14 days. Reply ACCEPT to proceed, or let us know if you need adjustments.\n\nBest regards,\nFreightFlow Sales Team` },
  { id: 'booking_conf', label: 'Booking Confirmation', subject: (r: string) => `Booking confirmed — ${r}`, body: (r: string, cust: string) => `Dear ${cust},\n\nWe are pleased to confirm your booking for shipment ${r}.\nYour cargo has been allotted with the carrier; we will transmit the B/L / AWB shortly.\n\nYou can track this shipment 24/7 via your customer portal.\n\nFreightFlow Operations` },
  { id: 'tracking_update', label: 'Tracking Update', subject: (r: string) => `Tracking update — ${r}`, body: (r: string, cust: string) => `Dear ${cust},\n\nThis is a quick update on your shipment ${r}.\nYour cargo has reached a new milestone. Open your portal for live position & ETA.\n\nFreightFlow` },
  { id: 'customs_update', label: 'Customs Status Update', subject: (r: string) => `Customs update for ${r}`, body: (r: string, cust: string) => `Dear ${cust},\n\nA customs update is available for shipment ${r}. Please check your portal for details.\n\nFreightFlow Customs Brokerage` },
  { id: 'pod', label: 'Proof of Delivery', subject: (r: string) => `Delivered — ${r}`, body: (r: string, cust: string) => `Dear ${cust},\n\nYour shipment ${r} has been delivered and signed for. Thank you for shipping with FreightFlow.\nPOD is attached for your records.\n\nBest regards,\nFreightFlow Customer Care` },
  { id: 'custom', label: 'Custom message', subject: () => 'Message from FreightFlow', body: () => 'Hello,\n\n' },
] as const;

function statusIcon(s: EmailLog['status']) {
  switch (s) {
    case 'queued': return <Clock className="w-4 h-4 text-slate-500" />;
    case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
    case 'delivered': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    case 'opened': return <Eye className="w-4 h-4 text-emerald-500" />;
    case 'clicked': return <MousePointerClick className="w-4 h-4 text-violet-500" />;
    case 'bounced': return <AlertCircle className="w-4 h-4 text-rose-500" />;
  }
}
function statusColor(s: EmailLog['status']): any {
  switch (s) {
    case 'queued': return 'slate';
    case 'sent': case 'delivered': return 'blue';
    case 'opened': return 'emerald';
    case 'clicked': return 'violet';
    case 'bounced': return 'rose';
  }
}

export default function EmailCenter({ scope, scopeRef }: { scope?: 'shipment' | 'invoice' | 'quote' | 'all'; scopeRef?: Shipment | Invoice | Quote }) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [inbound, setInbound] = useState<InboundEmail[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState<'inbox'|'carrier'|'customs'|'customer'|'archived'>('inbox');
  const [selectedInbound, setSelectedInbound] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>('custom');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const reload = () => {
    const d = db.getAll();
    setEmails(d.emails);
    setInbound(d.inboundEmails || []);
  };
  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('ff:data-changed', onChange);
    return () => window.removeEventListener('ff:data-changed', onChange);
  }, []);

  const openCompose = (preset?: string) => {
    const t = TEMPLATES.find((x) => x.id === (preset || 'custom')) || TEMPLATES[TEMPLATES.length - 1];
    setTemplateId(t.id);
    let ref = '';
    let cust = 'Valued Customer';
    let amt: number | undefined;
    let email = '';
    if (scopeRef) {
      if ('customerName' in scopeRef) cust = scopeRef.customerName;
      if ('customerEmail' in scopeRef && scopeRef.customerEmail) email = scopeRef.customerEmail;
      if ('reference' in scopeRef) ref = scopeRef.reference;
      if ('number' in scopeRef) ref = scopeRef.number;
      if ('total' in scopeRef) amt = scopeRef.total;
    }
    setTo(email);
    setSubject(t.subject(ref));
    setBody(t.body(ref, cust, amt));
    setComposeOpen(true);
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    let ref = '';
    let cust = 'Valued Customer';
    let amt: number | undefined;
    if (scopeRef) {
      if ('customerName' in scopeRef) cust = scopeRef.customerName;
      if ('reference' in scopeRef) ref = scopeRef.reference;
      if ('number' in scopeRef) ref = scopeRef.number;
      if ('total' in scopeRef) amt = scopeRef.total;
    }
    setSubject(t.subject(ref));
    setBody(t.body(ref, cust, amt));
  };

  const sendEmail = () => {
    if (!to || !subject) return;
    let relatedType: EmailLog['relatedType'] | undefined;
    let relatedId: string | undefined;
    let relatedRef: string | undefined;
    if (scopeRef) {
      if ('reference' in scopeRef && scope === 'shipment') { relatedType = 'shipment'; relatedId = scopeRef.id; relatedRef = scopeRef.reference; }
      if ('number' in scopeRef) {
        if (scope === 'invoice') { relatedType = 'invoice'; relatedId = (scopeRef as Invoice).id; relatedRef = (scopeRef as Invoice).number; }
        if (scope === 'quote') { relatedType = 'quote'; relatedId = (scopeRef as Quote).id; relatedRef = (scopeRef as Quote).number; }
      }
    }
    db.logEmail({
      to, subject, body,
      template: (templateId as EmailLog['template']) || 'custom',
      relatedType, relatedId, relatedRef,
    });
    // Simulate open / click for demo — random for realism after a delay
    setTimeout(() => {
      const sent = db.getAll().emails[0];
      if (sent && Math.random() > 0.2) {
        db.markEmailOpened(sent.id);
        if (Math.random() > 0.5) {
          setTimeout(() => db.markEmailClicked(sent.id), 1500);
        }
      }
      reload();
    }, 2000 + Math.random() * 3000);
    setComposeOpen(false);
    reload();
  };

  const filtered = scopeRef && scope === 'shipment'
    ? emails.filter((e) => e.relatedId === (scopeRef as Shipment).id)
    : scopeRef && scope === 'invoice'
    ? emails.filter((e) => e.relatedRef === (scopeRef as Invoice).number)
    : scopeRef && scope === 'quote'
    ? emails.filter((e) => e.relatedRef === (scopeRef as Quote).number)
    : emails;

  const openedCount = filtered.filter((e) => e.status === 'opened' || e.status === 'clicked').length;
  const clickCount = filtered.filter((e) => e.status === 'clicked').length;
  const openRate = filtered.length ? Math.round((openedCount / filtered.length) * 100) : 0;
  const clickRate = openedCount ? Math.round((clickCount / openedCount) * 100) : 0;

  return (
    <Card className="p-5" id="email-center">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Email Automation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quotes, invoices, POD, tracking — all tracked & automated</p>
          </div>
        </div>
        <Button size="sm" onClick={() => openCompose()}><Plus className="w-4 h-4" /> Compose</Button>
      </div>

      {/* ========== TWO-WAY INBOX (only on main emails page) ========== */}
      {scope === 'all' && <InboxPanel inbound={inbound} onRefresh={reload} onCompose={openCompose} />}

      {/* ========== SENT OUTBOUND EMAILS ========== */}
      <div className={scope === 'all' ? 'mt-6 pt-6 border-t border-slate-200 dark:border-slate-700' : ''}>
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <Send className="w-3.5 h-3.5" /> Sent / Tracked messages
        </h5>
        {filtered.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <MiniStat label="Sent" value={filtered.length} />
            <MiniStat label="Open rate" value={`${openRate}%`} />
            <MiniStat label="Click rate" value={`${clickRate}%`} />
            <MiniStat label="Bounces" value={filtered.filter((e) => e.status === 'bounced').length} />
          </div>
        )}

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              No outbound emails sent yet.
            </div>
          ) : filtered.map((e) => (
            <div key={e.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{statusIcon(e.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{e.subject}</span>
                  <Badge color={statusColor(e.status)}>{e.status}</Badge>
                  {e.relatedRef && <Badge color="slate">{e.template} · {e.relatedRef}</Badge>}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">To {e.to} · {formatDateTime(e.sentAt)}</div>
                {e.openedAt && <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Opened {formatDateTime(e.openedAt)}</div>}
                {e.clickedAt && <div className="text-[11px] text-violet-600 dark:text-violet-400">Link clicked {formatDateTime(e.clickedAt)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions for contextual scope */}
      {scopeRef && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Quick sends</div>
          <div className="flex flex-wrap gap-2">
            {scope === 'invoice' && <Button size="sm" variant="outline" onClick={() => openCompose('invoice')}><FileText className="w-4 h-4" /> Send invoice</Button>}
            {scope === 'quote' && <Button size="sm" variant="outline" onClick={() => openCompose('quote')}><FileText className="w-4 h-4" /> Send quote</Button>}
            {scope === 'shipment' && <>
              <Button size="sm" variant="outline" onClick={() => openCompose('booking_conf')}>Booking confirmation</Button>
              <Button size="sm" variant="outline" onClick={() => openCompose('tracking_update')}>Tracking update</Button>
              <Button size="sm" variant="outline" onClick={() => openCompose('customs_update')}>Customs update</Button>
              <Button size="sm" variant="outline" onClick={() => openCompose('pod')}>Proof of delivery</Button>
            </>}
          </div>
        </div>
      )}

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="Compose email" size="lg">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <Field label="Template">
            <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <div className="col-span-3">
            <Field label="To">
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="customer@example.com" />
            </Field>
          </div>
        </div>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <div className="mt-3">
          <Label>Body</Label>
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setComposeOpen(false)}><X className="w-4 h-4" /> Cancel</Button>
          <Button onClick={sendEmail} disabled={!to || !subject}><Send className="w-4 h-4" /> Send & track</Button>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">In production this integrates with Postmark/SES/SendGrid with webhook-based open/click tracking. Demo simulates opens/clicks after 2-5 seconds.</p>
      </Modal>
    </Card>
  );
}

function folderIcon(f: InboundEmail['folder']) {
  switch (f) {
    case 'carrier': return <Anchor className="w-4 h-4" />;
    case 'customs': return <Shield className="w-4 h-4" />;
    case 'customer': return <User className="w-4 h-4" />;
    case 'archived': return <Archive className="w-4 h-4" />;
    default: return <Inbox className="w-4 h-4" />;
  }
}
function classificationBadge(c?: InboundEmail['classification']) {
  if (!c || c === 'other') return null;
  const map: Record<string, { color: any; label: string }> = {
    booking_conf: { color: 'blue', label: 'Booking' },
    tracking: { color: 'sky', label: 'Tracking' },
    customs: { color: 'amber', label: 'Customs' },
    inquiry: { color: 'violet', label: 'Inquiry' },
    complaint: { color: 'rose', label: 'Complaint' },
    pod: { color: 'emerald', label: 'POD' },
  };
  const m = map[c]; if (!m) return null;
  return <Badge color={m.color}>{m.label}</Badge>;
}

function InboxPanel({ inbound, onRefresh, onCompose }: { inbound: InboundEmail[]; onRefresh: () => void; onCompose: (preset?: string) => void }) {
  const [tab, setTab] = useState<'all'|'inbox'|'carrier'|'customs'|'customer'|'archived'|'unread'>('inbox');
  const [sel, setSel] = useState<string | null>(null);

  const unreadCount = inbound.filter(e => !e.read && e.folder !== 'archived').length;
  const filtered = inbound.filter(e => {
    if (tab === 'all') return e.folder !== 'archived' && e.folder !== 'spam';
    if (tab === 'unread') return !e.read && e.folder !== 'archived';
    if (tab === 'inbox') return e.folder === 'inbox';
    return e.folder === tab;
  });

  const selected = sel ? inbound.find(e => e.id === sel) : (filtered[0] || null);

  // Auto-select first unread on first render
  useEffect(() => {
    if (!sel && filtered.length > 0) setSel(filtered[0].id);
  }, [tab, inbound.length]);

  // Auto-mark read when opened
  useEffect(() => {
    if (selected && !selected.read) {
      db.markInboundRead(selected.id);
      setTimeout(onRefresh, 50);
    }
  }, [selected?.id]);

  const TABS: { key: any; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, count: unreadCount },
    { key: 'unread', label: 'Unread', icon: <Mail className="w-4 h-4" />, count: inbound.filter(e => !e.read).length },
    { key: 'carrier', label: 'Carriers', icon: <Anchor className="w-4 h-4" /> },
    { key: 'customs', label: 'Customs', icon: <Shield className="w-4 h-4" /> },
    { key: 'customer', label: 'Customers', icon: <User className="w-4 h-4" /> },
    { key: 'archived', label: 'Archived', icon: <Archive className="w-4 h-4" /> },
  ];

  return (
    <div>
      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
        <Inbox className="w-3.5 h-3.5" /> Two-Way Inbox
        <span className="ml-auto normal-case tracking-normal font-normal text-slate-400 text-[11px]">
          Carriers · Customs · Customers — auto-classified
        </span>
      </h5>

      <div className="grid grid-cols-12 gap-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/50">
        {/* Folder tabs sidebar */}
        <div className="col-span-3 lg:col-span-2 border-r border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800/40 space-y-0.5">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setSel(null); }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-white dark:bg-slate-900 text-brand shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800'
                }`}>
                {t.icon}
                <span className="flex-1 text-left">{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-brand text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Message list */}
        <div className="col-span-4 lg:col-span-4 border-r border-slate-200 dark:border-slate-700 max-h-[420px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No messages in this folder</div>
          ) : filtered.map(e => {
            const active = sel === e.id || (!sel && filtered[0]?.id === e.id);
            return (
              <button key={e.id} onClick={() => setSel(e.id)}
                className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${
                  active ? 'bg-brand/5 dark:bg-brand/10' : !e.read ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                }`}>
                <div className="flex items-center gap-2 mb-0.5">
                  {!e.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                  <span className={`text-sm truncate flex-1 ${!e.read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                    {e.fromName || e.from}
                  </span>
                  {classificationBadge(e.classification)}
                </div>
                <div className={`text-sm truncate ${!e.read ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                  {e.subject}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">{formatDate(e.receivedAt)}</span>
                  {e.attachments && e.attachments.length > 0 && <Paperclip className="w-3 h-3 text-slate-400" />}
                  {e.relatedRef && <span className="text-[10px] font-mono text-slate-400 ml-auto">{e.relatedRef}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reading pane */}
        <div className="col-span-5 lg:col-span-6 p-4 max-h-[420px] overflow-y-auto">
          {selected ? (
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white">{selected.subject}</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-semibold">{selected.fromName || selected.from}</span>
                    <span className="text-slate-400">&lt;{selected.from}&gt;</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(selected.receivedAt)} · To {selected.to}</div>
                </div>
                <div className="flex gap-1">
                  {selected.relatedId && selected.relatedType === 'shipment' && (
                    <button
                      onClick={() => window.open(`/shipments/?id=${selected.relatedId}`, '_blank')}
                      className="text-[11px] px-2 py-1 rounded bg-brand/10 text-brand hover:bg-brand/20 font-semibold flex items-center gap-1">
                      Open shipment <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => { db.classifyInbound(selected.id, 'archived'); onRefresh(); setSel(null); }}
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="mb-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-wrap gap-2">
                  {selected.attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{a.name}</span>
                      <span className="text-slate-400">({Math.round(a.size/1024)}KB)</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selected.bodyHtml ? <span dangerouslySetInnerHTML={{ __html: selected.bodyHtml.replace(/<[^>]+>/g, '') }} /> : selected.bodyPreview}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { onCompose('custom'); /* could pre-fill */ }}>
                  <Reply className="w-3.5 h-3.5" /> Reply
                </Button>
                {!selected.read && (
                  <Button size="sm" variant="ghost" onClick={() => { db.markInboundRead(selected.id); onRefresh(); }}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-400 py-16">
              Select a message to read
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
