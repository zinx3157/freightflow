'use client';

import { useState } from 'react';
import { Card, Button, Input, Select, Field, Badge } from './ui';
import { fetchLiveFx, fetchLiveRoute, estimateLiveFreightIndex } from '@/lib/liveApis';
import { Activity, RefreshCw, Wifi, AlertTriangle } from 'lucide-react';

export default function LiveRatesPanel() {
  const [mode, setMode] = useState<'air'|'sea'|'road'>('sea');
  const [origin, setOrigin] = useState('Toamasina, Madagascar');
  const [destination, setDestination] = useState('Port Louis, Mauritius');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const [fx, route] = await Promise.all([
        fetchLiveFx('USD', ['EUR', 'GBP', 'MGA']),
        fetchLiveRoute(origin, destination).catch(() => null),
      ]);
      const estimate = estimateLiveFreightIndex(mode, route?.distanceKm || 0, fx.rates.EUR || 0.92);
      setResult({ fx, route, estimate, at: new Date().toLocaleString() });
    } catch (e: any) {
      setError(e?.message || 'Live API unavailable');
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-4 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Wifi className="w-4 h-4 text-emerald-600"/> Free Live Rate APIs</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">No-key FX + OSM route distance feed for spot-rate sanity checks.</p>
        </div>
        <Badge color="emerald">LIVE</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
        <Field label="Mode"><Select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="sea">Sea</option><option value="air">Air</option><option value="road">Road</option></Select></Field>
        <div className="sm:col-span-1"><Field label="Origin"><Input value={origin} onChange={e=>setOrigin(e.target.value)} /></Field></div>
        <div className="sm:col-span-1"><Field label="Destination"><Input value={destination} onChange={e=>setDestination(e.target.value)} /></Field></div>
        <div className="flex items-end"><Button onClick={refresh} disabled={loading} className="w-full"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/> Fetch</Button></div>
      </div>
      {error && <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {error}. Using local rate cards as fallback.</div>}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <Metric label="Distance" value={result.route ? `${result.route.distanceKm.toLocaleString()} km` : 'n/a'} />
          <Metric label="FX USD→EUR" value={(result.fx.rates.EUR || 0).toFixed(4)} />
          <Metric label="Live buy est." value={`USD ${result.estimate.buyUsd.toLocaleString()}`} />
          <Metric label="Sell guide" value={`USD ${result.estimate.sellUsd.toLocaleString()}`} />
          <div className="col-span-2 sm:col-span-4 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Activity className="w-3 h-3"/> {result.estimate.confidence} · {result.fx.source}{result.route ? ` · ${result.route.source}` : ''} · {result.at}</div>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2"><div className="text-[10px] uppercase font-bold text-slate-400">{label}</div><div className="font-bold text-slate-900 dark:text-white">{value}</div></div>;
}
