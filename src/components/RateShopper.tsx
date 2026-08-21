'use client';

import { useState, useMemo } from 'react';
import { Card, Button, Badge, Input, Select, Field } from './ui';
import { db } from '@/lib/store';
import { Sparkles, Clock, TrendingDown, Award, Ship, Plane, Truck, RefreshCcw, Shield, CheckCircle2, Zap } from 'lucide-react';
import { formatMoney, titleCase } from '@/lib/utils';

type Quote = {
  carrier: string;
  mode: 'air'|'sea'|'road';
  service: string;
  etdDays: number;
  transitMin: number;
  transitMax: number;
  buyRate: number;
  sellRate: number;
  totalBuy: number;
  totalSell: number;
  marginPct: number;
  reliability: number; // 0-100
  co2e: number;
  includesCustoms: boolean;
  includesInsurance: boolean;
  surcharges: string;
  currency: string;
  note?: string;
};

// Simulated carrier rates for demo — would come from INTTRA/CargoSmart/Freightos APIs in production
const SIM_CARRIERS = ['Maersk','MSC','CMA CGM','Hapag-Lloyd','COSCO','ONE','Evergreen','Air France Cargo','Emirates SkyCargo','Ethiopian Cargo','Turkish Cargo','Kenya Airways Cargo','DHL Global','DSV','Kuehne+Nagel'];

function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i))|0; return Math.abs(h); }

function simQuotes(origin: string, destination: string, mode: 'air'|'sea'|'road', weightKg: number, volCbm: number): Quote[] {
  const carriers = mode === 'air' ? SIM_CARRIERS.filter(c => /Cargo|Airways|DHL|DSV|Kuehne/.test(c)) : mode==='sea' ? SIM_CARRIERS.slice(0,7) : ['DHL Global','DSV','Kuehne+Nagel','Bolloré Logistics','Maersk Land'];
  const seed = hash(`${origin}-${destination}-${mode}-${weightKg}-${volCbm}`);
  const rng = (n: number) => { const x = Math.sin(seed + n * 9973) * 10000; return x - Math.floor(x); };
  const base = mode === 'air' ? { min: 4.2, max: 8.5, unit: 'kg', daysMin: 2, daysMax: 7 } : mode==='sea' ? { min: 850, max: 1800, unit: 'container_40hc', daysMin: 28, daysMax: 45 } : { min: 85, max: 130, unit: 'truck', daysMin: 1, daysMax: 3 };
  const quotes: Quote[] = carriers.map((carrier, i) => {
    const seedFactor = rng(i+1);
    const sellBase = base.min + seedFactor * (base.max - base.min);
    const buyBase = sellBase * (0.65 + rng(i+50)*0.18);
    const transitMin = Math.max(1, Math.round(base.daysMin - seedFactor*2 + (mode==='road'?0:3)));
    const transitMax = transitMin + Math.round(2 + seedFactor*5);
    const etdDays = Math.max(0, Math.round(rng(i+99)*5));
    const units = mode === 'air' ? Math.max(weightKg, volCbm*167) : mode === 'sea' ? Math.max(1, Math.ceil(volCbm/67)) : 1;
    const totalSell = Math.round(sellBase * units);
    const totalBuy = Math.round(buyBase * units);
    const reliability = 72 + Math.round(rng(i+200) * 26);
    const co2Factor = mode === 'air' ? 602 : mode==='sea' ? 15 : 110;
    const kmGuess = mode==='air'? 8500 : mode==='sea' ? 11500 : 350;
    const co2e = Math.round(co2Factor * (weightKg/1000) * kmGuess / 1000);
    return {
      carrier, mode,
      service: mode==='air' ? (rng(i) > 0.5 ? 'Express (priority)' : 'Standard') : mode==='sea' ? (rng(i) > 0.7 ? 'Premium Direct' : rng(i) > 0.3 ? 'Direct' : 'Transshipment') : 'Direct Truck',
      etdDays, transitMin, transitMax,
      buyRate: Math.round(buyBase*100)/100, sellRate: Math.round(sellBase*100)/100,
      totalBuy, totalSell,
      marginPct: Math.round((totalSell-totalBuy)/totalSell*100),
      reliability,
      co2e,
      includesCustoms: rng(i+300) > 0.55,
      includesInsurance: rng(i+400) > 0.6,
      surcharges: mode==='air' ? '+ FSC + SSC' : mode==='sea' ? '+ THC + DOC + BAF' : '+ Fuel',
      currency: 'USD',
      note: reliability > 90 ? '⭐ Recommended — highest reliability' : etdDays <= 1 ? '⚡ Fastest departure' : undefined,
    };
  });
  return quotes.sort((a,b) => a.totalSell - b.totalSell);
}

