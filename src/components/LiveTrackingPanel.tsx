'use client';

import { useState } from 'react';
import type { Shipment } from '@/lib/types';
import { Card, Button, Badge } from './ui';
import { fetchLiveRoute } from '@/lib/liveApis';
import { MapPin, RefreshCw, Route, Wifi, AlertTriangle } from 'lucide-react';

export default function LiveTrackingPanel({ shipment }: { shipment: Shipment }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const route = await fetchLiveRoute(shipment.origin || shipment.portOfLoading, shipment.destination || shipment.portOfDischarge);
      const pct = shipment.status === 'delivered' ? 100 : shipment.status === 'customs' ? 84 : shipment.status === 'in_transit' ? 55 : shipment.status === 'picked_up' ? 20 : shipment.status === 'booked' ? 8 : 3;
      setResult({ route, pct, at: new Date().toLocaleString() });
    } catch (e: any) {
      setError(e?.message || 'Tracking API unavailable');
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-4 border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/10">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Wifi className="w-4 h-4 text-blue-600"/> Free Live Tracking API</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">OpenStreetMap geocoding + public routing to validate route and ETA context.</p>
        </div>
        <Button size="sm" onClick={refresh} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/> Sync</Button>
      </div>
      {error && <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {error}. Showing FreightFlow internal status.</div>}
      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Metric icon={<Route className="w-4 h-4"/>} label="API route" value={`${result.route.distanceKm.toLocaleString()} km`} />
            <Metric icon={<MapPin className="w-4 h-4"/>} label="Progress model" value={`${result.pct}%`} />
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${result.pct}%` }} /></div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{result.route.source} · Synced {result.at}</div>
          <Badge color="blue">Live route check complete</Badge>
        </div>
      )}
    </Card>
  );
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 flex items-center gap-2"><span className="text-blue-600">{icon}</span><div><div className="text-[10px] uppercase font-bold text-slate-400">{label}</div><div className="font-bold text-slate-900 dark:text-white">{value}</div></div></div>; }
