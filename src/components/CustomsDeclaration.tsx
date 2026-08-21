'use client';

import { useEffect, useState } from 'react';
import type { CustomsDeclaration, Shipment, CustomsDecStatus } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Button, Badge, Input, Field } from './ui';
import { FileCheck, Send, CheckCircle2, AlertTriangle, Clock, Download, Plus, Trash2, FileCode } from 'lucide-react';
import { formatDate, formatMoney, titleCase } from '@/lib/utils';

const STAGES: { key: CustomsDecStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'draft', label: 'Draft', icon: <Clock className="w-3.5 h-3.5" />, color: 'slate' },
  { key: 'submitted', label: 'Submitted', icon: <Send className="w-3.5 h-3.5" />, color: 'blue' },
  { key: 'accepted', label: 'Accepted (MRN)', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'indigo' },
  { key: 'inspection', label: 'Inspection', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'amber' },
  { key: 'assessed', label: 'Assessed', icon: <FileCheck className="w-3.5 h-3.5" />, color: 'orange' },
  { key: 'duties_paid', label: 'Duties Paid', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'violet' },
  { key: 'released', label: 'Released', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'emerald' },
];

export default function CustomsDeclarationPanel({ shipment }: { shipment: Shipment }) {
  const [dec, setDec] = useState<CustomsDeclaration | null>(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = () => setDec(db.customsForShipment(shipment.id));
  useEffect(() => {
    refresh();
    window.addEventListener('ff:data-changed', refresh);
    return () => window.removeEventListener('ff:data-changed', refresh);
  }, [shipment.id]);

  const submitToAsycuda = () => {
    if (!dec) return;
    db.advanceCustomsDeclaration(dec.id, 'submitted', 'SAD transmitted to ASYCUDA World via EDI', 'SYSTEM');
    setTimeout(() => {
      const d = db.customsForShipment(shipment.id);
      if (d && d.status === 'submitted') {
        db.advanceCustomsDeclaration(d.id, 'accepted', 'MRN assigned, declaration accepted by Customs', 'SYSTEM');
        // 30% chance of inspection
        if (Math.random() < 0.3) {
          setTimeout(() => db.advanceCustomsDeclaration(d.id, 'inspection', 'Red channel — physical inspection selected', 'ASYCUDA'), 800);
        } else {
          setTimeout(() => db.advanceCustomsDeclaration(d.id, 'assessed', 'Blue/green channel — duties assessed', 'Customs Officer'), 1500);
        }
      }
      refresh();
    }, 1500);
    refresh();
  };

  const markPaid = () => {
    if (!dec) return;
    db.advanceCustomsDeclaration(dec.id, 'duties_paid', `Duties paid: ${formatMoney(dec.totalDuties + dec.totalVAT + dec.totalOtherTaxes, dec.currency)}`, 'Cashier');
    setTimeout(() => {
      db.advanceCustomsDeclaration(dec.id, 'released', 'Goods released by Customs — green channel exit', 'Customs Officer');
      refresh();
    }, 1200);
    refresh();
  };

  if (!dec && !showNew) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Customs Declaration (SAD/ASYCUDA)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Single Administrative Document — modeled after ASYCUDA World used at Toamasina/Ivato</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> Prepare SAD</Button>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center">
          No declaration prepared for this shipment yet. CargoWise requires expensive customs adapters; FreightFlow has a built-in ASYCUDA-compatible SAD workflow.
        </div>
      </Card>
    );
  }

  if (showNew && !dec) {
    return <PrepareSadForm shipment={shipment} onCancel={() => setShowNew(false)} onCreated={() => { setShowNew(false); refresh(); }} />;
  }

  if (!dec) return null;

  const currentIdx = STAGES.findIndex((s) => s.key === dec.status);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              SAD {dec.number} <span className="text-slate-400 font-normal">·</span>{' '}
              <span className="font-mono text-sm">{dec.mrns || 'MRN pending'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{dec.type} · {dec.officeOfEntry} · Declarant {dec.declarantName} ({dec.declarantCode})</p>
          </div>
        </div>
        <Badge color={STAGES[currentIdx]?.color as any}>
          {STAGES[currentIdx]?.icon} {titleCase(dec.status)}
        </Badge>
      </div>

      {/* Progress stepper */}
      <div className="mb-5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-[520px]">
          {STAGES.map((st, i) => {
            const done = i <= currentIdx;
            return (
              <div key={st.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                    done ? `bg-brand text-white border-brand` : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-600'
                  }`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <div className={`mt-1 text-[10px] font-semibold uppercase text-center ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{st.label}</div>
                </div>
                {i < STAGES.length - 1 && <div className={`h-0.5 flex-1 ${i < currentIdx ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financials */}
      {(dec.status === 'assessed' || dec.status === 'duties_paid' || dec.status === 'released') && (
        <div className="mb-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <h5 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">Duty & Tax Assessment</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-amber-700 dark:text-amber-300">CIF Value</div><div className="font-bold text-slate-900 dark:text-white">{formatMoney(dec.cifValue, dec.currency)}</div></div>
            <div><div className="text-xs text-amber-700 dark:text-amber-300">Import Duty</div><div className="font-bold text-slate-900 dark:text-white">{formatMoney(dec.totalDuties, dec.currency)}</div></div>
            <div><div className="text-xs text-amber-700 dark:text-amber-300">VAT (20%)</div><div className="font-bold text-slate-900 dark:text-white">{formatMoney(dec.totalVAT, dec.currency)}</div></div>
            <div><div className="text-xs text-amber-700 dark:text-amber-300">Other taxes</div><div className="font-bold text-slate-900 dark:text-white">{formatMoney(dec.totalOtherTaxes, dec.currency)}</div></div>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between items-center">
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Total payable to Customs</div>
            <div className="text-lg font-bold text-rose-600">{formatMoney(dec.totalDuties + dec.totalVAT + dec.totalOtherTaxes, dec.currency)}</div>
          </div>
          {dec.status === 'assessed' && (
            <Button className="mt-3 w-full" onClick={markPaid}><CheckCircle2 className="w-4 h-4" /> Record Duty Payment & Request Release</Button>
          )}
          {dec.status === 'released' && <Badge color="emerald" className="mt-3">Goods released — POD-ready</Badge>}
        </div>
      )}

      {/* HS items */}
      <div className="mb-4">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tariff lines</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-slate-500">
                <th className="px-2 py-2 text-left font-semibold">HS Code</th>
                <th className="px-2 py-2 text-left font-semibold">Description</th>
                <th className="px-2 py-2 text-right font-semibold">Net (kg)</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Value</th>
                <th className="px-2 py-2 text-right font-semibold">Duty %</th>
                <th className="px-2 py-2 text-right font-semibold">VAT %</th>
              </tr>
            </thead>
            <tbody>
              {dec.hsItems.map((it, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-2 py-2 font-mono font-semibold text-slate-900 dark:text-white">{it.hsCode}</td>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{it.description}</td>
                  <td className="px-2 py-2 text-right">{it.netWeight.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right">{it.quantity}</td>
                  <td className="px-2 py-2 text-right font-semibold">{formatMoney(it.value, dec.currency)}</td>
                  <td className="px-2 py-2 text-right text-rose-600 font-semibold">{it.dutyRate}%</td>
                  <td className="px-2 py-2 text-right">{it.vatRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Customs event log</h5>
        <div className="space-y-2">
          {dec.events.map((e, i) => (
            <div key={i} className="flex gap-3 p-2 rounded-md bg-slate-50 dark:bg-slate-800/40 text-sm">
              <div className={`mt-0.5 w-2 h-2 rounded-full ${i === dec.events.length - 1 ? 'bg-brand animate-pulse' : 'bg-slate-300'}`} />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white">{titleCase(e.stage)} {e.officer ? <span className="text-xs text-slate-500">· {e.officer}</span> : null}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{e.message}</div>
                <div className="text-[11px] text-slate-400">{formatDate(e.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {dec.status === 'draft' && <Button onClick={submitToAsycuda}><Send className="w-4 h-4" /> Lodge to ASYCUDA World (EDI)</Button>}
        {dec.status === 'accepted' && (
          <Button variant="outline" onClick={() => { db.advanceCustomsDeclaration(dec.id, 'assessed', 'Risk analysis: green channel — auto-assessed', 'ASYCUDA'); refresh(); }}>
            Simulate green channel
          </Button>
        )}
        <Button variant="outline" onClick={() => {
          const xml = db.generateSadXml(dec.id);
          const blob = new Blob([xml], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `SAD-${dec.number}.xml`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }}><FileCode className="w-4 h-4" /> Download SAD XML (UNeDocs)</Button>
        <Button variant="outline" onClick={() => {
          // Download a human-readable copy
          const txt = `ASYCUDA SAD DECLARATION\n========================\nNumber: ${dec.number}\nType: ${dec.type}\nStatus: ${dec.status}\nDeclarant: ${dec.declarantName} (${dec.declarantCode})\nImporter/Exporter: ${dec.importerExporter}\nOffice: ${dec.officeOfEntry}\nConveyance: ${dec.conveyanceRef} (${dec.transportMode})\nCountry of origin: ${dec.countryOfOrigin}\nCountry of destination: ${dec.countryOfDestination}\nPackages: ${dec.packages}\nGross weight: ${dec.grossWeight} kg\nCIF value: ${dec.currency} ${dec.cifValue.toLocaleString()}\nFreight: ${dec.freightValue}  Insurance: ${dec.insuranceValue}\nImport duty: ${dec.totalDuties}  VAT: ${dec.totalVAT}  Other: ${dec.totalOtherTaxes}\nTotal payable: ${dec.totalDuties + dec.totalVAT + dec.totalOtherTaxes}\nMRN: ${dec.mrns || '(pending)'}\n\n--- Tariff lines ---\n${dec.hsItems.map((it, i) => `${i+1}. HS ${it.hsCode}  ${it.description}  Net ${it.netWeight}kg  Value ${it.value}  Duty ${it.dutyRate}% = ${it.dutyAmount}  VAT ${it.vatRate}% = ${it.vatAmount}`).join('\n')}\n\n--- Event log ---\n${dec.events.map(e => `${e.at}  [${e.stage}]  ${e.message}${e.officer ? '  ('+e.officer+')' : ''}`).join('\n')}\n`;
          const blob = new Blob([txt], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `SAD-${dec.number}.txt`;
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }}><Download className="w-4 h-4" /> Download summary (.txt)</Button>
      </div>
    </Card>
  );
}

function PrepareSadForm({ shipment, onCancel, onCreated }: { shipment: Shipment; onCancel: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'IM4' | 'EX1'>(shipment.direction === 'import' ? 'IM4' : 'EX1');
  const [hsCode, setHsCode] = useState(shipment.hsCode || '');
  const [hsDesc, setHsDesc] = useState(shipment.hsDescription || shipment.commodity);
  const [dutyRate, setDutyRate] = useState<number>(shipment.dutyRate ?? (shipment.direction === 'import' ? 20 : 0));
  const [vatRate, setVatRate] = useState(shipment.direction === 'import' ? 20 : 0);
  const [freight, setFreight] = useState(shipment.freightCost ?? Math.round(shipment.totalAmount * 0.65));
  const [insurance, setInsurance] = useState(Math.round(shipment.totalAmount * 0.02));

  const cif = shipment.totalAmount + freight + insurance;
  const dutyAmt = Math.round(cif * (dutyRate / 100));
  const vatBase = cif + dutyAmt;
  const vatAmt = Math.round(vatBase * (vatRate / 100));
  const other = shipment.direction === 'import' ? Math.round(cif * 0.01) : 0; // 1% misc processing

  const submit = () => {
    db.createCustomsDeclaration({
      shipmentId: shipment.id,
      type,
      status: 'draft',
      declarantName: 'Lina Ratsimba',
      declarantCode: 'MG-BRO-00142',
      importerExporter: shipment.customerName,
      incoterm: shipment.incoterm,
      currency: shipment.currency,
      cifValue: cif,
      freightValue: freight,
      insuranceValue: insurance,
      totalDuties: dutyAmt,
      totalVAT: vatAmt,
      totalOtherTaxes: other,
      hsItems: [{
        hsCode, description: hsDesc,
        netWeight: Math.round(shipment.weight * 0.97),
        grossWeight: shipment.weight,
        quantity: shipment.pieces,
        value: shipment.totalAmount,
        dutyRate, vatRate, dutyAmount: dutyAmt, vatAmount: vatAmt,
      }],
      officeOfEntry: shipment.portOfLoading === 'TNR' || shipment.portOfDischarge === 'TNR' ? 'Ivato Airport Customs' : 'Toamasina Customs',
      transportMode: shipment.mode,
      conveyanceRef: shipment.vesselOrFlight,
      packages: shipment.pieces,
      grossWeight: shipment.weight,
      countryOfOrigin: shipment.direction === 'import' ? 'CN' : 'MG',
      countryOfExport: shipment.direction === 'import' ? 'CN' : 'MG',
      countryOfDestination: shipment.direction === 'import' ? 'MG' : 'DE',
    });
    onCreated();
  };

  return (
    <Card className="p-5 border-2 border-brand/30">
      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Prepare SAD Declaration</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Fill in the Single Administrative Document. HS code & duty are pre-filled from the classifier.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Declaration type">
          <select className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="IM4">IM4 — Import for home use</option>
            <option value="EX1">EX1 — Export outright</option>
            <option value="IM7">IM7 — Warehousing</option>
            <option value="TR">TR — Transit (T1)</option>
          </select>
        </Field>
        <Field label="Customs office"><Input value={shipment.portOfLoading === 'TNR' || shipment.portOfDischarge === 'TNR' ? 'Ivato Airport Customs' : 'Toamasina Port Customs'} readOnly /></Field>
        <Field label="HS Code"><Input value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="e.g. 0905.10" /></Field>
        <Field label="Duty rate %"><Input type="number" value={dutyRate} onChange={(e) => setDutyRate(Number(e.target.value))} /></Field>
        <div className="md:col-span-2"><Field label="Goods description"><Input value={hsDesc} onChange={(e) => setHsDesc(e.target.value)} /></Field></div>
        <Field label="Freight (USD)"><Input type="number" value={freight} onChange={(e) => setFreight(Number(e.target.value))} /></Field>
        <Field label="Insurance (USD)"><Input type="number" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))} /></Field>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-sm">
        <div className="font-semibold text-slate-900 dark:text-white mb-2">Assessment preview</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><div className="text-slate-500">CIF Value</div><div className="font-bold">{formatMoney(cif, shipment.currency)}</div></div>
          <div><div className="text-slate-500">Duty ({dutyRate}%)</div><div className="font-bold text-rose-600">{formatMoney(dutyAmt, shipment.currency)}</div></div>
          <div><div className="text-slate-500">VAT ({vatRate}%)</div><div className="font-bold text-rose-600">{formatMoney(vatAmt, shipment.currency)}</div></div>
          <div><div className="text-slate-500">Other</div><div className="font-bold">{formatMoney(other, shipment.currency)}</div></div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
          <span className="font-semibold">Total payable</span>
          <span className="font-bold text-rose-600">{formatMoney(dutyAmt + vatAmt + other, shipment.currency)}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}><FileCheck className="w-4 h-4" /> Create Draft SAD</Button>
      </div>
    </Card>
  );
}
