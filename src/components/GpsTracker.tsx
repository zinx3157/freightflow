'use client';

import { useEffect, useState, useRef } from 'react';
import type { TruckingDispatch, GpsPing } from '@/lib/types';
import { db } from '@/lib/store';
import { Card, Badge, Button } from './ui';
import { Navigation, Truck, Clock, Gauge, MapPin, Pause, Play } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

// Simple Madagascar RN2 corridor mini-map (lat/lng bounds)
const BOUNDS = { minLat: -19.2, maxLat: -17.8, minLng: 47.3, maxLng: 49.6 };
function project(lat: number, lng: number, w: number, h: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * w;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * h;
  return { x, y };
}

// Simplified RN2 highway path (Toamasina → Antananarivo)
const RN2_PATH: [number, number][] = [
  [-18.150, 49.400], // Toamasina
  [-18.300, 49.290],
  [-18.480, 49.200],
  [-18.650, 49.140],
  [-18.820, 49.070], // Brickaville
  [-18.870, 48.850],
  [-18.920, 48.580],
  [-18.940, 48.230], // Moramanga
  [-18.940, 48.000],
  [-18.930, 47.760],
  [-18.910, 47.600], // Sambaina
  [-18.880, 47.500], // Tana
];

export default function GpsTracker({ trucking }: { trucking: TruckingDispatch }) {
  const [pings, setPings] = useState<GpsPing[]>([]);
  const [playing, setPlaying] = useState(true);
  const [idx, setIdx] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 560, h: 320 });

  useEffect(() => {
    const all = db.gpsForTrucking(trucking.id);
    setPings(all);
    setIdx(all.length - 1);
    const onResize = () => {
      if (canvasRef.current) setDims({ w: canvasRef.current.clientWidth, h: Math.max(260, canvasRef.current.clientWidth * 0.55) });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [trucking.id]);

  // Simulate live ping every 10s when playing
  useEffect(() => {
    if (!playing) return;
    if (pings.length < 5) return;
    const iv = setInterval(() => {
      setIdx((i) => {
        const next = Math.min(i + 1, pings.length - 1);
        return next;
      });
      // simulate a new ping if the truck is mid-route
      const last = pings[pings.length - 1];
      const lastRoute = RN2_PATH.findIndex((p) => Math.abs(p[0] - last.lat) < 0.05 && Math.abs(p[1] - last.lng) < 0.08);
      if (lastRoute >= 0 && lastRoute < RN2_PATH.length - 1 && trucking.status === 'en_route') {
        const next = RN2_PATH[lastRoute + 1];
        const np: GpsPing = {
          id: 'gp_' + Math.random().toString(36).slice(2),
          truckingId: trucking.id,
          lat: next[0] + (Math.random() - 0.5) * 0.01,
          lng: next[1] + (Math.random() - 0.5) * 0.01,
          speedKmh: 30 + Math.floor(Math.random() * 25),
          heading: 260 + Math.floor(Math.random() * 20),
          timestamp: new Date().toISOString(),
        };
        setPings((ps) => [...ps, np]);
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [playing, pings, trucking.status]);

  const w = dims.w;
  const h = dims.h;

  // Build path d string
  const pathD = RN2_PATH.map((p, i) => {
    const { x, y } = project(p[0], p[1], w, h);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const current = pings[idx];
  const start = project(-18.150, 49.400, w, h); // Toamasina
  const end = project(-18.880, 47.500, w, h); // Tana
  const pos = current ? project(current.lat, current.lng, w, h) : start;
  const progress = pings.length ? Math.min(1, idx / Math.max(pings.length - 1, 1)) : 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Live GPS Tracking</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Real-time dispatch position — RN2 Toamasina↔Antananarivo</p>
          </div>
        </div>
        <Badge color={trucking.status === 'en_route' ? 'emerald' : 'slate'}>
          {trucking.status === 'en_route' ? '● Live' : 'Offline'}
        </Badge>
      </div>

      <div ref={canvasRef} className="relative rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 to-emerald-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700" style={{ height: h }}>
        <svg width={w} height={h} className="absolute inset-0">
          {/* Ocean hint (east side) */}
          <rect x={project(-18.5, 49.3, w, h).x} y="0" width={w} height={h} fill="#bae6fd" opacity="0.45" className="dark:fill-blue-950 dark:opacity-40" />
          {/* Forest/hill shading */}
          <defs>
            <radialGradient id="hill" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#86efac" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={w*0.35} cy={h*0.5} rx={w*0.6} ry={h*0.5} fill="url(#hill)" className="dark:fill-emerald-950" />

          {/* RN2 road */}
          <path d={pathD} stroke="#fbbf24" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
          <path d={pathD} stroke="#fff" strokeWidth="1.5" fill="none" strokeDasharray="6 8" strokeLinecap="round" />

          {/* Other roads faint (RN44 Moramanga) */}
          <line x1={project(-18.940, 48.230, w, h).x} y1={project(-18.940, 48.230, w, h).y}
                x2={project(-17.850, 48.230, w, h).x} y2={project(-17.850, 48.230, w, h).y}
                stroke="#d6d3d1" strokeWidth="3" strokeDasharray="3 4" />

          {/* City labels */}
          <g>
            <circle cx={start.x} cy={start.y} r="7" fill="#0ea5e9" stroke="#fff" strokeWidth="2" />
            <text x={start.x + 10} y={start.y - 8} className="fill-slate-800 dark:fill-slate-200 text-[11px] font-bold">Toamasina Port</text>
          </g>
          <g>
            <circle cx={end.x} cy={end.y} r="7" fill="#6366f1" stroke="#fff" strokeWidth="2" />
            <text x={end.x - 90} y={end.y - 10} className="fill-slate-800 dark:fill-slate-200 text-[11px] font-bold">Antananarivo</text>
          </g>
          {/* Midpoint: Moramanga */}
          {(() => {
            const m = project(-18.940, 48.230, w, h);
            return <g><circle cx={m.x} cy={m.y} r="4" fill="#64748b" /><text x={m.x + 7} y={m.y + 3} className="fill-slate-600 dark:fill-slate-400 text-[10px]">Moramanga</text></g>;
          })()}
          {(() => {
            const b = project(-18.820, 49.070, w, h);
            return <g><circle cx={b.x} cy={b.y} r="4" fill="#64748b" /><text x={b.x + 7} y={b.y + 3} className="fill-slate-600 dark:fill-slate-400 text-[10px]">Brickaville</text></g>;
          })()}

          {/* Past trail */}
          {pings.slice(0, idx).map((p, i) => {
            const pt = project(p.lat, p.lng, w, h);
            return <circle key={p.id} cx={pt.x} cy={pt.y} r={i === idx - 1 ? 3 : 2} fill="#10b981" opacity={0.3 + (i / Math.max(pings.length, 1)) * 0.6} />;
          })}

          {/* Current truck */}
          {current && (
            <g transform={`translate(${pos.x},${pos.y})`}>
              <circle r="18" fill="#10b981" opacity="0.15">
                <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="10" fill="#10b981" stroke="#fff" strokeWidth="2.5" />
              <g transform="translate(-7,-7)"><Truck className="text-white" size={14} /></g>
            </g>
          )}
        </svg>

        {/* Telemetry overlay */}
        {current && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
            <Badge color="emerald" className="backdrop-blur bg-white/80 dark:bg-slate-900/80 shadow">
              <Gauge className="w-3 h-3" /> {current.speedKmh || '—'} km/h
            </Badge>
            <Badge color="blue" className="backdrop-blur bg-white/80 dark:bg-slate-900/80 shadow">
              <Navigation className="w-3 h-3" /> {current.heading || '—'}°
            </Badge>
            <Badge color="slate" className="backdrop-blur bg-white/80 dark:bg-slate-900/80 shadow">
              <MapPin className="w-3 h-3" /> {current.locationLabel || `${current.lat.toFixed(3)}, ${current.lng.toFixed(3)}`}
            </Badge>
          </div>
        )}
      </div>

      {current && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Last ping</div>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{formatDateTime(current.timestamp)}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Driver</div>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{trucking.driverName}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vehicle</div>
            <div className="font-semibold text-slate-900 dark:text-white text-sm">{trucking.vehiclePlate} · {trucking.vehicleType}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Route progress</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">{Math.round(progress * 100)}% complete</div>
            <div className="mt-1 h-1.5 bg-emerald-200 dark:bg-emerald-900/40 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? 'Pause simulation' : 'Resume'}
        </Button>
        <div className="flex-1" />
        <div className="flex gap-1 items-center">
          <input type="range" min={0} max={Math.max(pings.length - 1, 0)} value={idx} onChange={(e) => setIdx(Number(e.target.value))} className="w-32 accent-brand" />
        </div>
      </div>
    </Card>
  );
}
