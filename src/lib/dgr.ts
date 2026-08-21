'use client';

// Common UN numbers relevant to an Indian Ocean / Africa forwarder
export interface DGInfo {
  unNumber: string;
  properShippingName: string;
  dgClass: string;
  packingGroup?: 'I' | 'II' | 'III';
  label: string;
  airPi?: string;   // IATA packing instruction
  seaEmS?: string;  // EMS codes
}

export const DG_LIBRARY: DGInfo[] = [
  { unNumber: 'UN3480', properShippingName: 'Lithium ion batteries', dgClass: '9', packingGroup: 'II', label: 'Class 9 — Miscellaneous', airPi: 'PI965', seaEmS: 'F-A, S-I' },
  { unNumber: 'UN3481', properShippingName: 'Lithium ion batteries packed with equipment', dgClass: '9', packingGroup: 'II', label: 'Class 9 — Miscellaneous', airPi: 'PI966', seaEmS: 'F-A, S-I' },
  { unNumber: 'UN3090', properShippingName: 'Lithium metal batteries', dgClass: '9', packingGroup: 'II', label: 'Class 9 — Miscellaneous', airPi: 'PI968' },
  { unNumber: 'UN1263', properShippingName: 'Paint (including paint, lacquer, enamel, stain, shellac, varnish, polish)', dgClass: '3', packingGroup: 'II', label: 'Class 3 — Flammable Liquid', airPi: 'PI353', seaEmS: 'F-E, S-E' },
  { unNumber: 'UN1993', properShippingName: 'Flammable liquid, n.o.s.', dgClass: '3', label: 'Class 3 — Flammable Liquid' },
  { unNumber: 'UN1203', properShippingName: 'Gasoline / Petrol', dgClass: '3', packingGroup: 'II', label: 'Class 3 — Flammable Liquid', airPi: 'PI364', seaEmS: 'F-E, S-E' },
  { unNumber: 'UN3082', properShippingName: 'Environmentally hazardous substance, liquid, n.o.s.', dgClass: '9', packingGroup: 'III', label: 'Class 9 — Miscellaneous (Marine Pollutant)', seaEmS: 'F-A, S-F' },
  { unNumber: 'UN3077', properShippingName: 'Environmentally hazardous substance, solid, n.o.s.', dgClass: '9', packingGroup: 'III', label: 'Class 9 — Miscellaneous (Marine Pollutant)', seaEmS: 'F-A, S-F' },
  { unNumber: 'UN1950', properShippingName: 'Aerosols', dgClass: '2.1', label: 'Class 2.1 — Flammable Gas', airPi: 'PI203', seaEmS: 'F-D, S-U' },
  { unNumber: 'UN1044', properShippingName: 'Fire extinguishers containing compressed or liquefied gas', dgClass: '2.2', label: 'Class 2.2 — Non-flammable Gas', airPi: 'PI208', seaEmS: 'F-C, S-W' },
  { unNumber: 'UN1866', properShippingName: 'Resin solution (paint/coating)', dgClass: '3', packingGroup: 'II', label: 'Class 3 — Flammable Liquid' },
  { unNumber: 'UN1987', properShippingName: 'Alcohols, n.o.s.', dgClass: '3', label: 'Class 3 — Flammable Liquid' },
  { unNumber: 'UN3316', properShippingName: 'Chemical kit / First aid kit', dgClass: '9', label: 'Class 9 — Miscellaneous' },
  { unNumber: 'UN3245', properShippingName: 'Genetically modified micro-organisms', dgClass: '9', label: 'Class 9 — Miscellaneous' },
  { unNumber: 'UN3373', properShippingName: 'Biological substance, Category B', dgClass: '6.2', label: 'Class 6.2 — Infectious Substance', airPi: 'PI650' },
  { unNumber: 'UN2814', properShippingName: 'Infectious substance, affecting humans (Category A)', dgClass: '6.2', label: 'Class 6.2 — Category A Infectious', airPi: 'PI602' },
  { unNumber: 'UN2902', properShippingName: 'Pesticides, liquid, toxic, n.o.s.', dgClass: '6.1', label: 'Class 6.1 — Toxic' },
  { unNumber: 'UN1170', properShippingName: 'Ethanol (Ethyl alcohol)', dgClass: '3', packingGroup: 'II', label: 'Class 3 — Flammable Liquid', airPi: 'PI353', seaEmS: 'F-E, S-D' },
];

export function lookupUN(q: string): DGInfo[] {
  if (!q) return [];
  const s = q.toLowerCase();
  return DG_LIBRARY.filter(
    (d) => d.unNumber.toLowerCase().includes(s) || d.properShippingName.toLowerCase().includes(s)
  ).slice(0, 8);
}

export function classColor(cls?: string): { bg: string; text: string; ring: string } {
  if (!cls) return { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' };
  if (cls.startsWith('1')) return { bg: 'bg-orange-100', text: 'text-orange-800', ring: 'ring-orange-300' };
  if (cls.startsWith('2.1')) return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-300' };
  if (cls.startsWith('2.2')) return { bg: 'bg-emerald-100', text: 'text-emerald-800', ring: 'ring-emerald-300' };
  if (cls.startsWith('2.3')) return { bg: 'bg-white', text: 'text-red-800', ring: 'ring-red-400' };
  if (cls === '3') return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-400' };
  if (cls.startsWith('4')) return { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-300' };
  if (cls.startsWith('5')) return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-400' };
  if (cls.startsWith('6')) return { bg: 'bg-white', text: 'text-red-800', ring: 'ring-red-500' };
  if (cls.startsWith('7')) return { bg: 'bg-yellow-100', text: 'text-yellow-900', ring: 'ring-yellow-500' };
  if (cls === '8') return { bg: 'bg-white', text: 'text-slate-900', ring: 'ring-slate-500' };
  if (cls === '9') return { bg: 'bg-slate-100', text: 'text-slate-800', ring: 'ring-slate-400' };
  return { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300' };
}

export function formatBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}
