'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { db, customerPortalToken, customerPortalUrl, verifyCustomerToken } from '@/lib/store';
import type { Customer, Shipment, Quote, Invoice, DocFile, DocApproval, PortalMessage } from '@/lib/types';
import { formatDate, formatDateTime, formatMoney, titleCase, daysFromNow } from '@/lib/utils';
import {
  Package, Plane, Ship, MapPin, Calendar, Truck, FileText, Download,
  ShieldCheck, Send, UploadCloud, FileUp, MessageSquare, Receipt,
  FileCheck2, Paperclip, Check, X, Leaf, Globe, ExternalLink,
  LayoutDashboard, ClipboardList, FileSignature, Wallet, FolderOpen,
  CheckCircle2, XCircle, Clock, AlertCircle, Plus, Copy, ArrowRight,
  Phone, Mail, Building2, ChevronRight, TrendingUp, TrendingDown,
  CreditCard, Eye, ThumbsUp, ThumbsDown, Menu, ArrowLeft, Info, Sparkles,
} from 'lucide-react';
import { generateShipmentBL, downloadBlob } from '@/lib/documents';
import { useQueryParams } from '@/lib/useQueryParams';
import { useI18n } from '@/components/I18nProvider';
import PortAutocomplete from '@/components/PortAutocomplete';

const STAGES = ['quoted', 'booked', 'picked_up', 'in_transit', 'customs', 'delivered'] as const;

// ---------------------------------------------------------------------------
// Customer Portal v2 — single external hub for shippers/consignees
// URL patterns:
//   /portal                                       — landing + demo picker
//   /portal?c=<customerId>&t=<token>              — full customer hub (new!)
//   /portal?t=<shipmentToken>                     — legacy per-shipment tracking
// ---------------------------------------------------------------------------

export default function PortalPage() {
  const params = useQueryParams();
  const customerId = params.get('c');
  const token = params.get('t');
  const shipmentToken = params.get('t'); // re-used for legacy when no ?c=

  // Resolve which view to show
  const [view, setView] = useState<'landing'|'legacy'|'hub'|'invalid'|'shipment_detail'>('landing');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  // Detect mode
  useEffect(() => {
    const cParam = params.get('c');
    const tParam = params.get('t');
    // reset localStorage for demo if ?reset=1
    if (params.get('reset') === '1') {
      try { localStorage.removeItem('freight_saas_db_v9'); location.search = ''; return; } catch {}
    }
    if (cParam) {
      // Customer hub mode
      if (tParam && verifyCustomerToken(cParam, tParam)) {
        const cust = db.getAll().customers.find(c => c.id === cParam) || null;
        if (cust) { setCustomer(cust); setView('hub'); return; }
      }
      setView('invalid');
      return;
    }
    if (tParam) {
      // Legacy per-shipment token?
      const all = db.getAll();
      const found =
        all.shipments.find((s) => legacyShipmentToken(s.id) === tParam) ||
        all.shipments.find((s) => s.id === tParam || s.reference === tParam) ||
        null;
      if (found) { setSelectedShipmentId(found.id); setView('legacy'); return; }
      // Or maybe it's a valid customer token without c= — try first matching customer
      const matchedCust = all.customers.find(c => customerPortalToken(c.id) === tParam);
      if (matchedCust) { setCustomer(matchedCust); setView('hub'); return; }
      setView('invalid');
      return;
    }
    setView('landing');
  }, [customerId, token, shipmentToken]);

  // Sub-routing within hub: ?tab=quotes|invoices|docs|approvals|messages|request
  const tab = params.get('tab') || 'dashboard';

  if (view === 'landing') return <PortalLanding />;
  if (view === 'invalid') return <PortalInvalid />;
  if (view === 'legacy' && selectedShipmentId) return <LegacyShipmentPortal shipmentId={selectedShipmentId} />;
  if (view === 'hub' && customer) return <CustomerHub customer={customer} tab={tab} />;
  return <PortalLoading />;
}

