'use client';

import { useEffect, useState, useRef } from 'react';
import type { DocFile, DocCategory } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Button, Badge, Select } from './ui';
import { FileText, UploadCloud, Download, Trash2, File, FileSpreadsheet, FileImage, Package, FileCheck, ShieldCheck, Scroll, Award, FileSignature, Eye } from 'lucide-react';
import { formatBytes } from '@/lib/dgr';
import { generateShipmentBL, generateInvoicePDF, generateQuotePDF } from '@/lib/documents';
import { formatDateTime } from '@/lib/utils';

interface Props {
  relatedType: DocFile['relatedType'];
  relatedId: string;
  relatedRef?: string;
  relatedObject?: any; // shipment/invoice/quote for generating PDFs
}

const CATEGORIES: { value: DocCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'commercial_invoice', label: 'Commercial Invoice', icon: <FileText className="w-4 h-4" />, color: 'blue' },
  { value: 'packing_list', label: 'Packing List', icon: <Package className="w-4 h-4" />, color: 'slate' },
  { value: 'bill_of_lading', label: 'Bill of Lading', icon: <FileSignature className="w-4 h-4" />, color: 'indigo' },
  { value: 'airway_bill', label: 'Air Waybill', icon: <FileSignature className="w-4 h-4" />, color: 'indigo' },
  { value: 'certificate_origin', label: 'Certificate of Origin', icon: <Award className="w-4 h-4" />, color: 'amber' },
  { value: 'phytosanitary', label: 'Phytosanitary Cert.', icon: <ShieldCheck className="w-4 h-4" />, color: 'emerald' },
  { value: 'fumigation', label: 'Fumigation Cert.', icon: <ShieldCheck className="w-4 h-4" />, color: 'emerald' },
  { value: 'insurance', label: 'Insurance Cert.', icon: <FileCheck className="w-4 h-4" />, color: 'violet' },
  { value: 'customs_declaration', label: 'Customs Declaration', icon: <Scroll className="w-4 h-4" />, color: 'orange' },
  { value: 'import_permit', label: 'Import Permit', icon: <FileCheck className="w-4 h-4" />, color: 'orange' },
  { value: 'export_declaration', label: 'Export Declaration', icon: <FileCheck className="w-4 h-4" />, color: 'orange' },
  { value: 'dgd', label: 'Dangerous Goods Decl.', icon: <FileCheck className="w-4 h-4" />, color: 'rose' },
  { value: 'sds', label: 'Safety Data Sheet', icon: <FileSpreadsheet className="w-4 h-4" />, color: 'rose' },
  { value: 'pod', label: 'Proof of Delivery', icon: <FileCheck className="w-4 h-4" />, color: 'emerald' },
  { value: 'invoice_attachment', label: 'Invoice', icon: <FileText className="w-4 h-4" />, color: 'emerald' },
  { value: 'quote_attachment', label: 'Quotation', icon: <FileText className="w-4 h-4" />, color: 'blue' },
  { value: 'other', label: 'Other Document', icon: <File className="w-4 h-4" />, color: 'slate' },
];

function catMeta(cat: DocCategory) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

