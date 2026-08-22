'use client';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Button, Input, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { DocFile } from '@/lib/types';
import { Download, Eye, FileText, FolderOpen, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { formatBytes } from '@/lib/dgr';

export default function DocumentsLibraryPage() {
  const [data, setData] = useState<ReturnType<typeof db.getAll> | null>(null);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<DocFile | null>(null);
  const refresh = () => setData(db.getAll());
  useEffect(() => { refresh(); window.addEventListener('ff:data-changed', refresh); return () => window.removeEventListener('ff:data-changed', refresh); }, []);

  const related = (d: DocFile) => {
    if (!data) return { ref: d.relatedId, party: '' };
    if (d.relatedType === 'shipment') {
      const s = data.shipments.find(x => x.id === d.relatedId);
      return { ref: s?.reference || d.relatedId, party: [s?.customerName, s?.origin, s?.destination].filter(Boolean).join(' · ') };
    }
    if (d.relatedType === 'quote') { const x = data.quotes.find(q => q.id === d.relatedId); return { ref: x?.number || d.relatedId, party: x?.customerName || '' }; }
    if (d.relatedType === 'invoice') { const x = data.invoices.find(i => i.id === d.relatedId); return { ref: x?.number || d.relatedId, party: x?.customerName || '' }; }
    const t = data.trucking.find(x => x.id === d.relatedId); return { ref: t?.reference || d.relatedId, party: t?.driverName || '' };
  };

  const docs = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.docs.filter(d => {
      const r = related(d);
      const hay = [d.id, d.name, d.category, d.tags?.join(' '), r.ref, r.party].join(' ').toLowerCase();
      return !needle || hay.includes(needle);
    });
  }, [data, q]);

  const download = (d: DocFile) => { if (!d.dataUrl) return alert('This document has metadata only. Generate/upload it again to preview/download the binary.'); const a = document.createElement('a'); a.href = d.dataUrl; a.download = d.name; a.click(); };

  return (
    <PageShell title="Document Library" subtitle="Find docs by file ref, quote ref, shipment ref, shipper or consignee name.">
      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search file ref, quote ref, shipper, consignee, invoice, document name…" className="pl-9" />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2"><FolderOpen className="w-5 h-5 text-brand"/><b>{docs.length}</b><span className="text-sm text-slate-500">document(s)</span></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {docs.map(d => { const r = related(d); return (
            <div key={d.id} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><FileText className="w-5 h-5 text-brand"/></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{d.name}</div>
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1"><span>File ref: {d.id}</span><span>Ref: {r.ref}</span><span>{r.party}</span><span>{formatBytes(d.sizeBytes)}</span><span>{formatDateTime(d.uploadedAt)}</span></div>
              </div>
              <Badge color="blue">{d.relatedType}</Badge>
              <Button size="sm" variant="outline" onClick={()=>setPreview(d)}><Eye className="w-3 h-3"/> Preview</Button>
              <Button size="sm" variant="outline" onClick={()=>download(d)}><Download className="w-3 h-3"/> Download</Button>
            </div>
          ); })}
          {docs.length === 0 && <div className="p-10 text-center text-slate-500">No documents found. Generate docs from shipments/quotes/invoices or upload files in a document panel.</div>}
        </div>
      </Card>
      {preview && <Preview doc={preview} onClose={()=>setPreview(null)} onDownload={()=>download(preview)} />}
    </PageShell>
  );
}

function Preview({ doc, onClose, onDownload }: { doc: DocFile; onClose: () => void; onDownload: () => void }) {
  const can = !!doc.dataUrl && (doc.mimeType.includes('pdf') || doc.mimeType.startsWith('image/') || doc.mimeType.startsWith('text/'));
  return <div className="fixed inset-0 z-[120] bg-black/60 p-3 flex items-center justify-center" onClick={onClose}><div className="w-full max-w-5xl h-[88dvh] rounded-2xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col" onClick={e=>e.stopPropagation()}><div className="p-3 border-b flex items-center gap-2"><b className="flex-1 truncate">{doc.name}</b><Button size="sm" variant="outline" onClick={onDownload}>Download</Button><button onClick={onClose} className="w-9 h-9 rounded hover:bg-slate-100 dark:hover:bg-slate-800">×</button></div><div className="flex-1 bg-slate-100 dark:bg-slate-900">{can ? (doc.mimeType.startsWith('image/') ? <img src={doc.dataUrl} className="max-w-full max-h-full mx-auto" alt={doc.name}/> : <iframe src={doc.dataUrl} title={doc.name} className="w-full h-full"/>) : <div className="h-full grid place-items-center text-slate-500">No browser preview available.</div>}</div></div></div>;
}
