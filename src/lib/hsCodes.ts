'use client';

// Curated HS-6 code database with commodity keywords & duty rates for common destinations.
// Used by the AI-powered tariff classifier. Duties are *estimates* (bound/MFN rates) for
// quick quoting; final rates always require broker review.
export interface HSCodeEntry {
  hs6: string;           // 6-digit HS code
  description: string;   // official short description
  section: string;       // section name (e.g. "Vegetable Products")
  unit?: string;         // declared unit
  keywords: string[];    // fuzzy match keywords
  // Typical MFN duty rate (ad-valorem %) for key destinations
  duty: {
    MG?: number;   // Madagascar (import)
    EU?: number;   // European Union
    US?: number;   // United States
    CN?: number;   // China
    ZA?: number;   // South Africa
    AE?: number;   // UAE
    MU?: number;   // Mauritius
    IN?: number;   // India
    default: number;
  };
  restricted?: boolean;       // requires license / permit
  perishable?: boolean;       // e.g. cold-chain
  dangerous?: boolean;        // IMDG/IATA DGR
  co2Factor?: number;         // kg CO2e per kg of commodity (lifecycle)
}

export const HS_CODES: HSCodeEntry[] = [
  {
    hs6: '0905.10',
    description: 'Vanilla, neither crushed nor ground',
    section: 'Vegetable Products',
    keywords: ['vanilla', 'vanille', 'vanilla bean', 'vanilla beans', 'bourbon vanilla'],
    duty: { MG: 20, EU: 0, US: 0, CN: 15, ZA: 0, AE: 5, MU: 0, IN: 30, default: 5 },
    perishable: true,
  },
  {
    hs6: '0907.10',
    description: 'Cloves (whole fruit, cloves and stems)',
    section: 'Coffee, Tea & Spices',
    keywords: ['clove', 'cloves', 'girofle'],
    duty: { MG: 20, EU: 0, US: 0, CN: 15, ZA: 0, AE: 5, MU: 0, IN: 30, default: 5 },
  },
  {
    hs6: '0908.31',
    description: 'Cardamoms',
    section: 'Coffee, Tea & Spices',
    keywords: ['cardamom', 'cardamoms', 'cardamome'],
    duty: { default: 5 },
  },
  {
    hs6: '0910.11',
    description: 'Pepper, black',
    section: 'Spices',
    keywords: ['pepper', 'black pepper', 'poivre noir'],
    duty: { default: 0 },
  },
  {
    hs6: '0902.40',
    description: 'Black tea (fermented)',
    section: 'Tea',
    keywords: ['tea', 'black tea', 'thé noir'],
    duty: { default: 0 },
  },
  {
    hs6: '0801.31',
    description: 'Cashew nuts, fresh or dried, in shell',
    section: 'Edible Fruit & Nuts',
    keywords: ['cashew', 'cashews', 'noix de cajou'],
    duty: { default: 5 },
  },
  {
    hs6: '0306.17',
    description: 'Shrimps and prawns, frozen',
    section: 'Fish & Crustaceans',
    keywords: ['shrimp', 'prawn', 'crevette', 'seafood'],
    duty: { EU: 12, US: 0, CN: 15, default: 12 },
    perishable: true,
  },
  {
    hs6: '0603.11',
    description: 'Roses, cut flowers',
    section: 'Live Plants / Flowers',
    keywords: ['flower', 'roses', 'fleurs', 'rose'],
    duty: { EU: 8.5, default: 10 },
    perishable: true,
  },
  {
    hs6: '5201.00',
    description: 'Cotton, not carded or combed',
    section: 'Textiles',
    keywords: ['cotton', 'coton', 'raw cotton'],
    duty: { default: 0 },
  },
  {
    hs6: '6109.10',
    description: 'T-shirts, knitted or crocheted, of cotton',
    section: 'Apparel',
    keywords: ['tshirt', 't-shirt', 'garment', 'apparel', 'clothing', 'vetement', 'textile'],
    duty: { EU: 12, US: 16.5, default: 12 },
  },
  {
    hs6: '6205.20',
    description: 'Men\'s shirts of cotton',
    section: 'Apparel',
    keywords: ['shirt', 'shirts', 'chemise'],
    duty: { default: 12 },
  },
  {
    hs6: '8517.13',
    description: 'Smartphones for cellular networks',
    section: 'Electronics',
    keywords: ['phone', 'smartphone', 'mobile', 'telephone', 'cellphone', 'iphone', 'samsung'],
    duty: { MG: 20, EU: 0, US: 0, default: 0 },
  },
  {
    hs6: '8471.30',
    description: 'Portable automatic data processing machines (laptops/tablets)',
    section: 'Machinery / Electronics',
    keywords: ['laptop', 'tablet', 'computer', 'ordinateur'],
    duty: { default: 0 },
  },
  {
    hs6: '8471.70',
    description: 'Storage units (HDD/SSD)',
    section: 'Machinery / Electronics',
    keywords: ['hard drive', 'ssd', 'storage', 'hdd'],
    duty: { default: 0 },
  },
  {
    hs6: '8525.80',
    description: 'Television cameras / digital cameras',
    section: 'Electronics',
    keywords: ['camera', 'dslr', 'video camera'],
    duty: { default: 4.2 },
  },
  {
    hs6: '8703.23',
    description: 'Motor cars, spark-ignition, 1500-3000cc',
    section: 'Vehicles',
    keywords: ['car', 'vehicle', 'automobile', 'voiture'],
    duty: { MG: 40, EU: 10, default: 10 },
  },
  {
    hs6: '3004.90',
    description: 'Medicaments (packaged for retail sale), other',
    section: 'Pharmaceuticals',
    keywords: ['medicine', 'pharmaceutical', 'pharma', 'medicament', 'drug', 'vaccine', 'vaccin', 'medication'],
    duty: { MG: 5, EU: 0, US: 0, default: 0 },
    perishable: true,
  },
  {
    hs6: '3002.20',
    description: 'Vaccines for human medicine',
    section: 'Pharmaceuticals',
    keywords: ['vaccine', 'vaccins', 'vaccines', 'cold chain'],
    duty: { default: 0 },
    perishable: true,
  },
  {
    hs6: '8481.80',
    description: 'Taps, cocks, valves and similar appliances',
    section: 'Machinery',
    keywords: ['valve', 'spare parts', 'parts', 'mechanical', 'taps'],
    duty: { default: 2.7 },
  },
  {
    hs6: '8431.49',
    description: 'Parts of machinery (construction/mining)',
    section: 'Machinery',
    keywords: ['spare part', 'spare parts', 'parts', 'machinery parts'],
    duty: { default: 0 },
  },
  {
    hs6: '7214.20',
    description: 'Steel bars/rods (rebar) for construction',
    section: 'Metals',
    keywords: ['steel', 'rebar', 'iron', 'construction material', 'metal', 'fer'],
    duty: { default: 7 },
  },
  {
    hs6: '2523.29',
    description: 'Portland cement (other than white)',
    section: 'Mineral Products',
    keywords: ['cement', 'ciment', 'construction materials'],
    duty: { default: 0 },
  },
  {
    hs6: '1006.30',
    description: 'Semi-milled or wholly milled rice',
    section: 'Vegetable Products',
    keywords: ['rice', 'riz'],
    duty: { default: 0 },
  },
  {
    hs6: '1701.99',
    description: 'Cane or beet sugar',
    section: 'Sugars',
    keywords: ['sugar', 'sucre'],
    duty: { default: 0 },
  },
  {
    hs6: '2203.00',
    description: 'Beer made from malt',
    section: 'Beverages',
    keywords: ['beer', 'biere', 'alcohol'],
    duty: { default: 0, restricted: true } as any,
    restricted: true,
  },
  {
    hs6: '0803.10',
    description: 'Bananas, fresh or dried',
    section: 'Fruit',
    keywords: ['banana', 'bananes', 'fresh produce'],
    duty: { EU: 176, default: 10 },
    perishable: true,
  },
  {
    hs6: '0804.50',
    description: 'Mangoes, guavas, mangosteens',
    section: 'Fruit',
    keywords: ['mango', 'mangue', 'guava', 'fruit', 'fresh produce', 'litchi', 'lychee'],
    duty: { default: 0 },
    perishable: true,
  },
  {
    hs6: '4901.99',
    description: 'Printed books/brochures/leaflets',
    section: 'Printed Matter',
    keywords: ['document', 'documents', 'samples', 'paper', 'brochure'],
    duty: { default: 0 },
  },
  {
    hs6: '8523.51',
    description: 'Solid-state non-volatile storage (USB/SSD)',
    section: 'Electronics',
    keywords: ['usb', 'flash drive', 'memory card'],
    duty: { default: 0 },
  },
  {
    hs6: '6203.42',
    description: 'Men\'s cotton trousers',
    section: 'Apparel',
    keywords: ['pants', 'trousers', 'pantalon', 'clothing'],
    duty: { default: 12 },
  },
  {
    hs6: '2710.19',
    description: 'Petroleum oils (other than crude)',
    section: 'Mineral Fuels',
    keywords: ['fuel', 'diesel', 'petrol', 'oil', 'gasoil'],
    duty: { default: 0 },
    dangerous: true,
  },
  {
    hs6: '8507.60',
    description: 'Lithium-ion batteries',
    section: 'Electrical Machinery',
    keywords: ['battery', 'lithium', 'li-ion'],
    duty: { default: 2.7 },
    dangerous: true,
  },
];

