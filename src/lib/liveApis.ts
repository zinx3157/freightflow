'use client';

// Free, no-key API connectors designed to work from the static GitHub Pages build.
// They are intentionally best-effort: if a public endpoint is rate-limited or CORS
// changes, the UI falls back to local FreightFlow data instead of breaking.

export type LiveFx = {
  base: string;
  date: string;
  rates: Record<string, number>;
  source: string;
};

export type GeoPoint = { label: string; lat: number; lon: number };
export type LiveRoute = {
  origin: GeoPoint;
  destination: GeoPoint;
  distanceKm: number;
  durationHours: number;
  source: string;
};

export async function fetchLiveFx(base = 'USD', symbols = ['EUR', 'GBP', 'MGA']): Promise<LiveFx> {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${symbols.map(encodeURIComponent).join(',')}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = await res.json();
  return { base: data.base || base, date: data.date || new Date().toISOString().slice(0, 10), rates: data.rates || {}, source: 'Frankfurter free FX API' };
}

export async function geocodePlace(q: string): Promise<GeoPoint> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Geocode API ${res.status}`);
  const data = await res.json();
  const hit = Array.isArray(data) ? data[0] : null;
  if (!hit) throw new Error(`No geocode match for ${q}`);
  return { label: hit.display_name || q, lat: Number(hit.lat), lon: Number(hit.lon) };
}

export async function fetchLiveRoute(origin: string, destination: string): Promise<LiveRoute> {
  const [o, d] = await Promise.all([geocodePlace(origin), geocodePlace(destination)]);
  const url = `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`OSRM API ${res.status}`);
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error('No route returned');
  return {
    origin: o,
    destination: d,
    distanceKm: Math.round((route.distance || 0) / 100) / 10,
    durationHours: Math.round((route.duration || 0) / 360) / 10,
    source: 'OpenStreetMap Nominatim + public OSRM routing API',
  };
}

export function estimateLiveFreightIndex(mode: 'air'|'sea'|'road', distanceKm: number, fxUsdToEur = 0.92) {
  const basePerKm = mode === 'air' ? 1.85 : mode === 'sea' ? 0.18 : 1.15;
  const volatility = mode === 'air' ? 1.08 : mode === 'sea' ? 0.96 : 1.02;
  const usd = Math.max(45, Math.round(distanceKm * basePerKm * volatility));
  return {
    buyUsd: usd,
    sellUsd: Math.round(usd * 1.18),
    sellEur: Math.round(usd * 1.18 * fxUsdToEur),
    confidence: distanceKm > 0 ? 'Live API distance + FX, tariff estimate' : 'FX only, local tariff estimate',
  };
}
