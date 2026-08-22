'use client';

import { useMemo, useState } from 'react';
import { db } from '@/lib/store';
import { Card, Button, Badge, Input, Select, Field } from './ui';
import { Calculator, TrendingUp, Truck, Plane, Ship, DollarSign, Clock } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import PortAutocomplete from './PortAutocomplete';

const UNIT_LABEL: Record<string, string> = {
  kg: 'per kg',
  cbm: 'per CBM',
  container_20: 'per 20ft',
  container_40: 'per 40ft',
  container_40hc: 'per 40HC',
  truck: 'per truck',
  shipment: 'flat',
};

function calcCost(rate: number, unit: string, weight: number, vol: number) {
  switch (unit) {
    case 'kg': return rate * Math.max(weight, 1);
    case 'cbm': return rate * Math.max(vol, 0.1);
    case 'container_20': return rate * Math.max(1, Math.ceil(vol / 33));
    case 'container_40': return rate * Math.max(1, Math.ceil(vol / 67));
    case 'container_40hc': return rate * Math.max(1, Math.ceil(vol / 76));
    case 'truck': return rate;
    case 'shipment': return rate;
    default: return rate;
  }
}

export default function RateCalculator() {
  const [mode, setMode] = useState<'air' | 'sea' | 'road'>('sea');
  const [direction, setDirection] = useState<'import' | 'export' | 'both'>('export');
  const [origin, setOrigin] = useState('Toamasina');
  const [destination, setDestination] = useState('Hamburg');
  const [weight, setWeight] = useState(10000);
  const [volume, setVolume] = useState(25);
  const [pieces, setPieces] = useState(200);

  const matches = useMemo(() => {
    const d = db.getAll();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const o = norm(origin);
    const dest = norm(destination);
    const today = new Date().toISOString().slice(0, 10);
    return d.rates
      .filter((r) => r.active && r.mode === mode && (r.direction === 'both' || r.direction === direction)
        && (norm(r.origin).includes(o.slice(0, 3)) || o.includes(norm(r.origin).slice(0, 3)))
        && (norm(r.destination).includes(dest.slice(0, 3)) || dest.includes(norm(r.destination).slice(0, 3)))
        && r.validFrom <= today && r.validUntil >= today)
      .map((r) => {
        const sell = calcCost(r.sellRate, r.unit, weight, volume);
        const buy = calcCost(r.buyRate, r.unit, weight, volume);
        return { ...r, sellTotal: Math.max(r.minCharge || 0, sell), buyTotal: Math.max(r.minCharge || 0, buy) };
      })
      .sort((a, b) => a.sellTotal - b.sellTotal);
  }, [mode, direction, origin, destination, weight, volume]);

  const best = matches[0];
  const avgTransit = best ? Math.round(((best.transitDaysMin || 0) + (best.transitDaysMax || 0)) / 2) : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white">Rate Calculator</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Auto-quote from your carrier rate cards — sell vs buy margins</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="air">✈️ Air</option>
            <option value="sea">🚢 Sea</option>
            <option value="road">🚛 Road</option>
          </Select>
        </Field>
        <Field label="Direction">
          <Select value={direction} onChange={(e) => setDirection(e.target.value as any)}>
            <option value="export">Export</option>
            <option value="import">Import</option>
          </Select>
        </Field>
        <div />
        <PortAutocomplete label="Origin (POL)" value={origin} onChange={setOrigin} mode={mode === 'road' ? undefined : mode} placeholder="Origin port/city" compact />
        <PortAutocomplete label="Destination (POD)" value={destination} onChange={setDestination} mode={mode === 'road' ? undefined : mode} placeholder="Destination port/city" compact />
        <div />
        <Field label="Weight (kg)">
          <Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </Field>
        <Field label="Volume (CBM)">
          <Input type="number" step="0.1" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </Field>
        <Field label="Pieces">
          <Input type="number" value={pieces} onChange={(e) => setPieces(Number(e.target.value))} />
        </Field>
      </div>

      {best ? (
        <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-900/40 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">Best rate</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{best.carrier}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{best.origin} → {best.destination}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(best.sellTotal, best.currency)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" /> {avgTransit} days transit
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-2 bg-white/70 dark:bg-slate-900/40 rounded">
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Buy cost</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatMoney(best.buyTotal, best.currency)}</div>
            </div>
            <div className="p-2 bg-white/70 dark:bg-slate-900/40 rounded">
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />Sell price</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{formatMoney(best.sellTotal, best.currency)}</div>
            </div>
            <div className="p-2 bg-white/70 dark:bg-slate-900/40 rounded">
              <div className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Margin</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                {formatMoney(best.sellTotal - best.buyTotal, best.currency)} ({best.sellTotal > 0 ? Math.round((best.sellTotal - best.buyTotal) / best.sellTotal * 100) : 0}%)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 mb-4">
          No matching rate cards for this lane yet. Add rates to enable one-click quoting.
        </div>
      )}

      {matches.length > 1 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">All matching rates ({matches.length})</div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {matches.slice(1).map((r) => {
              const margin = r.sellTotal > 0 ? Math.round((r.sellTotal - r.buyTotal) / r.sellTotal * 100) : 0;
              const ModeIcon = r.mode === 'air' ? Plane : r.mode === 'sea' ? Ship : Truck;
              return (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <ModeIcon className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.carrier}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{r.frequency || ''}</div>
                  </div>
                  <Badge color={margin >= 20 ? 'emerald' : margin >= 10 ? 'amber' : 'rose'}>{margin}% margin</Badge>
                  <div className="text-sm font-bold text-slate-900 dark:text-white w-20 text-right">{formatMoney(r.sellTotal, r.currency)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export { UNIT_LABEL };