export function classifyCommodity(text: string): HSCodeEntry[] {
  if (!text) return [];
  const q = text.toLowerCase();
  const scored: { e: HSCodeEntry; s: number }[] = [];
  for (const e of HS_CODES) {
    let s = 0;
    if (e.description.toLowerCase().includes(q)) s += 5;
    for (const kw of e.keywords) {
      const k = kw.toLowerCase();
      if (k === q) s += 10;
      else if (q.includes(k) || k.includes(q)) s += 4;
      // word overlap
      else {
        const qWords = q.split(/\s+/);
        for (const w of qWords) if (w.length > 2 && k.includes(w)) s += 1;
      }
    }
    if (s > 0) scored.push({ e, s });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.e);
}

export function estimateDuty(entry: HSCodeEntry, destinationCountry: string, customsValue: number): {
  rate: number;
  amount: number;
} {
  const dest = (destinationCountry || '').toUpperCase();
  const key =
    dest.includes('MADAGASCAR') || dest.endsWith(', MG') ? 'MG'
    : dest.includes('GERMAN') || dest.includes('FRANCE') || dest.includes('NETHERLAND') || dest.includes('ITALY') || dest.includes('SPAIN') || dest.includes('EU') || dest.endsWith(', DE') || dest.endsWith(', FR') || dest.endsWith(', NL') || dest.endsWith(', IT') || dest.endsWith(', ES') || dest.endsWith(', BE') ? 'EU'
    : dest.includes('USA') || dest.includes('UNITED STATES') || dest.endsWith(', US') ? 'US'
    : dest.includes('CHINA') || dest.endsWith(', CN') ? 'CN'
    : dest.includes('SOUTH AFRICA') || dest.endsWith(', ZA') ? 'ZA'
    : dest.includes('UAE') || dest.includes('DUBAI') || dest.endsWith(', AE') ? 'AE'
    : dest.includes('MAURITIUS') || dest.endsWith(', MU') ? 'MU'
    : dest.includes('INDIA') || dest.endsWith(', IN') ? 'IN'
    : 'default';
  const rate = (entry.duty as any)[key] ?? entry.duty.default;
  return { rate, amount: Math.round(customsValue * (rate / 100)) };
}