// ---------------------------------------------------------------------------
// LANDING
// ---------------------------------------------------------------------------
function PortalLanding() {
  const { lang, setLang } = useI18n();
  const all = db.getAll();
  const demoCustomers = all.customers.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand via-blue-700 to-indigo-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">FreightFlow</div>
              <div className="text-xs text-white/70">Customer Portal 🇲🇬</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-lg p-1">
            {(['en','fr','mg'] as const).map(code => (
              <button key={code} onClick={() => setLang(code)}
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${lang===code ? 'bg-white text-brand' : 'text-white/80 hover:text-white'}`}>
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" /> All your freight in one place
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">
            Your logistics, <span className="text-cyan-300">simplified.</span>
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto text-base md:text-lg">
            Track shipments, view quotes, pay invoices, approve documents, and message
            your freight team — no more email back-and-forth.
          </p>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: <Package className="w-5 h-5"/>, label: 'Live Tracking' },
            { icon: <FileText className="w-5 h-5"/>, label: 'Quotes & Docs' },
            { icon: <Receipt className="w-5 h-5"/>, label: 'Invoices & SOA' },
            { icon: <FileSignature className="w-5 h-5"/>, label: 'Approve Docs' },
          ].map(f => (
            <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center text-center gap-2 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">{f.icon}</div>
              <div className="text-sm font-semibold">{f.label}</div>
            </div>
          ))}
        </div>

        {/* Demo: pick a customer to view as */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 md:p-6 border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-cyan-300" />
            <div className="text-sm text-white/80">
              <span className="font-semibold text-white">Demo preview:</span> click a customer below to see what they see.
              In production, customers receive a unique magic link from their account manager.
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {demoCustomers.map(c => {
              const url = customerPortalUrl(c.id);
              const invs = all.invoices.filter(i => i.customerId === c.id);
              const ships = all.shipments.filter(s => s.customerId === c.id);
              const openBal = invs.filter(i => i.status !== 'paid' && i.status !== 'draft').reduce((s,i)=>s+i.total,0);
              return (
                <a key={c.id} href={`/portal/?c=${encodeURIComponent(c.id)}&t=${customerPortalToken(c.id)}`}
                  className="group block bg-white/10 hover:bg-white/20 rounded-xl p-3.5 border border-white/10 hover:border-white/30 transition text-left">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{c.name}</div>
                      <div className="text-xs text-white/70 truncate">{c.contactPerson} · {c.country}</div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.contactPerson.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <span>📦 {ships.length} shipments</span>
                    {openBal > 0 && <span className="text-amber-300">💰 {formatMoney(openBal)}</span>}
                  </div>
                  <div className="flex items-center justify-end mt-2 text-xs text-cyan-300 group-hover:translate-x-1 transition">
                    Open portal <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </a>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 grid sm:grid-cols-3 gap-2 text-center text-xs">
            <Link href="/tracking" className="py-2 rounded-lg bg-white/10 hover:bg-white/20 transition">📍 Track by reference</Link>
            <Link href="/get-quote" className="py-2 rounded-lg bg-white/10 hover:bg-white/20 transition">📨 Request a quote</Link>
            <a href="mailto:sales@freightflow.mg" className="py-2 rounded-lg bg-white/10 hover:bg-white/20 transition">✉️ Contact sales</a>
          </div>
        </div>

        <div className="text-center mt-8 text-xs text-white/50">
          © {new Date().getFullYear()} FreightFlow Logistics SARL · Ivandry, Antananarivo · +261 20 22 000 00
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INVALID TOKEN
// ---------------------------------------------------------------------------
function PortalInvalid() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0b1220] dark:to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md text-center border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid or expired link</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          This portal link is not valid. It may have expired, or your access may have been revoked.
          Please contact your account manager for a new link.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/portal" className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark">Go to Portal home</Link>
          <Link href="/tracking" className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Track by reference</Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LOADING
// ---------------------------------------------------------------------------
function PortalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220] flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-2 animate-pulse">Loading your portal…</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMER HUB (main new view)
// ---------------------------------------------------------------------------
type HubTab = 'dashboard'|'shipments'|'quotes'|'invoices'|'documents'|'approvals'|'messages'|'request';

function CustomerHub({ customer, tab }: { customer: Customer; tab: HubTab | string }) {
  const params = useQueryParams();
  const [refreshKey, setRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang, setLang } = useI18n();

  // Subscribe to data changes
  useEffect(() => {
    const ref = () => setRefresh(k => k + 1);
    window.addEventListener('ff:data-changed', ref);
    return () => window.removeEventListener('ff:data-changed', ref);
  }, []);

  // Load customer-scoped data
  const data = useMemo(() => {
    void refreshKey;
    const all = db.getAll();
    const shipments = db.customerShipments(customer.id);
    const quotes = db.customerQuotes(customer.id);
    const invoices = db.customerInvoices(customer.id);
    const docs = db.customerDocs(customer.id);
    const approvals = db.customerApprovals(customer.id);
    const messages = db.customerMessages(customer.id);
    const balance = db.customerTotalBalance(customer.id);
    const overdue = db.customerOverdue(customer.id);
    const activeShipments = shipments.filter(s => !['delivered','cancelled'].includes(s.status));
    const pendingApprovals = approvals.filter(a => a.status === 'pending' && a.reviewers.some(r => r.role==='Customer' && r.status==='pending'));
    const unreadMessages = messages.filter(m => m.from === 'forwarder' && !m.read).length;
    return { shipments, quotes, invoices, docs, approvals, messages, balance, overdue, activeShipments, pendingApprovals, unreadMessages };
  }, [customer.id, refreshKey]);

  // Copy portal link
  const copyLink = () => {
    const url = customerPortalUrl(customer.id);
    navigator.clipboard?.writeText(url);
    const el = document.createElement('div');
    el.textContent = 'Portal link copied ✓';
    el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  };

  const activeTab = (['dashboard','shipments','quotes','invoices','documents','approvals','messages','request'].includes(tab) ? tab : 'dashboard') as HubTab;
  const setTab = (t: HubTab) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.pushState({}, '', url.toString());
    setRefresh(k => k + 1);
  };

  const tabs: { id: HubTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'shipments', label: 'My Shipments', icon: <Package className="w-4 h-4" />, badge: data.activeShipments.length || undefined },
    { id: 'quotes', label: 'Quotes', icon: <ClipboardList className="w-4 h-4" />, badge: data.quotes.filter(q => q.status === 'sent' || q.status === 'pending').length || undefined },
    { id: 'invoices', label: 'Invoices & SOA', icon: <Wallet className="w-4 h-4" />, badge: data.overdue > 0 ? 1 : undefined },
    { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'approvals', label: 'Approvals', icon: <FileSignature className="w-4 h-4" />, badge: data.pendingApprovals.length || undefined },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, badge: data.unreadMessages || undefined },
    { id: 'request', label: 'Request Quote', icon: <Plus className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220]">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setSidebarOpen(true)} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/10">
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Ship className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-base md:text-lg leading-tight truncate">FreightFlow Portal</div>
                <div className="text-[11px] text-white/70 truncate">{customer.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button onClick={copyLink} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold">
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                {(['en','fr','mg'] as const).map(code => (
                  <button key={code} onClick={() => setLang(code)}
                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${lang===code ? 'bg-white text-brand' : 'text-white/80'}`}>
                    {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Tabs (mobile scroll, desktop inline) */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-2 overflow-x-auto scrollbar-hide">
            <nav className="flex gap-0.5 min-w-max">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                    activeTab === t.id ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'
                  }`}>
                  {t.icon} {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={()=>setSidebarOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl p-4 overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center">
                  <Ship className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm">FreightFlow</div>
                  <div className="text-[10px] text-slate-500">Customer Portal</div>
                </div>
              </div>
              <button onClick={()=>setSidebarOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CustomerCard customer={customer} compact />
            <nav className="mt-4 space-y-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeTab === t.id ? 'bg-brand text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                  {t.icon} {t.label}
                  {t.badge != null && t.badge > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 rounded-full">{t.badge}</span>}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-5 md:py-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && <HubDashboard customer={customer} data={data} onTab={setTab} />}
        {activeTab === 'shipments' && <HubShipments customer={customer} shipments={data.shipments} />}
        {activeTab === 'quotes' && <HubQuotes customer={customer} quotes={data.quotes} onChange={()=>setRefresh(k=>k+1)} />}
        {activeTab === 'invoices' && <HubInvoices customer={customer} invoices={data.invoices} />}
        {activeTab === 'documents' && <HubDocuments docs={data.docs} />}
        {activeTab === 'approvals' && <HubApprovals approvals={data.pendingApprovals.concat(data.approvals.filter(a=>a.status!=='pending'))} onChange={()=>setRefresh(k=>k+1)} />}
        {activeTab === 'messages' && <HubMessages customer={customer} onChange={()=>setRefresh(k=>k+1)} />}
        {activeTab === 'request' && <HubRequestQuote customer={customer} onDone={()=>setTab('quotes')} />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 pb-6 text-center text-xs text-slate-400">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          Need help? <a href={`mailto:${customer.accountManager?.toLowerCase().includes('andry') ? 'andry' : 'hery'}@freightflow.mg`} className="text-brand hover:underline">
            Contact your account manager
          </a> · <Link href="/portal" className="hover:underline">Portal home</Link>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CUSTOMER INFO SIDEBAR CARD
// ---------------------------------------------------------------------------
function CustomerCard({ customer, compact }: { customer: Customer; compact?: boolean }) {
  const all = db.getAll();
  const invs = all.invoices.filter(i => i.customerId === customer.id);
  const ships = all.shipments.filter(s => s.customerId === customer.id);
  const openBal = invs.filter(i => i.status !== 'paid' && i.status !== 'draft').reduce((s,i)=>s+i.total,0);
  return (
    <div className={`bg-gradient-to-br from-brand to-brand-dark text-white rounded-xl p-4 ${compact ? '' : 'mb-5'}`}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
          {customer.contactPerson.split(' ').map(n=>n[0]).join('').slice(0,2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm leading-tight truncate">{customer.contactPerson}</div>
          <div className="text-xs text-white/70 truncate">{customer.name}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div><div className="text-sm font-bold">{ships.length}</div><div className="text-[10px] text-white/70 uppercase">Shipments</div></div>
        <div><div className="text-sm font-bold">{invs.length}</div><div className="text-[10px] text-white/70 uppercase">Invoices</div></div>
        <div><div className="text-sm font-bold">{openBal > 0 ? formatMoney(openBal).replace('$','') : '—'}</div><div className="text-[10px] text-white/70 uppercase">Open</div></div>
      </div>
      {!compact && (
        <div className="mt-3 pt-3 border-t border-white/20 space-y-1 text-xs text-white/80">
          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {customer.email}</div>
          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {customer.phone}</div>
          {customer.accountManager && <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> AM: {customer.accountManager}</div>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
function HubDashboard({ customer, data, onTab }: { customer: Customer; data: any; onTab: (t: HubTab) => void }) {
  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand via-blue-600 to-indigo-700 text-white rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-xl md:text-2xl font-bold mb-1">
            Hello, {customer.contactPerson.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-white/80 mb-4">
            Welcome to your FreightFlow customer portal. Here's what's happening with your freight.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>onTab('request')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-brand text-sm font-bold hover:bg-white/90">
              <Plus className="w-4 h-4" /> Request a new quote
            </button>
            <button onClick={()=>onTab('messages')} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 text-white text-sm font-semibold hover:bg-white/25 backdrop-blur">
              <MessageSquare className="w-4 h-4" /> Message your team
            </button>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Active Shipments" value={data.activeShipments.length} sub={data.shipments.length + ' total'} icon={<Package className="w-5 h-5" />} color="blue" onClick={()=>onTab('shipments')} />
        <KPI label="Outstanding Balance" value={formatMoney(data.balance)} sub={data.overdue > 0 ? `⚠️ ${formatMoney(data.overdue)} overdue` : 'All current'} icon={<Wallet className="w-5 h-5" />} color={data.overdue > 0 ? 'rose' : 'emerald'} onClick={()=>onTab('invoices')} />
        <KPI label="Pending Approvals" value={data.pendingApprovals.length} sub="Documents to review" icon={<FileSignature className="w-5 h-5" />} color={data.pendingApprovals.length > 0 ? 'amber' : 'slate'} onClick={()=>onTab('approvals')} />
        <KPI label="Open Quotes" value={data.quotes.filter((q:Quote)=>q.status==='sent'||q.status==='pending').length} sub={data.quotes.filter((q:Quote)=>q.status==='accepted').length + ' accepted'} icon={<ClipboardList className="w-5 h-5" />} color="indigo" onClick={()=>onTab('quotes')} />
      </div>

      {/* Quick rows */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Active shipments */}
        <SectionCard title="Active Shipments" icon={<Truck className="w-4 h-4" />} action={{ label: 'View all', onClick: ()=>onTab('shipments') }}>
          {data.activeShipments.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No active shipments. <button onClick={()=>onTab('request')} className="text-brand font-semibold hover:underline">Request a quote →</button></p>
          ) : (
            <div className="space-y-2">
              {data.activeShipments.slice(0,4).map((s: Shipment) => (
                <ShipmentRow key={s.id} shipment={s} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Pending Approvals */}
        <SectionCard title="Awaiting Your Approval" icon={<FileCheck2 className="w-4 h-4" />} action={{ label: data.pendingApprovals.length ? 'Review all' : '', onClick: ()=>onTab('approvals') }} tone={data.pendingApprovals.length ? 'amber' : undefined}>
          {data.pendingApprovals.length === 0 ? (
            <div className="py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nothing pending — all documents approved ✓</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.pendingApprovals.slice(0,3).map((a: DocApproval) => (
                <div key={a.id} className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{a.docName}</div>
                      <div className="text-xs text-slate-500">{a.category} · requested {formatDate(a.requestedAt)}</div>
                    </div>
                    <button onClick={()=>onTab('approvals')} className="text-xs text-brand font-semibold whitespace-nowrap">Review →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent invoices */}
        <SectionCard title="Recent Invoices" icon={<Receipt className="w-4 h-4" />} action={{ label: 'View SOA', onClick: ()=>onTab('invoices') }}>
          {data.invoices.slice(0,4).length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No invoices yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.invoices.slice(0,4).map((i: Invoice) => (
                <div key={i.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-sm">{i.number}</div>
                    <div className="text-xs text-slate-500">Due {formatDate(i.dueDate)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">{formatMoney(i.total, i.currency)}</div>
                    <StatusPill status={i.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent messages */}
        <SectionCard title="Messages" icon={<MessageSquare className="w-4 h-4" />} action={{ label: 'Open chat', onClick: ()=>onTab('messages') }}>
          {data.messages.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No messages yet. Start a conversation with your freight team.</p>
          ) : (
            <div className="space-y-2">
              {data.messages.slice(0,3).map((m: PortalMessage) => (
                <div key={m.id} className={`flex ${m.from==='customer'?'justify-end':'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.from==='customer'
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap line-clamp-2">{m.body}</div>
                    <div className={`text-[9px] mt-0.5 ${m.from==='customer'?'text-white/60':'text-slate-400'}`}>{m.authorName} · {formatDateTime(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* CTA banner */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">All your freight in one place 🎉</div>
          <div className="text-xs text-emerald-800 dark:text-emerald-300/80">
            No more searching through emails. Approve docs, view invoices, and track shipments right here — 24/7.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHIPMENTS
// ---------------------------------------------------------------------------
function HubShipments({ customer, shipments }: { customer: Customer; shipments: Shipment[] }) {
  const [filter, setFilter] = useState<'all'|'active'|'delivered'>('all');
  const [detail, setDetail] = useState<Shipment | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'active') return shipments.filter(s => !['delivered','cancelled'].includes(s.status));
    if (filter === 'delivered') return shipments.filter(s => s.status === 'delivered');
    return shipments;
  }, [shipments, filter]);

  if (detail) return <ShipmentDetailPortal shipment={detail} onBack={()=>setDetail(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Shipments</h2>
          <p className="text-sm text-slate-500">Track and trace all your freight.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['all','active','delivered'] as const).map(f => (
            <button key={f} onClick={()=>setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${filter===f ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
              {f} ({f==='all'?shipments.length:f==='active'?shipments.filter(s=>!['delivered','cancelled'].includes(s.status)).length:shipments.filter(s=>s.status==='delivered').length})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Package className="w-10 h-10" />} title="No shipments yet" text="When you book a shipment it will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <button key={s.id} onClick={()=>setDetail(s)} className="w-full text-left">
              <ShipmentCard shipment={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShipmentCard({ shipment: s }: { shipment: Shipment }) {
  const stageIdx = STAGES.indexOf(s.status as any);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:border-brand/30 transition">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.mode==='air'?'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400':'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            {s.mode==='air' ? <Plane className="w-4 h-4"/> : <Ship className="w-4 h-4"/>}
          </div>
          <div className="min-w-0">
            <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">{s.reference}</div>
            <div className="text-xs text-slate-500">{s.commodity} · {s.pieces} pcs · {s.weight.toLocaleString()}kg</div>
          </div>
        </div>
        <StatusPill status={s.status} />
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-3">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate font-medium">{s.portOfLoading}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="truncate font-medium">{s.portOfDischarge}</span>
      </div>
      {/* Progress bar */}
      <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand to-emerald-500 rounded-full transition-all"
          style={{ width: `${Math.max(5, Math.min(100, ((Math.max(stageIdx,0))/(STAGES.length-1))*100))}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-semibold uppercase">
        <span>Quoted</span>
        <span>{s.etd ? 'ETD ' + formatDate(s.etd) : ''}</span>
        <span>ETA {formatDate(s.eta)}</span>
      </div>
    </div>
  );
}

function ShipmentRow({ shipment: s }: { shipment: Shipment }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.mode==='air'?'bg-sky-100 text-sky-600':'bg-blue-100 text-blue-600'}`}>
        {s.mode==='air' ? <Plane className="w-4 h-4"/> : <Ship className="w-4 h-4"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">{s.reference}</span>
          <StatusPill status={s.status} small />
        </div>
        <div className="text-xs text-slate-500 truncate">{s.portOfLoading} → {s.portOfDischarge} · ETA {formatDate(s.eta)}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHIPMENT DETAIL (simplified for portal)
// ---------------------------------------------------------------------------
function ShipmentDetailPortal({ shipment: s, onBack }: { shipment: Shipment; onBack: () => void }) {
  const stageIdx = STAGES.indexOf(s.status as any);
  const docs = db.docsFor('shipment', s.id);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to shipments
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {s.mode==='air'?<Plane className="w-5 h-5"/>:<Ship className="w-5 h-5"/>}
                <span className="uppercase text-xs font-semibold text-white/80 tracking-wider">{s.mode} freight · {s.direction}</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold">{s.reference}</div>
              <div className="text-white/80 text-sm mt-1">{s.commodity} · {s.incoterm}</div>
            </div>
            <StatusPill status={s.status} light />
          </div>
        </div>

        <div className="p-5 grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>From</div>
            <div className="font-bold text-slate-900 dark:text-white">{s.portOfLoading}</div>
            <div className="text-sm text-slate-500">{s.origin}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1"><Calendar className="w-3 h-3"/>ETD {formatDate(s.etd)}</div>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-center w-full">
              <div className="w-3 h-3 rounded-full bg-emerald-500"/>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-500 to-brand relative">
                <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-brand shadow flex items-center justify-center"
                  style={{ left: `${Math.min(95,Math.max(5,(Math.max(stageIdx,0)/(STAGES.length-1))*100))}%`, transform: 'translate(-50%,-50%)' }}>
                  {s.mode==='air'?<Plane className="w-4 h-4 text-brand"/>:<Ship className="w-4 h-4 text-brand"/>}
                </div>
              </div>
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"/>
            </div>
          </div>
          <div className="md:text-right">
            <div className="text-[10px] font-bold uppercase text-rose-600 mb-1 flex items-center gap-1 md:justify-end"><MapPin className="w-3 h-3"/>To</div>
            <div className="font-bold text-slate-900 dark:text-white">{s.portOfDischarge}</div>
            <div className="text-sm text-slate-500">{s.destination}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 md:justify-end"><Calendar className="w-3 h-3"/>ETA {formatDate(s.eta)}</div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="relative flex justify-between px-2">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-700"/>
            <div className="absolute top-4 left-6 h-0.5 bg-brand transition-all"
              style={{ width: `calc(${(Math.max(stageIdx,0)/(STAGES.length-1))*100}% - ${(Math.max(stageIdx,0)/(STAGES.length-1))*48}px)` }}/>
            {STAGES.map((st,i) => {
              const done = i <= stageIdx;
              return (
                <div key={st} className="relative z-10 flex flex-col items-center" style={{width:0}}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${done?'bg-brand text-white border-brand':'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'}`}>{i+1}</div>
                  <div className={`mt-2 text-[10px] font-semibold uppercase whitespace-nowrap ${done?'text-slate-900 dark:text-white':'text-slate-400'}`}>{titleCase(st)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <InfoTile icon={<Package className="w-5 h-5" />} label="Cargo"><div className="text-sm">{s.pieces} pcs · {s.weight.toLocaleString()}kg · {s.volume} CBM</div></InfoTile>
        <InfoTile icon={<Truck className="w-5 h-5" />} label="Carrier"><div className="text-sm font-semibold">{s.carrier}</div><div className="text-xs text-slate-500">{s.vesselOrFlight}</div></InfoTile>
        <InfoTile icon={<ShieldCheck className="w-5 h-5" />} label="Customs"><StatusPill status={s.customsStatus || 'pending'} /></InfoTile>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-brand"/>Shipping Documents</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500">No documents published yet. Your forwarder will upload them as they become available.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {docs.map(d => (
              <button key={d.id} onClick={() => { if (d.dataUrl) { const a = document.createElement('a'); a.href=d.dataUrl; a.download=d.name; a.click(); }}}
                className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left">
                <Paperclip className="w-4 h-4 text-slate-400"/>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-[10px] text-slate-400">{Math.round(d.sizeBytes/1024)}KB · {formatDate(d.uploadedAt)}</div>
                </div>
                <Download className="w-4 h-4 text-brand"/>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => downloadBlob(generateShipmentBL(s), `${s.reference}_${s.mode==='air'?'AWB':'BL'}.pdf`)}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark">
          <Download className="w-4 h-4"/> Download {s.mode==='air'?'Air Waybill':'Bill of Lading'} PDF
        </button>
      </div>

      {/* Message panel for this shipment */}
      <ShipmentMessagePanel shipment={s} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUOTES
// ---------------------------------------------------------------------------
function HubQuotes({ customer, quotes, onChange }: { customer: Customer; quotes: Quote[]; onChange: () => void }) {
  const [reasonOpen, setReasonOpen] = useState<string|null>(null);
  const [reason, setReason] = useState('');

  const accept = (q: Quote) => {
    if (!confirm(`Accept quote ${q.number} for ${formatMoney(q.total, q.currency)}? Your account manager will be notified and booking will proceed.`)) return;
    db.customerAcceptQuote(q.id);
    onChange();
  };
  const reject = (q: Quote) => {
    db.customerRejectQuote(q.id, reason || 'No reason provided');
    setReasonOpen(null); setReason(''); onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Quotes</h2>
          <p className="text-sm text-slate-500">Review, accept, or decline freight quotes.</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-10 h-10"/>} title="No quotes yet" text="Request your first quote and we'll respond within 24 hours." />
      ) : (
        <div className="space-y-3">
          {quotes.map(q => {
            const expired = !!(q.validUntil && new Date(q.validUntil) < new Date());
            return (
              <div key={q.id} className={`bg-white dark:bg-slate-900 rounded-xl border ${
                q.status==='accepted' ? 'border-emerald-200 dark:border-emerald-900/50' :
                q.status==='rejected' ? 'border-rose-200 dark:border-rose-900/50 opacity-70' :
                expired ? 'border-amber-200 dark:border-amber-900/50' :
                'border-slate-200 dark:border-slate-800'
              } p-4`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${q.mode==='air'?'bg-sky-100 text-sky-600':'bg-blue-100 text-blue-600'}`}>
                      {q.mode==='air'?<Plane className="w-4 h-4"/>:<Ship className="w-4 h-4"/>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{q.number}</span>
                        <StatusPill status={q.status === 'sent' ? 'pending' : q.status} />
                        {expired && q.status==='pending' && <Badge color="amber">Expired</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">Valid until {formatDate(q.validUntil)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{formatMoney(q.total, q.currency)}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">All-inclusive</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-3">
                  <span className="font-medium truncate">{q.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
                  <span className="font-medium truncate">{q.destination}</span>
                </div>

                <div className="text-xs text-slate-500 mb-1">{q.commodity} · {q.weight.toLocaleString()}kg · {q.volume} CBM</div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Freight</div>
                    <div className="font-bold">{formatMoney(q.freightRate)}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Customs</div>
                    <div className="font-bold">{formatMoney(q.customsFee)}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Trucking</div>
                    <div className="font-bold">{formatMoney(q.truckingFee)}</div>
                  </div>
                </div>

                {q.status === 'accepted' ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5"/>
                    <span className="text-sm font-semibold">Quote accepted! Your booking is being processed.</span>
                  </div>
                ) : q.status === 'rejected' ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">
                    <XCircle className="w-5 h-5"/>
                    <span className="text-sm font-semibold">Quote declined. Thank you for your feedback.</span>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={()=>accept(q)} disabled={expired}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ThumbsUp className="w-4 h-4"/> Accept Quote
                    </button>
                    {reasonOpen === q.id ? (
                      <div className="flex gap-2 items-center flex-1 min-w-[200px]">
                        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)..." className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"/>
                        <button onClick={()=>reject(q)} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold">Confirm</button>
                        <button onClick={()=>{setReasonOpen(null); setReason('');}} className="p-2 text-slate-400"><X className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <button onClick={()=>setReasonOpen(q.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <ThumbsDown className="w-4 h-4"/> Decline
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// INVOICES & SOA
// ---------------------------------------------------------------------------
function HubInvoices({ customer, invoices }: { customer: Customer; invoices: Invoice[] }) {
  const [view, setView] = useState<'invoices'|'soa'>('invoices');
  const soa = useMemo(() => db.customerStatement(customer.id), [customer.id]);
  const paid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.total,0);
  const open = invoices.filter(i=>i.status!=='paid'&&i.status!=='draft').reduce((s,i)=>s+i.total,0);
  const overdue = db.customerOverdue(customer.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invoices & Statement of Account</h2>
        <p className="text-sm text-slate-500">View your invoices and outstanding balance.</p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Current Balance" value={formatMoney(open)} sub={invoices.filter(i=>i.status!=='paid'&&i.status!=='draft').length + ' open'} icon={<Wallet className="w-5 h-5"/>} color={overdue>0?'rose':'indigo'}/>
        <KPI label="Overdue" value={formatMoney(overdue)} sub={overdue>0?'Please pay promptly':'Up to date 🎉'} icon={<AlertCircle className="w-5 h-5"/>} color={overdue>0?'rose':'emerald'}/>
        <KPI label="Paid (YTD)" value={formatMoney(paid)} sub="Thank you!" icon={<CheckCircle2 className="w-5 h-5"/>} color="emerald"/>
        <KPI label="Credit Limit" value={formatMoney(customer.creditLimit||0)} sub={`Net ${customer.paymentTerms||30} days`} icon={<CreditCard className="w-5 h-5"/>} color="slate"/>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        <button onClick={()=>setView('invoices')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${view==='invoices'?'bg-white dark:bg-slate-700 shadow':''}`}>Invoices</button>
        <button onClick={()=>setView('soa')} className={`px-4 py-1.5 rounded-md text-sm font-semibold ${view==='soa'?'bg-white dark:bg-slate-700 shadow':''}`}>Statement (SOA)</button>
      </div>

      {view === 'invoices' ? (
        invoices.length === 0 ? (
          <EmptyState icon={<Receipt className="w-10 h-10"/>} title="No invoices" text="Invoices will appear once shipments are billed."/>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5">Invoice</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Issued</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Due</th>
                    <th className="text-right px-4 py-2.5">Amount</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map(i => {
                    const isOverdue = i.status !== 'paid' && new Date(i.dueDate) < new Date();
                    return (
                      <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-semibold">{i.number}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(i.issueDate)}</td>
                        <td className={`px-4 py-3 hidden md:table-cell ${isOverdue?'text-rose-600 font-semibold':'text-slate-500'}`}>{formatDate(i.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatMoney(i.total, i.currency)}</td>
                        <td className="px-4 py-3"><StatusPill status={isOverdue && i.status==='sent' ? 'overdue' : i.status}/></td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-brand text-xs font-semibold hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3"/> PDF</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold">Statement of Account</h3>
              <p className="text-xs text-slate-500">{customer.name} · as of {formatDate(new Date().toISOString())}</p>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold">
              <Download className="w-3.5 h-3.5"/> Download PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Ref</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-right px-4 py-2">Debit</th>
                  <th className="text-right px-4 py-2">Credit</th>
                  <th className="text-right px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {soa.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No transactions on this account.</td></tr>
                ) : soa.map((l, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(l.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.ref}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{l.description}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{l.debit>0?formatMoney(l.debit):'—'}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{l.credit>0?formatMoney(l.credit):'—'}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{formatMoney(l.balance)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-right">Current balance due:</td>
                  <td className={`px-4 py-3 text-right text-lg ${overdue>0?'text-rose-600':'text-slate-900 dark:text-white'}`}>{formatMoney(open)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 flex-wrap">
            <Info className="w-4 h-4 text-slate-400"/>
            <span className="text-xs text-slate-500 flex-1">Payment by bank transfer (BOA MG, IBAN MG00 0000 0000 0000) or Mobile Money. Reference invoice numbers on payment.</span>
            <button className="text-xs font-bold text-brand hover:underline">Payment instructions →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DOCUMENTS
// ---------------------------------------------------------------------------
function HubDocuments({ docs }: { docs: DocFile[] }) {
  const byCategory = useMemo(() => {
    const g: Record<string, DocFile[]> = {};
    docs.forEach(d => {
      const cat = d.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (!g[cat]) g[cat] = [];
      g[cat].push(d);
    });
    return g;
  }, [docs]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documents</h2>
        <p className="text-sm text-slate-500">All shipping documents, invoices, and certificates in one place.</p>
      </div>
      {docs.length === 0 ? (
        <EmptyState icon={<FolderOpen className="w-10 h-10"/>} title="No documents yet" text="Documents will appear here as shipments progress."/>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-brand"/>{cat} <span className="text-xs font-normal text-slate-400">({items.length})</span></h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {items.map(d => (
                  <button key={d.id} onClick={() => { if (d.dataUrl) { const a=document.createElement('a'); a.href=d.dataUrl; a.download=d.name; a.click(); }}}
                    className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left group">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{d.name}</div>
                      <div className="text-[10px] text-slate-400">{Math.round(d.sizeBytes/1024)}KB · {formatDate(d.uploadedAt)} · v{d.version||1}</div>
                    </div>
                    <Download className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition"/>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// APPROVALS
// ---------------------------------------------------------------------------
function HubApprovals({ approvals, onChange }: { approvals: DocApproval[]; onChange: () => void }) {
  const [comment, setComment] = useState<Record<string,string>>({});

  const decide = (id: string, decision: 'approved'|'rejected') => {
    db.customerDecideApproval(id, decision, comment[id]);
    setComment(c => ({...c, [id]: ''}));
    onChange();
  };

  const pending = approvals.filter(a => a.status === 'pending' && a.reviewers.some(r => r.role==='Customer' && r.status==='pending'));
  const decided = approvals.filter(a => a.status !== 'pending' || !a.reviewers.some(r => r.role==='Customer' && r.status==='pending'));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Documents to Approve</h2>
        <p className="text-sm text-slate-500">Review BL drafts, invoices, and certificates before they are finalized.</p>
      </div>

      {pending.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2"/>
          <div className="font-bold text-emerald-900 dark:text-emerald-200">All caught up!</div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300/80">You have no documents pending approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(a => (
            <div key={a.id} className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                  <FileSignature className="w-5 h-5"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white">{a.docName}</div>
                  <div className="text-xs text-slate-500 mb-1">{a.category} · requested by {a.requestedBy} · {formatDate(a.requestedAt)}</div>
                  {a.expiryDate && <div className="text-xs text-amber-600 font-semibold">⏰ Expires {formatDate(a.expiryDate)}</div>}
                  <textarea value={comment[a.id]||''} onChange={e=>setComment(c=>({...c,[a.id]:e.target.value}))}
                    placeholder="Add a comment (optional)..."
                    className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" rows={2}/>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button onClick={()=>decide(a.id,'approved')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
                      <Check className="w-4 h-4"/> Approve
                    </button>
                    <button onClick={()=>decide(a.id,'rejected')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700">
                      <X className="w-4 h-4"/> Request changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mt-6">History</h3>
          <div className="space-y-2">
            {decided.slice(0,10).map(a => {
              const myDecision = a.reviewers.find(r => r.role==='Customer');
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  {myDecision?.status==='approved' ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <XCircle className="w-5 h-5 text-rose-500"/>}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.docName}</div>
                    <div className="text-xs text-slate-500">{a.category} · {myDecision?.decidedAt ? formatDate(myDecision.decidedAt) : a.status}</div>
                  </div>
                  <Badge color={a.status==='approved'?'emerald':a.status==='rejected'?'rose':'slate'}>{a.status}</Badge>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MESSAGES (unified chat — aggregates messages from all shipments)
// ---------------------------------------------------------------------------
function HubMessages({ customer, onChange }: { customer: Customer; onChange: () => void }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = () => setMessages(db.customerMessages(customer.id));
  useEffect(() => { refresh(); const r = () => { refresh(); }; window.addEventListener('ff:data-changed', r); return () => window.removeEventListener('ff:data-changed', r); }, [customer.id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    db.customerAddMessage(customer.id, text.trim());
    setText(''); refresh(); onChange();
    // Auto-reply
    setTimeout(() => {
      const replies = [
        `Thanks ${customer.contactPerson.split(' ')[0]}! Your message has been routed to your account manager. We'll reply within 1 business hour during EAT 8h–18h.`,
        `Received loud and clear — we're on it. Expect a detailed reply shortly.`,
        `Thank you for your message. Our team is reviewing and will respond with an update soon.`
      ];
      const all = db.getAll();
      const sid = all.shipments.find(s => s.customerId === customer.id)?.id || '__general__';
      db.addPortalMessage({ shipmentId: sid, from: 'forwarder', authorName: customer.accountManager || 'FreightFlow Team', body: replies[Math.floor(Math.random()*replies.length)] });
      refresh(); onChange();
    }, 1400);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h2>
        <p className="text-sm text-slate-500">Chat with your account manager and ops team — replaces endless email threads.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[60vh] min-h-[400px]">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
            {(customer.accountManager||'FF').split(' ').map(n=>n[0]).join('').slice(0,2)}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">{customer.accountManager || 'FreightFlow Team'}</div>
            <div className="text-xs text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>Online · usually replies within 1 hour</div>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2"/>
              <p className="text-sm text-slate-400">Start the conversation — ask about rates, ETAs, or documents.</p>
            </div>
          )}
          {messages.map(m => {
            const mine = m.from === 'customer';
            return (
              <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  mine ? 'bg-brand text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-700'
                }`}>
                  {!mine && <div className="text-[10px] font-semibold mb-0.5 text-slate-500">{m.authorName}</div>}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[9px] mt-1 ${mine?'text-white/60':'text-slate-400'}`}>{formatDateTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send();}}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-brand text-slate-900 dark:text-white"/>
          <button onClick={send} disabled={!text.trim()} className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-dark transition">
            <Send className="w-4 h-4"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// REQUEST QUOTE
// ---------------------------------------------------------------------------
function HubRequestQuote({ customer, onDone }: { customer: Customer; onDone: () => void }) {
  const [form, setForm] = useState({
    mode: 'sea' as 'air'|'sea'|'road',
    direction: 'import' as 'import'|'export',
    origin: '', destination: '',
    weight: '', volume: '', pieces: '1',
    commodity: '',
    incoterm: 'CIF',
    readyDate: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (k: string, v: any) => setForm(f => ({...f, [k]: v}));
  const submit = () => {
    if (!form.origin || !form.destination || !form.commodity) return;
    db.customerRequestQuote(customer.id, {
      mode: form.mode, direction: form.direction,
      origin: form.origin, destination: form.destination,
      weight: parseFloat(form.weight)||0, volume: parseFloat(form.volume)||0, pieces: parseInt(form.pieces)||1,
      commodity: form.commodity, incoterm: form.incoterm, readyDate: form.readyDate||undefined, notes: form.notes||undefined,
    });
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8"/>
        </div>
        <h2 className="text-xl font-bold mb-2">Quote request sent! 🎉</h2>
        <p className="text-sm text-slate-500 mb-6">
          Thanks {customer.contactPerson.split(' ')[0]}! Your account manager will respond with a detailed quote within 24 hours (Mon–Fri, EAT).
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={onDone} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold">View my quotes</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request a Quote</h2>
        <p className="text-sm text-slate-500">Fill in the details and we'll get back to you within 24 hours with a competitive all-in rate.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode">
            <div className="flex gap-1.5">
              {(['sea','air','road'] as const).map(m => (
                <button key={m} type="button" onClick={()=>update('mode',m)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold border-2 transition ${form.mode===m?'border-brand bg-brand/10 text-brand':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {m==='air'?<Plane className="w-3.5 h-3.5"/>:m==='sea'?<Ship className="w-3.5 h-3.5"/>:<Truck className="w-3.5 h-3.5"/>}
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Direction">
            <div className="flex gap-1.5">
              {(['import','export'] as const).map(d => (
                <button key={d} type="button" onClick={()=>update('direction',d)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 capitalize ${form.direction===d?'border-brand bg-brand/10 text-brand':'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {d}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Origin (city/port)">
          <PortAutocomplete value={form.origin} onChange={v=>update('origin',v)} placeholder="e.g. Toamasina, Antananarivo (TNR)" allowFreeText compact />
        </Field>
        <Field label="Destination (city/port)">
          <PortAutocomplete value={form.destination} onChange={v=>update('destination',v)} placeholder="e.g. Hamburg, Paris (CDG)" allowFreeText compact />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Weight (kg)"><Input type="number" value={form.weight} onChange={e=>update('weight',e.target.value)} placeholder="0"/></Field>
          <Field label="Volume (CBM)"><Input type="number" step="0.1" value={form.volume} onChange={e=>update('volume',e.target.value)} placeholder="0"/></Field>
          <Field label="Pieces"><Input type="number" value={form.pieces} onChange={e=>update('pieces',e.target.value)} placeholder="1"/></Field>
        </div>

        <Field label="Commodity / Description">
          <Input value={form.commodity} onChange={e=>update('commodity',e.target.value)} placeholder="e.g. Vanilla beans, Electronics, Pharmaceuticals"/>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Incoterm">
            <select value={form.incoterm} onChange={e=>update('incoterm',e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              {['EXW','FOB','FCA','CFR','CIF','CPT','CIP','DAP','DDP'].map(i=><option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Ready date"><Input type="date" value={form.readyDate} onChange={e=>update('readyDate',e.target.value)}/></Field>
        </div>

        <Field label="Additional notes (special handling, DG, reefer, etc.)">
          <Textarea value={form.notes} onChange={e=>update('notes',e.target.value)} rows={3} placeholder="Any special requirements?"/>
        </Field>

        <button onClick={submit} disabled={!form.origin||!form.destination||!form.commodity}
          className="w-full py-3 rounded-lg bg-brand text-white font-bold hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          <Send className="w-4 h-4"/> Send Quote Request
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// REUSABLE UI
// ---------------------------------------------------------------------------
function KPI({ label, value, sub, icon, color, onClick }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; color?: string; onClick?: () => void }) {
  const colors: Record<string,string> = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600',
    indigo: 'from-indigo-500 to-violet-600',
    slate: 'from-slate-500 to-slate-600',
  };
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${onClick?'hover:shadow-md hover:border-brand/30 cursor-pointer':''}`}>
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color||'blue']} text-white flex items-center justify-center mb-2`}>{icon}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${color==='rose'?'text-rose-600 font-semibold':'text-slate-500'}`}>{sub}</div>}
    </button>
  );
}

function SectionCard({ title, icon, action, children, tone }: { title: string; icon: React.ReactNode; action?: { label: string; onClick: ()=>void }; children: React.ReactNode; tone?: 'amber' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border ${tone==='amber'?'border-amber-200 dark:border-amber-900/40':'border-slate-200 dark:border-slate-800'} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">{icon}{title}</h3>
        {action?.label && <button onClick={action.onClick} className="text-xs font-semibold text-brand hover:underline">{action.label}</button>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">{icon}</div>
      <div className="font-bold text-slate-900 dark:text-white">{title}</div>
      <div className="text-sm text-slate-500 mt-1">{text}</div>
    </div>
  );
}

function StatusPill({ status, light, small }: { status?: string; light?: boolean; small?: boolean }) {
  if (!status) return null;
  const s = status.replace(/\s/g,'_').toLowerCase();
  const map: Record<string,{bg:string;text:string;label:string}> = {
    paid: {bg:'bg-emerald-100 dark:bg-emerald-900/30', text:'text-emerald-700 dark:text-emerald-400', label:'Paid'},
    sent: {bg:'bg-blue-100 dark:bg-blue-900/30', text:'text-blue-700 dark:text-blue-400', label:'Sent'},
    draft: {bg:'bg-slate-100 dark:bg-slate-800', text:'text-slate-600 dark:text-slate-400', label:'Draft'},
    overdue: {bg:'bg-rose-100 dark:bg-rose-900/30', text:'text-rose-700 dark:text-rose-400', label:'Overdue ⚠'},
    delivered: {bg:'bg-emerald-100 dark:bg-emerald-900/30', text:'text-emerald-700 dark:text-emerald-400', label:'Delivered'},
    in_transit: {bg:'bg-blue-100 dark:bg-blue-900/30', text:'text-blue-700 dark:text-blue-400', label:'In Transit'},
    booked: {bg:'bg-indigo-100 dark:bg-indigo-900/30', text:'text-indigo-700 dark:text-indigo-400', label:'Booked'},
    picked_up: {bg:'bg-violet-100 dark:bg-violet-900/30', text:'text-violet-700 dark:text-violet-400', label:'Picked Up'},
    customs: {bg:'bg-amber-100 dark:bg-amber-900/30', text:'text-amber-700 dark:text-amber-400', label:'Customs'},
    quoted: {bg:'bg-slate-100 dark:bg-slate-800', text:'text-slate-600 dark:text-slate-400', label:'Quoted'},
    cancelled: {bg:'bg-rose-100 dark:bg-rose-900/30', text:'text-rose-700', label:'Cancelled'},
    pending: {bg:'bg-amber-100 dark:bg-amber-900/30', text:'text-amber-700 dark:text-amber-400', label:'Pending'},
    accepted: {bg:'bg-emerald-100 dark:bg-emerald-900/30', text:'text-emerald-700 dark:text-emerald-400', label:'Accepted'},
    rejected: {bg:'bg-rose-100 dark:bg-rose-900/30', text:'text-rose-700 dark:text-rose-400', label:'Rejected'},
    approved: {bg:'bg-emerald-100 dark:bg-emerald-900/30', text:'text-emerald-700 dark:text-emerald-400', label:'Approved'},
    cleared: {bg:'bg-emerald-100 dark:bg-emerald-900/30', text:'text-emerald-700 dark:text-emerald-400', label:'Cleared'},
    declared: {bg:'bg-blue-100 dark:bg-blue-900/30', text:'text-blue-700 dark:text-blue-400', label:'Declared'},
    inspection: {bg:'bg-amber-100 dark:bg-amber-900/30', text:'text-amber-700 dark:text-amber-400', label:'Inspection'},
    docs_received: {bg:'bg-indigo-100 dark:bg-indigo-900/30', text:'text-indigo-700 dark:text-indigo-400', label:'Docs Received'},
  };
  const m = map[s] || {bg:'bg-slate-100 dark:bg-slate-800', text:'text-slate-600', label: titleCase(status||'')};
  if (light) return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/30 bg-white/15 backdrop-blur text-white`}>{m.label}</span>;
  return <span className={`inline-block px-2 py-0.5 rounded-full ${small?'text-[9px]':'text-[10px]'} font-bold ${m.bg} ${m.text}`}>{m.label}</span>;
}

function Badge({ color, children }: { color?: string; children: React.ReactNode }) {
  const colors: Record<string,string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[color||'slate']}`}>{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand ${props.className||''}`}/>;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand ${props.className||''}`}/>;
}

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-2">{icon}</div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

function ShipmentMessagePanel({ shipment: s }: { shipment: Shipment }) {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const refresh = () => setMessages(db.messagesForShipment(s.id));
  useEffect(() => { refresh(); }, [s.id]);
  useEffect(() => { scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight, behavior:'smooth'}); }, [messages.length]);
  const send = () => {
    if (!text.trim()) return;
    db.addPortalMessage({ shipmentId: s.id, from: 'customer', authorName: 'Customer', body: text.trim() });
    setText(''); refresh();
    setTimeout(() => {
      db.addPortalMessage({ shipmentId: s.id, from: 'forwarder', authorName: 'FreightFlow Ops', body: 'Message received — we\'ll get back to you shortly.' });
      refresh();
    }, 1200);
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand"/>Messages about this shipment</div>
      <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950/40">
        {messages.map(m => {
          const mine = m.from === 'customer';
          return (
            <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine?'bg-brand text-white rounded-br-sm':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'}`}>
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={`text-[9px] mt-1 ${mine?'text-white/60':'text-slate-400'}`}>{formatDateTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send();}} placeholder="Ask a question about this shipment..." className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-brand"/>
        <button onClick={send} disabled={!text.trim()} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4"/></button>
      </div>
    </div>
  );
}

// Legacy per-shipment token — kept for backward compatibility with existing tracking links
function legacyShipmentToken(id: string): string {
  let h = 0; for (let i=0; i<id.length; i++) h = (h<<5)-h+id.charCodeAt(i);
  return 'tkn_'+Math.abs(h).toString(36)+'_'+id.slice(-4);
}

// Import and reuse legacy shipment portal view (rendered in place)
function LegacyShipmentPortal({ shipmentId }: { shipmentId: string }) {
  // Delegate to the old UI - re-imported here
  const [shipment, setShipment] = useState<Shipment|null>(null);
  useEffect(() => {
    setShipment(db.getAll().shipments.find(s => s.id === shipmentId) || null);
  }, [shipmentId]);
  if (!shipment) return <PortalLoading/>;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0b1220] dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/portal" className="text-sm text-brand hover:underline inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-3 h-3"/>Portal home</Link>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {shipment.mode==='air'?<Plane className="w-5 h-5"/>:<Ship className="w-5 h-5"/>}
                  <span className="uppercase tracking-wider text-xs font-semibold text-white/80">{shipment.mode} freight · {shipment.direction}</span>
                </div>
                <div className="text-3xl font-bold">{shipment.reference}</div>
                <div className="text-white/80 mt-1">{shipment.commodity} · {shipment.incoterm}</div>
              </div>
              <StatusPill status={shipment.status} light/>
            </div>
          </div>
          <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
            For the full portal experience with quotes, invoices, and approvals, please ask your account manager for your personal customer portal link.
          </div>
        </div>
      </div>
    </div>
  );
}