export default function RateShopper() {
  const [origin, setOrigin] = useState('Toamasina (TMM)');
  const [destination, setDestination] = useState('Hamburg (HAM)');
  const [mode, setMode] = useState<'air'|'sea'|'road'>('sea');
  const [weight, setWeight] = useState(22000);
  const [volume, setVolume] = useState(65);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sortBy, setSortBy] = useState<'price'|'transit'|'reliability'>('price');

  const savedRates = useMemo(() => db.allRates().filter(r => r.active), []);
  const cheapest = quotes[0];

  const search = () => {
    setLoading(true); setSearched(true);
    setTimeout(() => {
      // Blend simulated carrier quotes with any matching saved rates
      const sim = simQuotes(origin, destination, mode, weight, volume);
      const matchingSaved = savedRates.filter(r => r.mode === mode &&
        (r.origin.toLowerCase().includes(origin.slice(0,3).toLowerCase()) || origin.toLowerCase().includes(r.origin.slice(0,3).toLowerCase())) &&
        (r.destination.toLowerCase().includes(destination.slice(0,3).toLowerCase()) || destination.toLowerCase().includes(r.destination.slice(0,3).toLowerCase()))
      ).map(r => {
        const units = mode==='air' ? Math.max(weight, volume*167) : mode==='sea' ? Math.max(1, Math.ceil(volume/67)) : 1;
        const sell = r.unit === 'container_40hc' ? r.sellRate * Math.ceil(volume/67) : r.unit === 'container_20' ? r.sellRate * Math.ceil(volume/33) : r.sellRate * units;
        const buy = r.unit === 'container_40hc' ? r.buyRate * Math.ceil(volume/67) : r.unit === 'container_20' ? r.buyRate * Math.ceil(volume/33) : r.buyRate * units;
        return {
          carrier: r.carrier, mode, service: 'Contracted rate', etdDays: 2, transitMin: r.transitDaysMin||25, transitMax: r.transitDaysMax||35,
          buyRate: r.buyRate, sellRate: r.sellRate, totalBuy: Math.round(buy), totalSell: Math.round(sell),
          marginPct: Math.round((sell-buy)/sell*100), reliability: 95,
          co2e: Math.round((mode==='air'?602:mode==='sea'?15:110)*(weight/1000)*(mode==='air'?8500:11500)/1000),
          includesCustoms: true, includesInsurance: false, surcharges: 'Per contract', currency: r.currency, note: '🔒 Your contracted rate',
        } as Quote;
      });
      const merged = [...matchingSaved, ...sim].sort((a,b) => a.totalSell - b.totalSell);
      setQuotes(merged);
      setLoading(false);
    }, 900);
  };

  const sorted = [...quotes].sort((a,b) => {
    if (sortBy==='price') return a.totalSell - b.totalSell;
    if (sortBy==='transit') return a.transitMax - b.transitMax;
    return b.reliability - a.reliability;
  });
  const bestPrice = quotes.length ? Math.min(...quotes.map(q=>q.totalSell)) : 0;
  const fastest = quotes.length ? quotes.reduce((a,b)=>a.transitMax<b.transitMax?a:b) : null;
  const greenest = quotes.length ? quotes.reduce((a,b)=>a.co2e<b.co2e?a:b) : null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            AI Spot Rate Shopper
            <Badge color="violet"><Zap className="w-3 h-3"/> Beta</Badge>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Simulates querying 15+ carriers in real time (INTTRA/Freightos/CargoSmart-style) and blends with your contracted rates</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Field label="Mode">
          <Select value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="sea">Sea (FCL)</option>
            <option value="air">Air</option>
            <option value="road">Road (inland)</option>
          </Select>
        </Field>
        <Field label="Origin"><Input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="City/port" /></Field>
        <Field label="Destination"><Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="City/port" /></Field>
        <Field label="Weight (kg)"><Input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} /></Field>
        <Field label={mode==='sea'?'Volume (CBM)':'Volume (CBM)'}><Input type="number" value={volume} onChange={e => setVolume(Number(e.target.value))} /></Field>
      </div>
      <Button onClick={search} disabled={loading} className="w-full md:w-auto">
        {loading ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
        {loading ? ' Shopping carriers…' : ' Shop live rates'}
      </Button>

      {loading && (
        <div className="mt-6 p-8 text-center">
          <RefreshCcw className="w-8 h-8 animate-spin text-brand mx-auto mb-2" />
          <div className="text-sm text-slate-500">Querying Maersk, MSC, CMA CGM, Air France, Emirates, DHL, DSV, K+N…</div>
        </div>
      )}

      {searched && !loading && quotes.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 mt-5 mb-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 mb-1"><TrendingDown className="w-3 h-3"/> Cheapest</div>
              <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{formatMoney(bestPrice)}</div>
              <div className="text-xs text-emerald-600">{quotes.find(q=>q.totalSell===bestPrice)?.carrier}</div>
            </div>
            <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-sky-700 dark:text-sky-400 mb-1"><Clock className="w-3 h-3"/> Fastest</div>
              <div className="text-lg font-bold text-sky-900 dark:text-sky-100">{fastest?.transitMin}-{fastest?.transitMax}d</div>
              <div className="text-xs text-sky-600">{fastest?.carrier}</div>
            </div>
            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-violet-700 dark:text-violet-400 mb-1"><Award className="w-3 h-3"/> Best value</div>
              <div className="text-lg font-bold text-violet-900 dark:text-violet-100">{sorted[0]?.carrier}</div>
              <div className="text-xs text-violet-600">{formatMoney(sorted[0]?.totalSell)} · {sorted[0]?.transitMax}d · {sorted[0]?.reliability}% reliable</div>
            </div>
          </div>

          <div className="flex gap-1 mb-2 text-xs">
            <span className="text-slate-500 self-center mr-2">Sort by:</span>
            {(['price','transit','reliability'] as const).map(s => (
              <button key={s} onClick={()=>setSortBy(s)} className={`px-2 py-1 rounded font-semibold capitalize ${sortBy===s ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{s}</button>
            ))}
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {sorted.map((q, i) => {
              const modeIcon = q.mode==='air'?<Plane className="w-4 h-4 text-sky-500"/>:q.mode==='sea'?<Ship className="w-4 h-4 text-indigo-500"/>:<Truck className="w-4 h-4 text-amber-500"/>;
              const isCheapest = q.totalSell === bestPrice;
              return (
                <div key={q.carrier+i} className={`p-4 rounded-xl border-2 transition ${isCheapest ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">{modeIcon}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{q.carrier}</span>
                          <Badge color="slate">{q.service}</Badge>
                          {q.note && <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">{q.note}</span>}
                          {isCheapest && <Badge color="emerald"><TrendingDown className="w-3 h-3"/> Best price</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Departs in {q.etdDays}d · {q.transitMin}-{q.transitMax}d transit</span>
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3"/> {q.reliability}% on-time</span>
                          <span>🌱 {q.co2e} kg CO₂e</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          {q.includesCustoms && <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Customs</span>}
                          {q.includesInsurance && <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Insurance</span>}
                          <span className="text-rose-500">{q.surcharges}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(q.totalSell, q.currency)}</div>
                      <div className="text-[10px] text-slate-400">
                        @ {formatMoney(q.sellRate, q.currency)}/{q.mode==='air'?'kg':q.mode==='sea'?'40HC':'truck'} · {q.marginPct}% margin
                      </div>
                      <Button size="sm" className="mt-2" onClick={() => {
                        const modeForQuote: 'air'|'sea' = q.mode === 'air' ? 'air' : 'sea';
                        db.createQuote({
                          customerName: 'Spot Customer',
                          mode: modeForQuote,
                          direction: 'export',
                          origin, destination, weight,
                          volume, commodity: 'Spot quote',
                          status: 'pending',
                          freightRate: q.totalSell,
                          customsFee: Math.round(q.totalSell*0.08),
                          truckingFee: Math.round(q.totalSell*0.05),
                          total: Math.round(q.totalSell*1.13),
                          validUntil: new Date(Date.now()+14*86400000).toISOString().slice(0,10),
                          customerEmail: '',
                        });
                        alert(`Quote created for ${q.carrier} — all-in ${formatMoney(Math.round(q.totalSell*1.13))}. Open Quotes page to convert.`);
                      }}>
                        Book this rate →
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {searched && !loading && quotes.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">No rates found for this lane. Try broadening origin/destination or switching mode.</div>
      )}
      {!searched && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
          <strong>💡 Tip:</strong> In production this would call real rate-shopping APIs (INTTRA, CargoSmart, Freightos, WebCargo, carrier direct APIs). The demo blends deterministic simulated quotes with any contracted rates you've added to Rate Cards.
        </div>
      )}
    </Card>
  );
}
