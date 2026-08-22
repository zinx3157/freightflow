'use client';

import { useMemo } from 'react';
import { Card, Badge } from './ui';
import { ProgressBar } from './Sparkline';
import type { Shipment, DocFile } from '@/lib/types';
import {
  FileText,
  FileCheck,
  FileX,
  Receipt,
  Package,
  Plane,
  Ship,
  FileSignature,
  Shield,
  Globe,
  Leaf,
  Scale,
  CheckCircle2,
  Circle,
} from 'lucide-react';

/**
 * CargoWise e-docs / Magaya compliance checklist.
 * Shows required documents per shipment with completion %.
 */
const DOC_META: Record<string, { label: string; icon: any; required: { air: boolean; sea: boolean } }> = {
  commercial_invoice: { label: 'Commercial Invoice', icon: Receipt, required: { air: true, sea: true } },
  packing_list: { label: 'Packing List', icon: Package, required: { air: true, sea: true } },
  airway_bill: { label: 'Air Waybill (AWB)', icon: Plane, required: { air: true, sea: false } },
  bill_of_lading: { label: 'Bill of Lading (B/L)', icon: Ship, required: { air: false, sea: true } },
  certificate_origin: { label: 'Certificate of Origin', icon: Globe, required: { air: false, sea: true } },
  phytosanitary: { label: 'Phytosanitary Cert.', icon: Leaf, required: { air: false, sea: false } },
  fumigation: { label: 'Fumigation Cert.', icon: Leaf, required: { air: false, sea: false } },
  insurance: { label: 'Insurance Certificate', icon: Shield, required: { air: false, sea: false } },
  customs_declaration: { label: 'Customs Declaration', icon: FileSignature, required: { air: true, sea: true } },
  export_declaration: { label: 'Export Declaration', icon: Scale, required: { air: false, sea: false } },
};

export function DocChecklist({ shipment, documents }: { shipment: Shipment; documents: DocFile[] }) {
  const presentCats = useMemo(() => new Set(documents.filter((d) => d.relatedId === shipment.id).map((d) => d.category)), [documents, shipment.id]);

  const requiredDocs = useMemo(() => {
    return Object.entries(DOC_META).filter(([, meta]) => meta.required[shipment.mode]);
  }, [shipment.mode]);

  const recommendedDocs = useMemo(() => {
    return Object.entries(DOC_META).filter(([key, meta]) => !meta.required[shipment.mode] && presentCats.has(key as any));
  }, [shipment.mode, presentCats]);

  const completed = requiredDocs.filter(([key]) => presentCats.has(key as any)).length;
  const pct = requiredDocs.length ? (completed / requiredDocs.length) * 100 : 0;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Document Compliance</h3>
        </div>
        <Badge color={pct === 100 ? 'emerald' : pct >= 66 ? 'amber' : 'rose'}>
          {completed}/{requiredDocs.length} docs
        </Badge>
      </div>

      <ProgressBar
        value={completed}
        max={requiredDocs.length || 1}
        color={pct === 100 ? '#10b981' : pct >= 66 ? '#f59e0b' : '#ef4444'}
        showValue={false}
        size="md"
        className="mb-4"
      />

      <div className="space-y-1.5">
        {requiredDocs.map(([key, meta]) => {
          const present = presentCats.has(key as any);
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                present
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'
              }`}
            >
              {present ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 font-medium">{meta.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {present ? '✓ Filed' : 'Missing'}
              </span>
            </div>
          );
        })}
      </div>

      {recommendedDocs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Additional Documents</div>
          <div className="flex flex-wrap gap-1.5">
            {recommendedDocs.map(([key, meta]) => (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <FileCheck className="w-3 h-3 text-emerald-500" />
                {meta.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function DocChecklistCompact({ shipment, documents }: { shipment: Shipment; documents: DocFile[] }) {
  const presentCats = useMemo(() => new Set(documents.filter((d) => d.relatedId === shipment.id).map((d) => d.category)), [documents, shipment.id]);
  const required = Object.entries(DOC_META).filter(([, meta]) => meta.required[shipment.mode]);
  const done = required.filter(([key]) => presentCats.has(key as any)).length;
  const pct = required.length ? (done / required.length) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className={`text-xs font-bold tabular-nums ${pct === 100 ? 'text-emerald-600' : pct >= 66 ? 'text-amber-600' : 'text-rose-600'}`}>
        {done}/{required.length}
      </div>
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct >= 66 ? '#f59e0b' : '#ef4444' }} />
      </div>
    </div>
  );
}