function fileIcon(mime: string) {
  if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
  if (mime.includes('sheet') || mime.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  if (mime.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

export default function DocumentsManager({ relatedType, relatedId, relatedRef, relatedObject }: Props) {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocCategory>('other');
  const [preview, setPreview] = useState<DocFile | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = () => setDocs(db.docsFor(relatedType, relatedId));
  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener('ff:data-changed', on);
    return () => window.removeEventListener('ff:data-changed', on);
  }, [relatedType, relatedId]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    const arr = Array.from(files);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        db.addDoc({
          name: f.name,
          category: uploadCategory,
          sizeBytes: f.size,
          mimeType: f.type || 'application/octet-stream',
          dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          relatedType,
          relatedId,
          uploadedBy: 'Current User',
        });
        refresh();
      };
      reader.readAsDataURL(f);
    });
    setTimeout(() => setUploading(false), 500);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadDoc = (d: DocFile) => {
    if (d.dataUrl) {
      const a = document.createElement('a');
      a.href = d.dataUrl;
      a.download = d.name;
      document.body.appendChild(a); a.click(); a.remove();
    } else {
      alert(`In production, "${d.name}" would download from cloud storage. In this demo the file metadata is tracked but the binary content is only stored when uploaded/generated here.`);
    }
  };

  const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  const autoGenerate = async (type: 'bl' | 'invoice' | 'quote') => {
    if (!relatedObject) return;
    let blob: Blob | null = null;
    let name = `${relatedRef || 'document'}.pdf`;
    let category: DocCategory = 'other';
    if (type === 'bl' && relatedType === 'shipment') {
      blob = generateShipmentBL(relatedObject);
      name = `${relatedRef}_${relatedObject.mode === 'air' ? 'AWB' : 'BL'}.pdf`;
      category = relatedObject.mode === 'air' ? 'airway_bill' : 'bill_of_lading';
    } else if (type === 'invoice' && relatedType === 'invoice') {
      blob = generateInvoicePDF(relatedObject); name = `${relatedRef}.pdf`; category = 'invoice_attachment';
    } else if (type === 'quote' && relatedType === 'quote') {
      blob = generateQuotePDF(relatedObject); name = `${relatedRef}.pdf`; category = 'quote_attachment';
    }
    if (!blob) return;
    const dataUrl = await blobToDataUrl(blob);
    const doc = db.addDoc({ name, category, sizeBytes: blob.size, mimeType: 'application/pdf', dataUrl, relatedType, relatedId, uploadedBy: 'FreightFlow Generator', tags: [relatedRef || '', type].filter(Boolean) });
    refresh();
    setPreview(doc);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Documents</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upload, generate & manage shipping documents</p>
          </div>
        </div>
        <Badge color="blue">{docs.length} file{docs.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Quick generators for shipments/invoices/quotes */}
      {relatedObject && (relatedType === 'shipment' || relatedType === 'invoice' || relatedType === 'quote') && (
        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-center mr-2">Generate:</span>
          {relatedType === 'shipment' && (
            <Button size="sm" variant="outline" onClick={() => autoGenerate('bl')}><Download className="w-3 h-3" /> {relatedObject.mode === 'air' ? 'AWB PDF' : 'B/L PDF'}</Button>
          )}
          {relatedType === 'invoice' && <Button size="sm" variant="outline" onClick={() => autoGenerate('invoice')}><Download className="w-3 h-3" /> Invoice PDF</Button>}
          {relatedType === 'quote' && <Button size="sm" variant="outline" onClick={() => autoGenerate('quote')}><Download className="w-3 h-3" /> Quote PDF</Button>}
        </div>
      )}

      {/* Uploader */}
      <div className="mb-4 p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocCategory)} className="flex-1 min-w-[180px]">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <UploadCloud className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">PDF, Office docs, images — drag/drop coming next. Max ~5MB per file (stored locally in demo).</p>
      </div>

      {/* Document checklist */}
      {relatedType === 'shipment' && <ChecklistProgress docs={docs} />}

      {/* Files */}
      {docs.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
          No documents attached yet. Upload commercial invoice, packing list, B/L, certificates — all version-tracked.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {docs.map((d) => {
            const m = catMeta(d.category);
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand transition-colors">
                <div className="w-9 h-9 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {fileIcon(d.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{d.name}</span>
                    <Badge color={m.color as any}>{m.label}</Badge>
                    {d.version && d.version > 1 && <Badge color="slate">v{d.version}</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap mt-0.5">
                    <span>{formatBytes(d.sizeBytes)}</span>
                    <span>by {d.uploadedBy}</span>
                    <span>{formatDateTime(d.uploadedAt)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setPreview(d)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Preview"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => downloadDoc(d)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" title="Download"><Download className="w-4 h-4" /></button>
                  <button onClick={() => { if (confirm('Delete document?')) { db.deleteDoc(d.id); refresh(); } }} className="p-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {preview && <DocPreviewModal doc={preview} onClose={() => setPreview(null)} onDownload={() => downloadDoc(preview)} />}
    </Card>
  );
}

function DocPreviewModal({ doc, onClose, onDownload }: { doc: DocFile; onClose: () => void; onDownload: () => void }) {
  const canPreview = !!doc.dataUrl && (doc.mimeType.includes('pdf') || doc.mimeType.startsWith('image/') || doc.mimeType.startsWith('text/'));
  return (
    <div className="fixed inset-0 z-[120] bg-black/60 p-3 sm:p-6 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-5xl h-[88dvh] bg-white dark:bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex-1">{doc.name}</div>
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="w-3 h-3"/> Download</Button>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
        </div>
        <div className="flex-1 bg-slate-100 dark:bg-slate-900">
          {canPreview ? (
            doc.mimeType.startsWith('image/') ? <img src={doc.dataUrl} alt={doc.name} className="max-w-full max-h-full mx-auto object-contain" /> :
            <iframe src={doc.dataUrl} title={doc.name} className="w-full h-full" />
          ) : (
            <div className="h-full flex items-center justify-center text-center p-6 text-slate-500"><div><File className="w-10 h-10 mx-auto mb-2"/>Preview is not available for this file type.<br/>Use Download to open it locally.</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistProgress({ docs }: { docs: DocFile[] }) {
  // Required core docs for an international shipment
  const required = ['commercial_invoice', 'packing_list'] as const;
  const modeAware: DocCategory[] = ['bill_of_lading', 'airway_bill'];
  const cats = new Set(docs.map((d) => d.category));
  const haveRequired = required.filter((c) => cats.has(c)).length;
  return (
    <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-2 mb-2">
        <FileCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Document checklist</span>
        <span className="ml-auto text-xs font-bold text-amber-800 dark:text-amber-300">{haveRequired + (modeAware.some((c) => cats.has(c)) ? 1 : 0)}/{required.length + 1}</span>
      </div>
      <div className="h-1.5 bg-amber-200/50 dark:bg-amber-900/50 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500" style={{ width: `${((haveRequired + (modeAware.some((c) => cats.has(c)) ? 1 : 0)) / (required.length + 1)) * 100}%` }} />
      </div>
    </div>
  );
}
