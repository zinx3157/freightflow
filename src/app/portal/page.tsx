'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/store';
import type { Shipment, PortalMessage, DocFile, Invoice } from '@/lib/types';
import { formatDate, formatDateTime, statusColor, titleCase } from '@/lib/utils';
import {
  Package,
  Plane,
  Ship,
  MapPin,
  Calendar,
  Truck,
  FileText,
  Download,
  ShieldCheck,
  Send,
  UploadCloud,
  FileUp,
  MessageSquare,
  Receipt,
  FileCheck2,
  Paperclip,
  X,
  Check,
  Leaf,
  Globe,
} from 'lucide-react';
import { generateShipmentBL, downloadBlob } from '@/lib/documents';
import { useQueryParams } from '@/lib/useQueryParams';
import { useI18n } from '@/components/I18nProvider';

const STAGES = ['quoted', 'booked', 'picked_up', 'in_transit', 'customs', 'delivered'] as const;

// Simple deterministic token (demo-only)
export function tokenFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return 'tkn_' + Math.abs(h).toString(36) + '_' + id.slice(-4);
}

export default function PortalPage() {
  const params = useQueryParams();
  const token = params.get('t');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!token) { setResolved(true); return; }
    const all = db.getAll();
    const found =
      all.shipments.find((s) => tokenFor(s.id) === token) ||
      all.shipments.find((s) => s.id === token || s.reference === token) ||
      null;
    setShipment(found);
    setResolved(true);
  }, [token]);

  if (!resolved) return <PortalLoading />;
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0b1220] dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md text-center border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">FreightFlow Customer Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Please use the tracking link provided by your account manager, or enter your shipment reference below.
          </p>
          <Link href="/tracking" className="inline-block px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark">
            Go to Track & Trace
          </Link>
        </div>
      </div>
    );
  }
  if (!shipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0b1220] dark:to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 max-w-md text-center border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Shipment not found</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            This tracking link is invalid or has expired. Please contact your freight forwarder for an updated link.
          </p>
          <Link href="/tracking" className="text-brand text-sm font-medium hover:underline">
            Try the public tracker →
          </Link>
        </div>
      </div>
    );
  }

  const stageIdx = STAGES.indexOf(shipment.status as any);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    alert('Tracking link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0b1220] dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PortalHeader />

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-dark text-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {shipment.mode === 'air' ? <Plane className="w-5 h-5" /> : <Ship className="w-5 h-5" />}
                  <span className="uppercase tracking-wider text-xs font-semibold text-white/80">
                    {shipment.mode} freight · {shipment.direction}
                  </span>
                </div>
                <div className="text-3xl font-bold">{shipment.reference}</div>
                <div className="text-white/80 mt-1">{shipment.commodity} · {shipment.incoterm}</div>
                <div className="text-white/70 text-sm mt-1">For: {shipment.customerName}</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold border border-white/30 bg-white/10 backdrop-blur self-start">
                {titleCase(shipment.status)}
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-xs font-bold uppercase text-emerald-600 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" /> From
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{shipment.portOfLoading}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{shipment.origin}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Departed: {formatDate(shipment.atd || shipment.etd)}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center w-full">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-500 to-brand relative">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-brand shadow flex items-center justify-center"
                    style={{ left: `${Math.min(95, Math.max(5, (Math.max(stageIdx, 0) / (STAGES.length - 1)) * 100))}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {shipment.mode === 'air' ? <Plane className="w-4 h-4 text-brand" /> : <Ship className="w-4 h-4 text-brand" />}
                  </div>
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase text-rose-600 flex items-center gap-1 mb-1 justify-end">
                <MapPin className="w-3 h-3" /> To
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{shipment.portOfDischarge}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{shipment.destination}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" /> ETA: {formatDate(shipment.eta)}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="relative flex justify-between px-4">
              <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-700" />
              <div
                className="absolute top-4 left-8 h-0.5 bg-brand transition-all"
                style={{
                  width: `calc(${(Math.max(stageIdx, 0) / (STAGES.length - 1)) * 100}% - ${(Math.max(stageIdx, 0) / (STAGES.length - 1)) * 64}px)`,
                }}
              />
              {STAGES.map((st, i) => {
                const done = i <= stageIdx;
                return (
                  <div key={st} className="relative z-10 flex flex-col items-center" style={{ width: 0 }}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                        done ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className={`mt-2 text-[10px] font-semibold uppercase whitespace-nowrap ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {titleCase(st)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <InfoCard icon={<Truck className="w-5 h-5" />} title="Inland Transport" tone="violet">
            {shipment.truckingDispatched ? (
              <div>
                <div className="text-sm text-slate-700 dark:text-slate-300">Trucking has been dispatched</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your goods are moving between port and final destination.</div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Inland trucking not yet scheduled</div>
            )}
          </InfoCard>
          <InfoCard icon={<ShieldCheck className="w-5 h-5" />} title="Customs Status" tone="amber">
            <div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColor('customs', shipment.customsStatus || 'pending')}`}>
                {titleCase(shipment.customsStatus || 'pending')}
              </span>
              {shipment.duties ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Duties assessed: ${shipment.duties.toLocaleString()}</div>
              ) : null}
            </div>
          </InfoCard>
          <InfoCard icon={<FileText className="w-5 h-5" />} title="Documents" tone="blue">
            <button
              onClick={() => downloadBlob(generateShipmentBL(shipment), `${shipment.reference}_${shipment.mode === 'air' ? 'AWB' : 'BL'}.pdf`)}
              className="flex items-center gap-2 text-sm text-brand hover:underline"
            >
              <Download className="w-4 h-4" /> Download {shipment.mode === 'air' ? 'Air Waybill' : 'Bill of Lading'} PDF
            </button>
          </InfoCard>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-6 mt-6">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Cargo Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Pieces</div><div className="font-bold text-lg text-slate-900 dark:text-white">{shipment.pieces}</div></div>
            <div><div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Weight</div><div className="font-bold text-lg text-slate-900 dark:text-white">{shipment.weight.toLocaleString()} kg</div></div>
            <div><div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Volume</div><div className="font-bold text-lg text-slate-900 dark:text-white">{shipment.volume} CBM</div></div>
            <div><div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Carrier</div><div className="font-bold text-lg text-slate-900 dark:text-white">{shipment.carrier}</div></div>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-slate-500 dark:text-slate-400">Questions about this shipment? Use the chat below to message your freight team directly.</div>
          <button onClick={copyLink} className="text-brand font-medium hover:underline">
            🔗 Copy tracking link
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <CustomerChat shipmentId={shipment.id} customerName={shipment.customerName} />
          <DocUpload shipment={shipment} />
        </div>

        <RelatedDocuments shipmentId={shipment.id} />
        <Co2AndInvoices shipment={shipment} />
      </div>
    </div>
  );
}

function PortalHeader() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center">
          <Ship className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-lg">FreightFlow</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Customer Tracking Portal</div>
        </div>
      </div>
      <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-lg p-1 border border-slate-200 dark:border-slate-800">
        {(['en','fr','mg'] as const).map(code => (
          <button key={code} onClick={() => setLang(code)}
            className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${lang===code ? 'bg-brand text-white' : 'text-slate-600 dark:text-slate-400 hover:text-brand'}`}>
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerChat({ shipmentId, customerName }: { shipmentId: string; customerName: string }) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = () => setMessages(db.messagesForShipment(shipmentId));
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, [shipmentId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    db.addPortalMessage({ shipmentId, from: 'customer', authorName: customerName, body: text.trim() });
    setText('');
    refresh();
    // Auto-reply from forwarder after 1.5s for demo
    setTimeout(() => {
      const replies = [
        "Thanks for your message! Your account manager will reply shortly. In the meantime, you can download documents above.",
        "Received! We're checking on this and will get back to you within the hour during business hours (EAT 8h–18h).",
        "Thank you — confirming receipt. We'll follow up with an update by end of day.",
      ];
      db.addPortalMessage({ shipmentId, from: 'forwarder', authorName: 'FreightFlow Operations', body: replies[Math.floor(Math.random()*replies.length)] });
      refresh();
    }, 1200 + Math.random()*800);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">Message your freight team</div>
          <div className="text-xs text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> Usually replies within 1 hour</div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
        {messages.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">
            Start a conversation — ask about your shipment, request changes, or flag issues.
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from==='customer'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.from==='customer'
                ? 'bg-brand text-white rounded-br-sm'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-700'
            }`}>
              <div className={`text-[10px] font-semibold mb-0.5 ${m.from==='customer'?'text-white/70':'text-slate-400'}`}>{m.authorName}</div>
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`text-[9px] mt-1 ${m.from==='customer'?'text-white/60':'text-slate-400'}`}>{formatDateTime(m.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter') send(); }}
          placeholder="Type your message…"
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-0 focus:outline-none focus:ring-2 focus:ring-brand text-slate-900 dark:text-white"
        />
        <button onClick={send} disabled={!text.trim()} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center disabled:opacity-40 hover:bg-brand-dark transition">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DocUpload({ shipment }: { shipment: Shipment }) {
  const [drag, setDrag] = useState(false);
  const [uploaded, setUploaded] = useState<DocFile[]>([]);
  useEffect(() => {
    const d = db.getAll();
    setUploaded(d.docs.filter(x => x.relatedType === 'shipment' && x.relatedId === shipment.id));
  }, [shipment.id]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        db.addDoc({
          name: f.name, category: 'other', sizeBytes: f.size, mimeType: f.type,
          relatedType: 'shipment', relatedId: shipment.id,
          uploadedBy: shipment.customerName, tags: ['customer-uploaded'],
          dataUrl: reader.result as string,
        });
        setUploaded(db.getAll().docs.filter(x => x.relatedType==='shipment' && x.relatedId===shipment.id));
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
          <UploadCloud className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-sm">Upload Documents</div>
          <div className="text-xs text-slate-500">CI, PL, permits, certificates — drag & drop</div>
        </div>
      </div>
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          drag ? 'border-brand bg-brand/5' : 'border-slate-300 dark:border-slate-700 hover:border-brand'
        }`}>
        <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Drop files here or click to browse</div>
        <div className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOCX — max 5MB each</div>
        <input type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </label>
      {uploaded.filter(u => u.tags?.includes('customer-uploaded')).length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Uploaded by you</div>
          {uploaded.filter(u => u.tags?.includes('customer-uploaded')).map(u => (
            <div key={u.id} className="flex items-center gap-2 text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="flex-1 truncate font-medium">{u.name}</span>
              <span className="text-slate-400">{Math.round(u.sizeBytes/1024)}KB</span>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatedDocuments({ shipmentId }: { shipmentId: string }) {
  const [docs, setDocs] = useState<DocFile[]>([]);
  useEffect(() => {
    setDocs(db.getAll().docs.filter(d => d.relatedType==='shipment' && d.relatedId===shipmentId && !d.tags?.includes('customer-uploaded')));
  }, [shipmentId]);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-5 mt-6">
      <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand" /> Shipping Documents
      </h3>
      {docs.length === 0 ? (
        <p className="text-sm text-slate-500">No documents published for this shipment yet. Your forwarder will upload AWB/BL, commercial invoice and packing list once available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {docs.map(d => (
            <button key={d.id}
              onClick={() => { if (d.dataUrl) { const a = document.createElement('a'); a.href = d.dataUrl; a.download = d.name; a.click(); } }}
              className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900 dark:text-white truncate">{d.name}</div>
                <div className="text-[10px] text-slate-400">{d.category.replace(/_/g,' ')} · {Math.round(d.sizeBytes/1024)}KB · {formatDate(d.uploadedAt)}</div>
              </div>
              <Download className="w-4 h-4 text-brand" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Co2AndInvoices({ shipment }: { shipment: Shipment }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  useEffect(() => {
    setInvoices(db.getAll().invoices.filter(i => i.shipmentId === shipment.id));
  }, [shipment.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow p-5">
        <div className="flex items-center gap-2 mb-2"><Leaf className="w-5 h-5" /><span className="font-bold text-sm uppercase tracking-wider">Carbon Footprint</span></div>
        <div className="text-4xl font-bold">{((shipment.co2e||0)/1000).toFixed(2)} <span className="text-lg font-normal opacity-80">t CO₂e</span></div>
        <div className="text-xs opacity-80 mt-2">Estimated using GLEC framework factors: {shipment.mode === 'air' ? 'Air 602 g/t·km' : 'Sea 15 g/t·km'}</div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3"><Receipt className="w-4 h-4 text-brand" /><span className="font-bold text-sm text-slate-900 dark:text-white">Invoices</span></div>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No invoices yet. They will appear here once issued.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map(i => (
              <div key={i.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <div className="font-mono font-semibold text-sm">{i.number}</div>
                  <div className="text-xs text-slate-500">Due {formatDate(i.dueDate)}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{i.currency} {i.total.toLocaleString()}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    i.status==='paid' ? 'bg-emerald-100 text-emerald-700' :
                    i.status==='overdue' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{i.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: 'violet' | 'amber' | 'blue'; children: React.ReactNode }) {
  const tones = {
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{title}</div>
      {children}
    </div>
  );
}

function PortalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220] flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-2">Loading tracking…</div>
    </div>
  );
}
