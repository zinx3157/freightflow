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

const KNOWN_POINTS: Record<string, GeoPoint> = {
  toamasina: { label: 'Toamasina Port, Madagascar', lat: -18.1492, lon: 49.4023 },
  tamatave: { label: 'Toamasina Port, Madagascar', lat: -18.1492, lon: 49.4023 },
  antananarivo: { label: 'Antananarivo, Madagascar', lat: -18.8792, lon: 47.5079 },
  ivato: { label: 'Ivato Airport, Madagascar', lat: -18.7969, lon: 47.4788 },
  portlouis: { label: 'Port Louis, Mauritius', lat: -20.1609, lon: 57.5012 },
  mauritius: { label: 'Port Louis, Mauritius', lat: -20.1609, lon: 57.5012 },
  durban: { label: 'Durban, South Africa', lat: -29.8587, lon: 31.0218 },
  mombasa: { label: 'Mombasa, Kenya', lat: -4.0435, lon: 39.6682 },
  dubai: { label: 'Dubai, UAE', lat: 25.2048, lon: 55.2708 },
  hamburg: { label: 'Hamburg, Germany', lat: 53.5511, lon: 9.9937 },
  shanghai: { label: 'Shanghai, China', lat: 31.2304, lon: 121.4737 },
};

export async function geocodePlace(q: string): Promise<GeoPoint> {
  const key = q.toLowerCase().replace(/[^a-z]/g, '');
  const known = Object.entries(KNOWN_POINTS).find(([k]) => key.includes(k));
  if (known) return known[1];

  // Free, no-key, CORS-friendly geocoding. Good enough for live route checks.
  const name = q.split(',')[0].trim();
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Geocode API ${res.status}`);
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) throw new Error(`No geocode match for ${q}`);
  return { label: [hit.name, hit.country].filter(Boolean).join(', '), lat: Number(hit.latitude), lon: Number(hit.longitude) };
}

function haversineKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function fetchLiveRoute(origin: string, destination: string): Promise<LiveRoute> {
  const [o, d] = await Promise.all([geocodePlace(origin), geocodePlace(destination)]);
  // Try public OSRM for road lanes. Ocean/air lanes often cannot route by road,
  // so fall back to great-circle distance using live geocoded coordinates.
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false`;
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route) {
        return { origin: o, destination: d, distanceKm: Math.round((route.distance || 0) / 100) / 10, durationHours: Math.round((route.duration || 0) / 360) / 10, source: 'Open-Meteo geocoding + public OSRM route API' };
      }
    }
  } catch {}
  const gc = haversineKm(o, d);
  return { origin: o, destination: d, distanceKm: Math.round(gc * 10) / 10, durationHours: Math.round((gc / 650) * 10) / 10, source: 'Open-Meteo/free geocoding + great-circle tracking estimate' };
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
