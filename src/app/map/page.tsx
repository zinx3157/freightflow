'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import PageShell from '@/components/PageShell';
import { Card, Badge } from '@/components/ui';
import { db } from '@/lib/store';
import type { Shipment } from '@/lib/types';
import type { DB } from '@/lib/store';
import { Plane, Ship, MapPin, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Simple equirectangular projection: lat/lon → x/y percentage
function project(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

// Coordinates for major ports/airports used in our demo + common hubs
const PORTS: Record<string, { lat: number; lon: number }> = {
  'Antananarivo': { lat: -18.8792, lon: 47.5079 },
  'Toamasina': { lat: -18.1495, lon: 49.4024 },
  'TNR': { lat: -18.7969, lon: 47.4788 },
  'Hamburg': { lat: 53.5511, lon: 9.9937 },
  'CDG': { lat: 49.0097, lon: 2.5479 },
  'Paris': { lat: 48.8566, lon: 2.3522 },
  'Shanghai': { lat: 31.2304, lon: 121.4737 },
  'Rotterdam': { lat: 51.9244, lon: 4.4777 },
  'Dubai': { lat: 25.2048, lon: 55.2708 },
  'DXB': { lat: 25.2532, lon: 55.3657 },
  'Mauritius': { lat: -20.3484, lon: 57.5522 },
  'MRU': { lat: -20.4302, lon: 57.6836 },
  'Frankfurt': { lat: 50.1109, lon: 8.6821 },
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Nhava Sheva': { lat: 18.9499, lon: 72.9498 },
  'Istanbul': { lat: 41.0082, lon: 28.9784 },
  'Johannesburg': { lat: -26.2041, lon: 28.0473 },
  'JNB': { lat: -26.1392, lon: 28.2460 },
  'Tokyo': { lat: 35.6762, lon: 139.6503 },
  'London': { lat: 51.5074, lon: -0.1278 },
  'New York': { lat: 40.7128, lon: -74.0060 },
  'Singapore': { lat: 1.3521, lon: 103.8198 },
};

function lookup(name: string): { lat: number; lon: number } | null {
  if (!name) return null;
  // Exact match
  if (PORTS[name]) return PORTS[name];
  // Partial match against keys
  for (const k of Object.keys(PORTS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return PORTS[k];
  }
  return null;
}

function interpolate(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  // Great-circle-ish: add a slight curve (arc) for sea routes
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export default function LiveMapPage() {
  const [data, setData] = useState<DB | null>(null);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [filter, setFilter] = useState<'all' | 'air' | 'sea' | 'issues'>('all');
  const [tick, setTick] = useState(0);

  useEffect(() => setData(db.getAll()), []);

  // Animate dots moving along routes
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => (t + 1) % 1000), 80);
    return () => clearInterval(iv);
  }, []);

  const shipments = useMemo(() => {
    if (!data) return [];
    return data.shipments
      .filter((s: Shipment) => s.status !== 'delivered' && s.status !== 'cancelled' && s.status !== 'quoted')
      .filter((s) => {
        if (filter === 'all') return true;
        if (filter === 'issues')
          return s.customsStatus === 'rejected' || s.customsStatus === 'inspection' || (s.status !== 'delivered' && new Date(s.eta) < new Date());
        return s.mode === filter;
      });
  }, [data, filter]);

  if (!data) return <PageShell title="Live Map"><div className="text-slate-500">Loading…</div></PageShell>;

  const stats = {
    inTransit: data.shipments.filter((s: Shipment) => s.status === 'in_transit').length,
    air: data.shipments.filter((s) => s.mode === 'air' && s.status !== 'delivered').length,
    sea: data.shipments.filter((s) => s.mode === 'sea' && s.status !== 'delivered').length,
    issues: data.shipments.filter((s: Shipment) => s.customsStatus === 'rejected' || s.customsStatus === 'inspection').length,
  };

  return (
    <PageShell title="Live Shipment Map" subtitle="Real-time view of all active air and sea freight across your network.">
      <div className="flex flex-wrap gap-2">
        {[
          { k: 'all', label: 'All active', n: stats.air + stats.sea },
          { k: 'air', label: 'Air', n: stats.air },
          { k: 'sea', label: 'Sea', n: stats.sea },
          { k: 'issues', label: 'Issues only', n: stats.issues },
        ].map((b) => (
          <button
            key={b.k}
            onClick={() => setFilter(b.k as any)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
              filter === b.k
                ? 'bg-brand text-white shadow'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {b.label} ({b.n})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '2 / 1', background: 'linear-gradient(180deg, #0c4a6e 0%, #082f49 60%, #0b1f34 100%)' }}>
          {/* Grid lines */}
          <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Lat/Lon grid */}
            {[10, 20, 30, 40].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
            ))}
            {[20, 40, 60, 80].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.1" />
            ))}

            {/* Simplified continents (rough silhouette polygons in equirectangular projection) */}
            {/* This is an abstract silhouette for visual purposes, not cartographically accurate */}
            <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.15">
              {/* Africa */}
              <path d="M47,20 L50,18 L55,20 L58,25 L57,32 L55,38 L50,40 L45,38 L43,32 L42,25 Z" />
              {/* Madagascar */}
              <path d="M54,34 L55,33 L56,36 L55,38 Z" />
              {/* Europe */}
              <path d="M47,14 L55,12 L58,15 L54,18 L48,18 L46,16 Z" />
              {/* Asia */}
              <path d="M58,12 L75,10 L85,15 L85,22 L80,25 L70,25 L65,22 L60,20 L58,17 Z" />
              {/* India */}
              <path d="M68,22 L70,22 L71,28 L69,28 Z" />
              {/* SE Asia / Indonesia */}
              <path d="M78,27 L85,27 L84,30 L79,30 Z" />
              {/* Australia */}
              <path d="M80,35 L88,35 L88,40 L82,40 Z" />
              {/* North America */}
              <path d="M18,12 L32,10 L33,20 L28,25 L22,22 L18,18 Z" />
              {/* South America */}
              <path d="M28,28 L34,28 L34,40 L30,42 L27,36 Z" />
            </g>

            {/* Routes and moving dots */}
            {shipments.map((s) => {
              const from = lookup(s.portOfLoading) || lookup(s.origin);
              const to = lookup(s.portOfDischarge) || lookup(s.destination);
              if (!from || !to) return null;
              const a = project(from.lat, from.lon);
              const b = project(to.lat, to.lon);
              // Normalize for SVG (y goes from 0 (top) to 50 (bottom) = half)
              const aSvg = { x: a.x, y: a.y / 2 };
              const bSvg = { x: b.x, y: b.y / 2 };
              // Determine progress along the route based on status
              let progress = 0.2;
              if (s.status === 'booked') progress = 0.1;
              else if (s.status === 'picked_up') progress = 0.25;
              else if (s.status === 'in_transit') progress = 0.5;
              else if (s.status === 'customs') progress = 0.85;
              // Animate
              const pos = ((tick % 100) / 100) * 0.5 + progress * 0.3;
              const t = Math.min(0.98, Math.max(0.02, pos));
              // Quadratic curve for arc
              const midX = (aSvg.x + bSvg.x) / 2;
              const midY = Math.min(aSvg.y, bSvg.y) - (s.mode === 'air' ? 8 : 3);
              const dotX = (1 - t) * (1 - t) * aSvg.x + 2 * (1 - t) * t * midX + t * t * bSvg.x;
              const dotY = (1 - t) * (1 - t) * aSvg.y + 2 * (1 - t) * t * midY + t * t * bSvg.y;
              const color = s.mode === 'air' ? '#60a5fa' : '#a78bfa';
              const issue = s.customsStatus === 'rejected' || s.customsStatus === 'inspection' || (s.status !== 'delivered' && new Date(s.eta) < new Date());
              return (
                <g key={s.id}>
                  <path
                    d={`M ${aSvg.x} ${aSvg.y} Q ${midX} ${midY} ${bSvg.x} ${bSvg.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.2"
                    strokeDasharray="0.8 0.4"
                    opacity="0.5"
                  />
                  {/* Origin */}
                  <circle cx={aSvg.x} cy={aSvg.y} r="0.4" fill={color} />
                  {/* Destination */}
                  <circle cx={bSvg.x} cy={bSvg.y} r="0.4" fill={color} opacity="0.5" />
                  {/* Moving dot */}
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={s.mode === 'air' ? '0.7' : '0.6'}
                    fill={issue ? '#f87171' : color}
                    className="cursor-pointer"
                    onClick={() => setSelected(s)}
                  >
                    <animate attributeName="r" values={`${s.mode === 'air' ? 0.7 : 0.6};${s.mode === 'air' ? 0.9 : 0.8};${s.mode === 'air' ? 0.7 : 0.6}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur rounded-lg p-3 text-white/90 text-xs space-y-1.5 border border-white/10">
            <div className="font-bold text-[10px] uppercase tracking-widest mb-1 text-white/70">Live</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Air freight in flight</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-violet-400" /> Sea freight at sea</div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" /> Attention required</div>
          </div>

          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur rounded-lg px-3 py-2 text-white/90 text-xs border border-white/10">
            <div className="font-bold">{shipments.length} active</div>
            <div className="text-white/60">Updated live</div>
          </div>

          {!selected && (
            <div className="absolute bottom-3 left-3 right-3 bg-black/40 backdrop-blur rounded-lg p-3 text-white/80 text-xs border border-white/10">
              Click any moving dot on the map to see shipment details. Routes animate along actual scheduled progress.
            </div>
          )}
        </div>
      </Card>

      {selected && (
        <Card className="p-5 border-l-4" style={{ borderLeftColor: selected.mode === 'air' ? '#3b82f6' : '#8b5cf6' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{selected.reference}</span>
                {selected.mode === 'air' ? <Badge color="blue"><Plane className="w-3 h-3" />Air</Badge> : <Badge color="indigo"><Ship className="w-3 h-3" />Sea</Badge>}
                <Badge color={selected.direction === 'import' ? 'emerald' : 'blue'}>{selected.direction}</Badge>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selected.customerName} · {selected.commodity}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {selected.portOfLoading}
                <span className="text-slate-400">→</span>
                <MapPin className="w-4 h-4 text-rose-500" />
                {selected.portOfDischarge}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-slate-500 dark:text-slate-400">Carrier</div>
              <div className="font-semibold text-slate-900 dark:text-white">{selected.carrier}</div>
              <div className="text-slate-500 dark:text-slate-400 mt-2">{selected.mode === 'air' ? 'Flight' : 'Vessel'}</div>
              <div className="font-semibold text-slate-900 dark:text-white">{selected.vesselOrFlight}</div>
              <div className="text-slate-500 dark:text-slate-400 mt-2">ETA</div>
              <div className="font-semibold text-slate-900 dark:text-white">{formatDate(selected.eta)}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 self-start text-xl">×</button>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
