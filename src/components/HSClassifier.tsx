'use client';

import React, { useMemo, useState } from 'react';
import { classifyCommodity, estimateDuty, HSCodeEntry } from '@/lib/hsCodes';
import { Button, Badge, Input, Card } from './ui';
import { Search, AlertTriangle, Snowflake, Skull, CheckCircle2, Loader2, Scale, FileDigit } from 'lucide-react';
import HSOnlineAccess from './HSOnlineAccess';

interface Props {
  commodity: string;
  destination?: string;
  customsValue?: number;
  onSelect: (selection: { hsCode: string; hsDescription: string; dutyRate: number; dutyEstimate: number }) => void;
  initialHsCode?: string;
}

export default function HSClassifier({ commodity, destination = '', customsValue = 0, onSelect, initialHsCode }: Props) {
  const [query, setQuery] = useState(commodity || '');
  const [picking, setPicking] = useState(false);
  const [suggestions, setSuggestions] = useState<HSCodeEntry[]>([]);
  const [selected, setSelected] = useState<HSCodeEntry | null>(null);

  const run = () => {
    setPicking(true);
    setTimeout(() => {
      const r = classifyCommodity(query);
      setSuggestions(r);
      setPicking(false);
    }, 450);
  };

  const pick = (e: HSCodeEntry) => {
    setSelected(e);
    const { rate, amount } = estimateDuty(e, destination, customsValue);
    onSelect({ hsCode: e.hs6, hsDescription: e.description, dutyRate: rate, dutyEstimate: amount });
  };

  const confidenceOf = (e: HSCodeEntry, idx: number) => {
    const q = query.toLowerCase();
    if (e.keywords.some((k) => k.toLowerCase() === q)) return { label: 'High', color: 'emerald' as const, pct: 95 };
    if (e.description.toLowerCase().includes(q) || e.keywords.some((k) => q.includes(k.toLowerCase()))) return { label: 'Medium', color: 'amber' as const, pct: idx === 0 ? 75 : 60 };
    return { label: 'Low', color: 'slate' as const, pct: 40 };
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center">
            <FileDigit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">AI Tariff Classifier</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">HS-6 suggestions + duty estimate for destination</p>
          </div>
        </div>
        <Badge color="violet">BETA</Badge>
      </div>

      {initialHsCode && !selected && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-900 dark:text-emerald-200">Already classified: {initialHsCode}</div>
            <div className="text-emerald-700 dark:text-emerald-300 text-xs">Re-run below to change.</div>
          </div>
        </div>
      )}

      {selected && (
        <div className="mb-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">Selected: {selected.hs6} — {selected.description}</span>
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            Estimated duty ({destination || 'generic'}): <b>{estimateDuty(selected, destination, customsValue).rate}%</b>
            {customsValue > 0 && <> ≈ <b>{customsValue.toLocaleString()} × {estimateDuty(selected, destination, customsValue).rate}% = {estimateDuty(selected, destination, customsValue).amount.toLocaleString()}</b></>}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. vanilla beans, smartphones, cotton t-shirts" onKeyDown={(e) => e.key === 'Enter' && run()} />
        <Button onClick={run} disabled={picking || query.length < 2}>
          {picking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Classify
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
          {suggestions.map((s, idx) => {
            const conf = confidenceOf(s, idx);
            const duty = estimateDuty(s, destination, customsValue);
            return (
              <button
                key={s.hs6}
                onClick={() => pick(s)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand hover:bg-brand/5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{s.hs6}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{s.description}</span>
                      <Badge color={conf.color as any}>{conf.label} match</Badge>
                      {s.restricted && <Badge color="amber"><AlertTriangle className="w-3 h-3" />Restricted</Badge>}
                      {s.perishable && <Badge color="blue"><Snowflake className="w-3 h-3" />Cold chain</Badge>}
                      {s.dangerous && <Badge color="rose"><Skull className="w-3 h-3" />DGR</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Scale className="w-3 h-3" />{s.section}</span>
                      <span>Duty ({destination || 'avg'}): <b className="text-slate-700 dark:text-slate-300">{duty.rate}%</b></span>
                      {customsValue > 0 && <span>≈ <b className="text-slate-700 dark:text-slate-300">{duty.amount.toLocaleString()}</b></span>}
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${conf.color === 'emerald' ? 'bg-emerald-500' : conf.color === 'amber' ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${conf.pct}%` }} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
        Classifier uses 30+ common HS codes relevant to Madagascar/IO trade. Always verify with a licensed customs broker before declaration.
      </p>
      <div className="mt-4">
        <HSOnlineAccess query={query} hsCode={selected?.hs6 || initialHsCode || ''} />
      </div>
    </Card>
  );
}
