'use client';
import { useEffect, useMemo, useState } from 'react';
import { Scale, Ruler, PackageOpen, Info, Calculator } from 'lucide-react';
import { calcAirChargeableWeight, AIR_DIM_FACTORS } from '@/lib/chargeable';

type Props = {
  mode: 'air' | 'sea';
  grossKg: number;
  volumeCbm: number;
  onChange: (v: { grossKg: number; volumeCbm: number; chargeableKg: number; pieces: number; dimsCm?: { l: number; w: number; h: number } }) => void;
  pieces: number;
};

/**
 * Chargeable Weight Calculator panel (inline).
 * For AIR: shows Gross vs Volumetric (1:6000 default) and highlights the binding charge.
 * For SEA/LCL: shows 1 CBM = 1,000 kg W/M rule.
 * User can either enter total CBM directly OR length/width/height × pieces.
 */
export default function ChargeableWeightCalc({ mode, grossKg, volumeCbm, pieces, onChange }: Props) {
  const [factor, setFactor] = useState<keyof typeof AIR_DIM_FACTORS>('iata');
  const [useBox, setUseBox] = useState(false);
  const [l, setL] = useState<number | ''>('');
  const [w, setW] = useState<number | ''>('');
  const [h, setH] = useState<number | ''>('');

  // When the user types dims, recompute CBM
  useEffect(() => {
    if (!useBox) return;
    const L = Number(l), W = Number(w), H = Number(h);
    if (!L || !W || !H || !pieces) return;
    const cbm = (L * W * H * pieces) / 1_000_000;
    const res = mode === 'air'
      ? calcAirChargeableWeight(grossKg, { lengthCm: L, widthCm: W, heightCm: H, pieces }, factor)
      : { volumeWeightKg: cbm * 1000, chargeableWeightKg: Math.max(grossKg, cbm * 1000), isVolumetric: cbm * 1000 > grossKg };
    onChange({
      grossKg,
      volumeCbm: Number(cbm.toFixed(4)),
      chargeableKg: Number(res.chargeableWeightKg.toFixed(2)),
      pieces,
      dimsCm: { l: L, w: W, h: H },
    });
  }, [l, w, h, pieces, grossKg, useBox, mode, factor]);

  // When in direct-CBM mode (not box), recompute chargeable whenever gross/cbm/pieces change
  useEffect(() => {
    if (useBox) return;
    const res = mode === 'air'
      ? calcAirChargeableWeight(grossKg, { volumeCbm, pieces }, factor)
      : { volumeWeightKg: volumeCbm * 1000, chargeableWeightKg: Math.max(grossKg, volumeCbm * 1000), isVolumetric: volumeCbm * 1000 > grossKg };
    onChange({
      grossKg,
      volumeCbm,
      chargeableKg: Number(res.chargeableWeightKg.toFixed(2)),
      pieces,
    });
  }, [grossKg, volumeCbm, pieces, useBox, mode, factor]);

  const res = useMemo(() => {
    if (useBox && l && w && h && pieces) {
      return mode === 'air'
        ? calcAirChargeableWeight(grossKg, { lengthCm: Number(l), widthCm: Number(w), heightCm: Number(h), pieces }, factor)
        : null;
    }
    return mode === 'air'
      ? calcAirChargeableWeight(grossKg, { volumeCbm, pieces }, factor)
      : null;
  }, [grossKg, volumeCbm, pieces, l, w, h, useBox, mode, factor]);

  if (mode !== 'air') {
    // LCL: show a compact note only (W/M rule)
    const volKg = volumeCbm * 1000;
    const charge = Math.max(grossKg, volKg);
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 flex items-start gap-2 text-sm">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-amber-900 dark:text-amber-200">
          <div className="font-semibold">LCL W/M rule</div>
          <div className="text-xs mt-0.5">
            1 CBM = 1,000 kg. Chargeable = <b>MAX(gross {grossKg.toFixed(1)} kg, vol {volKg.toFixed(1)} kg)</b> =
            {' '}<b>{charge.toFixed(1)} kg ({(charge/1000).toFixed(3)} ton/m³)</b>
          </div>
        </div>
      </div>
    );
  }

  const volWeight = res?.volumeWeightKg ?? volumeCbm * 1_000_000 / AIR_DIM_FACTORS[factor];
  const charge = res?.chargeableWeightKg ?? Math.max(grossKg, volWeight);
  const isVol = volWeight > grossKg;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-200">
          <Calculator className="w-4 h-4" />
          Chargeable Weight · Air (IATA)
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500">Dim factor:</span>
          <select
            value={factor}
            onChange={(e) => setFactor(e.target.value as keyof typeof AIR_DIM_FACTORS)}
            className="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1"
          >
            <option value="iata">1:6000 (IATA standard)</option>
            <option value="express">1:5000 (express)</option>
            <option value="bulky">1:4000 (bulky)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/70 dark:bg-slate-900/50 p-2 border border-slate-200 dark:border-slate-700">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gross</div>
          <div className="text-base font-bold text-slate-800 dark:text-white">{grossKg.toFixed(1)}<span className="text-xs font-normal text-slate-500"> kg</span></div>
        </div>
        <div className="rounded-lg bg-white/70 dark:bg-slate-900/50 p-2 border border-slate-200 dark:border-slate-700">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Volumetric</div>
          <div className="text-base font-bold text-slate-800 dark:text-white">{volWeight.toFixed(1)}<span className="text-xs font-normal text-slate-500"> kg</span></div>
          <div className="text-[10px] text-slate-400">= {volumeCbm.toFixed(3)} CBM × {1e6/AIR_DIM_FACTORS[factor]}kg/m³</div>
        </div>
        <div className={`rounded-lg p-2 border-2 ${isVol ? 'bg-violet-500 text-white border-violet-600' : 'bg-emerald-500 text-white border-emerald-600'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-90">Chargeable</div>
          <div className="text-base font-bold">{charge.toFixed(1)}<span className="text-xs font-normal opacity-90"> kg</span></div>
          <div className="text-[10px] opacity-90">{isVol ? 'by volume' : 'by gross'}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUseBox(v => !v)}
          className={`text-xs font-semibold px-2 py-1 rounded-md border transition ${
            useBox
              ? 'bg-brand text-white border-brand'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
          }`}
        >
          <Ruler className="w-3 h-3 inline mr-1 -mt-0.5" />
          {useBox ? 'Use total CBM' : 'Enter box dimensions (cm)'}
        </button>
        <span className="text-[11px] text-slate-500">
          {pieces} {pieces === 1 ? 'piece' : 'pieces'} · {useBox && l && w && h ? `${l}×${w}×${h} cm/pc` : `${volumeCbm} CBM total`}
        </span>
      </div>

      {useBox && (
        <div className="grid grid-cols-3 gap-2">
          <DimInput label="Length (cm)" value={l} setValue={setL} icon={<Ruler className="w-3 h-3" />} />
          <DimInput label="Width (cm)" value={w} setValue={setW} icon={<Ruler className="w-3 h-3" />} />
          <DimInput label="Height (cm)" value={h} setValue={setH} icon={<Ruler className="w-3 h-3" />} />
        </div>
      )}
    </div>
  );
}

function DimInput({ label, value, setValue, icon }: { label: string; value: number | ''; setValue: (n: number | '') => void; icon?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-slate-500 mb-0.5">{label}</span>
      <div className="relative">
        {icon && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
          className={`w-full ${icon ? 'pl-7' : 'pl-2'} pr-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 outline-none focus:border-brand`}
        />
      </div>
    </label>
  );
}
