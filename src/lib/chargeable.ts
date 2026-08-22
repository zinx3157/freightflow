// ============================================================
// Freight chargeable-weight calculators (air & LCL)
// ============================================================

// Air freight volumetric (dimensional) factors — industry standard
//   IATA passenger/cargo standard: 1:6000  (1 kg = 6,000 cm³ = 0.006 CBM)
//   Express/courier (DHL/FedEx/UPS domestic): 1:5000
//   Heavy/bulky variant: 1:4000 (rare)
// We default to IATA 1:6000 which is what Air Madagascar, Ethiopian,
// Kenya Airways, Air France KLM Martinair Cargo, Cargolux etc. all apply.
export const AIR_DIM_FACTORS = {
  iata: 6000,        // cm³/kg — standard air cargo
  express: 5000,     // courier
  bulky: 4000,       // rare carrier option
} as const;

// LCL sea freight: 1 CBM = 1,000 kg (1:1000) per W/M rule
export const LCL_DIM_FACTOR_CBM_PER_KG = 0.001; // 1 ton per m³

export type AirDims = {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  pieces?: number;
  // OR pass total volume directly
  volumeCbm?: number;
};

export type AirWeightResult = {
  grossWeightKg: number;
  volumeWeightKg: number;
  chargeableWeightKg: number;
  isVolumetric: boolean;  // true when volume weight > gross weight
  factor: number;
  pieces: number;
  volumeCbm: number;
  perPieceDimsCm?: { l: number; w: number; h: number };
  breakdown: string;
};

/**
 * Calculate chargeable weight for AIR freight the IATA way.
 * Chargeable weight = MAX(gross weight, volume weight)
 * Volume weight (kg)  = (L × W × H cm × pieces) / dimFactor
 * If you already know total CBM, volume weight = CBM × 1,000,000 / factor.
 */
export function calcAirChargeableWeight(
  grossKg: number,
  dims: AirDims,
  factor: keyof typeof AIR_DIM_FACTORS | number = 'iata',
): AirWeightResult {
  const f = typeof factor === 'number' ? factor : AIR_DIM_FACTORS[factor];
  let volumeCbm = dims.volumeCbm ?? 0;
  let perPiece: { l: number; w: number; h: number } | undefined;

  if (!volumeCbm && dims.lengthCm && dims.widthCm && dims.heightCm) {
    const pcs = dims.pieces ?? 1;
    perPiece = { l: dims.lengthCm, w: dims.widthCm, h: dims.heightCm };
    const totalCm3 = dims.lengthCm * dims.widthCm * dims.heightCm * pcs;
    volumeCbm = totalCm3 / 1_000_000;
  }
  const volumeWeightKg = volumeCbm ? (volumeCbm * 1_000_000) / f : 0;
  const pieces = dims.pieces ?? 1;
  const chargeableWeightKg = Math.max(grossKg, volumeWeightKg);
  const isVolumetric = volumeWeightKg > grossKg;
  const breakdown = isVolumetric
    ? `Volumetric (${volumeWeightKg.toFixed(1)} kg) > Gross (${grossKg.toFixed(1)} kg) → charged by volume at 1:${f}`
    : `Gross (${grossKg.toFixed(1)} kg) > Volumetric (${volumeWeightKg.toFixed(1)} kg) → charged by gross weight at 1:${f}`;

  return {
    grossWeightKg: grossKg,
    volumeWeightKg,
    chargeableWeightKg,
    isVolumetric,
    factor: f,
    pieces,
    volumeCbm,
    perPieceDimsCm: perPiece,
    breakdown,
  };
}

/**
 * LCL W/M (weight/measurement): 1 CBM = 1,000 kg;
 * chargeable = MAX(weight in tons, volume in CBM) → billable unit is "ton/m³".
 */
export function calcLclChargeable(grossKg: number, volumeCbm: number) {
  const weightTons = grossKg / 1000;
  const chargeable = Math.max(weightTons, volumeCbm);
  return {
    grossWeightKg: grossKg,
    grossWeightTons: weightTons,
    volumeCbm,
    chargeableTons: chargeable,
    isVolumetric: volumeCbm > weightTons,
  };
}
