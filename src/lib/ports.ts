// ============================================================
// FreightFlow port/airport directory — used for POL/POD autocomplete
// IATA airports (air) + UN/LOCODE seaports (sea).
// Sorted by relevance to Madagascar / Indian Ocean / Africa / Europe / Asia trades.
// ============================================================

export type Port = {
  code: string;          // IATA (air) or UN/LOCODE (sea)
  name: string;          // e.g. "Ivato International Airport"
  city: string;          // e.g. "Antananarivo"
  country: string;       // e.g. "Madagascar"
  countryCode: string;   // e.g. "MG"
  type: 'air' | 'sea' | 'both';
  region?: string;       // for rough relevance
};

export const PORTS: Port[] = [
  // ============ MADAGASCAR ============
  { code: 'TNR', name: 'Ivato International Airport', city: 'Antananarivo', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'TMM', name: 'Toamasina Airport', city: 'Toamasina (Tamatave)', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'DIE', name: 'Arrachart Airport', city: 'Antsiranana (Diego-Suarez)', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'MJN', name: 'Amborovy Airport', city: 'Mahajanga', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'TLE', name: 'Toliara Airport', city: 'Toliara (Tulear)', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'FTU', name: 'Tôlanaro Airport', city: 'Tôlanaro (Fort-Dauphin)', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'NOS', name: 'Fascene Airport', city: 'Nosy Be', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'MNK', name: 'Manakara Airport', city: 'Manakara', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'MJT', name: 'Mananjary Airport', city: 'Mananjary', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'MGA', name: 'Sambava Airport', city: 'Sambava', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },
  { code: 'VAT', name: 'Vatomandry Airport', city: 'Vatomandry', country: 'Madagascar', countryCode: 'MG', type: 'air', region: 'MG' },

  { code: 'MGTOA', name: 'Port de Toamasina (Tamatave)', city: 'Toamasina', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGDIE', name: 'Port d\'Antsiranana (Diego-Suarez)', city: 'Antsiranana', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGTLE', name: 'Port de Toliara (Tulear)', city: 'Toliara', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGEHL', name: 'Port d\'Ehoala (Fort-Dauphin)', city: 'Tôlanaro', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGMJN', name: 'Port de Mahajanga', city: 'Mahajanga', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGNOS', name: 'Port de Nosy Be (Hell-Ville)', city: 'Nosy Be', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },
  { code: 'MGVAT', name: 'Port de Vatomandry', city: 'Vatomandry', country: 'Madagascar', countryCode: 'MG', type: 'sea', region: 'MG' },

  // ============ INDIAN OCEAN ISLANDS ============
  { code: 'MRU', name: 'Sir Seewoosagur Ramgoolam International', city: 'Port Louis', country: 'Mauritius', countryCode: 'MU', type: 'both', region: 'IO' },
  { code: 'RUN', name: 'Roland Garros Airport', city: 'Saint-Denis', country: 'Réunion', countryCode: 'RE', type: 'air', region: 'IO' },
  { code: 'ZSE', name: 'Pierrefonds Airport', city: 'Saint-Pierre', country: 'Réunion', countryCode: 'RE', type: 'air', region: 'IO' },
  { code: 'REZSE', name: 'Port de la Pointe-des-Galets', city: 'Le Port', country: 'Réunion', countryCode: 'RE', type: 'sea', region: 'IO' },
  { code: 'SEZ', name: 'Seychelles International', city: 'Victoria (Mahé)', country: 'Seychelles', countryCode: 'SC', type: 'both', region: 'IO' },
  { code: 'DZA', name: 'Dzaoudzi–Pamandzi International', city: 'Dzaoudzi (Mayotte)', country: 'Mayotte', countryCode: 'YT', type: 'air', region: 'IO' },
  { code: 'YTDZA', name: 'Port de Longoni (Mayotte)', city: 'Longoni', country: 'Mayotte', countryCode: 'YT', type: 'sea', region: 'IO' },
  { code: 'HAH', name: 'Prince Said Ibrahim International', city: 'Moroni', country: 'Comoros', countryCode: 'KM', type: 'air', region: 'IO' },
  { code: 'KMPRN', name: 'Port de Moroni', city: 'Moroni', country: 'Comoros', countryCode: 'KM', type: 'sea', region: 'IO' },
  { code: 'CDG', name: 'Not for IO (skipped) — see France', city: '', country: '', countryCode: '', type: 'air' },

  // ============ AFRICA (east/south/west) ============
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', type: 'air', region: 'AF' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', type: 'both', region: 'AF' },
  { code: 'DUR', name: 'King Shaka International', city: 'Durban', country: 'South Africa', countryCode: 'ZA', type: 'both', region: 'AF' },
  { code: 'ZADUR', name: 'Port of Durban', city: 'Durban', country: 'South Africa', countryCode: 'ZA', type: 'sea', region: 'AF' },
  { code: 'ZACPT', name: 'Port of Cape Town', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', type: 'sea', region: 'AF' },
  { code: 'ZAPLZ', name: 'Port Elizabeth (Ngqura)', city: 'Port Elizabeth', country: 'South Africa', countryCode: 'ZA', type: 'sea', region: 'AF' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', type: 'air', region: 'AF' },
  { code: 'KEMBA', name: 'Port of Mombasa', city: 'Mombasa', country: 'Kenya', countryCode: 'KE', type: 'both', region: 'AF' },
  { code: 'MBA', name: 'Moi International Airport', city: 'Mombasa', country: 'Kenya', countryCode: 'KE', type: 'air', region: 'AF' },
  { code: 'DAR', name: 'Julius Nyerere International', city: 'Dar es Salaam', country: 'Tanzania', countryCode: 'TZ', type: 'both', region: 'AF' },
  { code: 'TZDAR', name: 'Port of Dar es Salaam', city: 'Dar es Salaam', country: 'Tanzania', countryCode: 'TZ', type: 'sea', region: 'AF' },
  { code: 'ZNZ', name: 'Abeid Amani Karume International', city: 'Zanzibar', country: 'Tanzania', countryCode: 'TZ', type: 'air', region: 'AF' },
  { code: 'ADD', name: 'Bole International', city: 'Addis Ababa', country: 'Ethiopia', countryCode: 'ET', type: 'air', region: 'AF' },
  { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'Egypt', countryCode: 'EG', type: 'air', region: 'AF' },
  { code: 'EGALY', name: 'Port of Alexandria (El Dekheila)', city: 'Alexandria', country: 'Egypt', countryCode: 'EG', type: 'sea', region: 'AF' },
  { code: 'LOS', name: 'Murtala Muhammed International', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', type: 'air', region: 'AF' },
  { code: 'NGLOS', name: 'Apapa Port (Lagos)', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', type: 'sea', region: 'AF' },
  { code: 'LAD', name: 'Quatro de Fevereiro Airport', city: 'Luanda', country: 'Angola', countryCode: 'AO', type: 'both', region: 'AF' },
  { code: 'AOLAD', name: 'Port of Luanda', city: 'Luanda', country: 'Angola', countryCode: 'AO', type: 'sea', region: 'AF' },
  { code: 'MPM', name: 'Maputo International', city: 'Maputo', country: 'Mozambique', countryCode: 'MZ', type: 'both', region: 'AF' },
  { code: 'MZMPM', name: 'Port of Maputo', city: 'Maputo', country: 'Mozambique', countryCode: 'MZ', type: 'sea', region: 'AF' },
  { code: 'BEW', name: 'Beira Airport', city: 'Beira', country: 'Mozambique', countryCode: 'MZ', type: 'both', region: 'AF' },
  { code: 'MZBEW', name: 'Port of Beira', city: 'Beira', country: 'Mozambique', countryCode: 'MZ', type: 'sea', region: 'AF' },
  { code: 'DLA', name: 'Douala International', city: 'Douala', country: 'Cameroon', countryCode: 'CM', type: 'both', region: 'AF' },
  { code: 'ABJ', name: 'Félix-Houphouët-Boigny International', city: 'Abidjan', country: 'Côte d\'Ivoire', countryCode: 'CI', type: 'both', region: 'AF' },
  { code: 'FIH', name: 'N\'Djili International (Kinshasa)', city: 'Kinshasa', country: 'DR Congo', countryCode: 'CD', type: 'air', region: 'AF' },
  { code: 'CMR', name: '(unused) — see below', city: '', country: '', countryCode: '', type: 'air' },

  // ============ MIDDLE EAST / GULF ============
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', countryCode: 'AE', type: 'air', region: 'ME' },
  { code: 'DWC', name: 'Al Maktoum International (DWC)', city: 'Dubai', country: 'UAE', countryCode: 'AE', type: 'air', region: 'ME' },
  { code: 'AUH', name: 'Zayed International', city: 'Abu Dhabi', country: 'UAE', countryCode: 'AE', type: 'air', region: 'ME' },
  { code: 'AEDXB', name: 'Jebel Ali Port (Mina Jebel Ali)', city: 'Dubai', country: 'UAE', countryCode: 'AE', type: 'sea', region: 'ME' },
  { code: 'AEKLF', name: 'Port Khor Al Fakkan', city: 'Khor Fakkan', country: 'UAE', countryCode: 'AE', type: 'sea', region: 'ME' },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', countryCode: 'QA', type: 'both', region: 'ME' },
  { code: 'QAHMD', name: 'Hamad Port', city: 'Doha', country: 'Qatar', countryCode: 'QA', type: 'sea', region: 'ME' },
  { code: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', type: 'air', region: 'ME' },
  { code: 'SAJED', name: 'Jeddah Islamic Port', city: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', type: 'sea', region: 'ME' },
  { code: 'MCT', name: 'Muscat International', city: 'Muscat', country: 'Oman', countryCode: 'OM', type: 'air', region: 'ME' },
  { code: 'OMMCT', name: 'Port Sultan Qaboos', city: 'Muscat', country: 'Oman', countryCode: 'OM', type: 'sea', region: 'ME' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', type: 'air', region: 'ME' },
  { code: 'TRAMB', name: 'Ambarlı Port (Istanbul)', city: 'Istanbul', country: 'Turkey', countryCode: 'TR', type: 'sea', region: 'ME' },
  { code: 'TRMRS', name: 'Port of Mersin', city: 'Mersin', country: 'Turkey', countryCode: 'TR', type: 'sea', region: 'ME' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'India', countryCode: 'IN', type: 'air', region: 'ME' },
  { code: 'INNSA', name: 'Nhava Sheva (JNPT)', city: 'Mumbai', country: 'India', countryCode: 'IN', type: 'sea', region: 'ME' },
  { code: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', countryCode: 'IN', type: 'air', region: 'ME' },
  { code: 'INMAA', name: 'Port of Chennai', city: 'Chennai', country: 'India', countryCode: 'IN', type: 'sea', region: 'ME' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', countryCode: 'IN', type: 'air', region: 'ME' },
  { code: 'KHI', name: 'Jinnah International', city: 'Karachi', country: 'Pakistan', countryCode: 'PK', type: 'both', region: 'ME' },
  { code: 'CMB', name: 'Bandaranaike International', city: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', type: 'air', region: 'ME' },
  { code: 'LKCMB', name: 'Port of Colombo', city: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', type: 'sea', region: 'ME' },

  // ============ EUROPE ============
  { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France', countryCode: 'FR', type: 'air', region: 'EU' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris', country: 'France', countryCode: 'FR', type: 'air', region: 'EU' },
  { code: 'FRLEH', name: 'Port du Havre', city: 'Le Havre', country: 'France', countryCode: 'FR', type: 'sea', region: 'EU' },
  { code: 'FRMRS', name: 'Port de Marseille-Fos', city: 'Marseille', country: 'France', countryCode: 'FR', type: 'sea', region: 'EU' },
  { code: 'FRLIL', name: 'Port de Dunkerque', city: 'Dunkerque', country: 'France', countryCode: 'FR', type: 'sea', region: 'EU' },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', countryCode: 'GB', type: 'air', region: 'EU' },
  { code: 'FXT', name: 'London Felixstowe (sea)', city: 'Felixstowe', country: 'United Kingdom', countryCode: 'GB', type: 'sea', region: 'EU' },
  { code: 'GBFXT', name: 'Port of Felixstowe', city: 'Felixstowe', country: 'United Kingdom', countryCode: 'GB', type: 'sea', region: 'EU' },
  { code: 'GBSOU', name: 'Port of Southampton', city: 'Southampton', country: 'United Kingdom', countryCode: 'GB', type: 'sea', region: 'EU' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', type: 'both', region: 'EU' },
  { code: 'NLRTM', name: 'Port of Rotterdam', city: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', type: 'sea', region: 'EU' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', type: 'air', region: 'EU' },
  { code: 'DEHAM', name: 'Port of Hamburg', city: 'Hamburg', country: 'Germany', countryCode: 'DE', type: 'sea', region: 'EU' },
  { code: 'DEBRV', name: 'Port of Bremerhaven', city: 'Bremerhaven', country: 'Germany', countryCode: 'DE', type: 'sea', region: 'EU' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium', countryCode: 'BE', type: 'air', region: 'EU' },
  { code: 'BEANR', name: 'Port of Antwerp-Bruges', city: 'Antwerp', country: 'Belgium', countryCode: 'BE', type: 'sea', region: 'EU' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas', city: 'Madrid', country: 'Spain', countryCode: 'ES', type: 'air', region: 'EU' },
  { code: 'BCN', name: 'Josep Tarradellas Barcelona–El Prat', city: 'Barcelona', country: 'Spain', countryCode: 'ES', type: 'air', region: 'EU' },
  { code: 'ESALG', name: 'Port of Algeciras', city: 'Algeciras', country: 'Spain', countryCode: 'ES', type: 'sea', region: 'EU' },
  { code: 'ESBCN', name: 'Port of Barcelona', city: 'Barcelona', country: 'Spain', countryCode: 'ES', type: 'sea', region: 'EU' },
  { code: 'ESVLC', name: 'Port of Valencia', city: 'Valencia', country: 'Spain', countryCode: 'ES', type: 'sea', region: 'EU' },
  { code: 'MXP', name: 'Milan Malpensa', city: 'Milan', country: 'Italy', countryCode: 'IT', type: 'air', region: 'EU' },
  { code: 'ITGOA', name: 'Port of Genoa', city: 'Genoa', country: 'Italy', countryCode: 'IT', type: 'sea', region: 'EU' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', type: 'air', region: 'EU' },
  { code: 'VIE', name: 'Vienna International', city: 'Vienna', country: 'Austria', countryCode: 'AT', type: 'air', region: 'EU' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', countryCode: 'DE', type: 'air', region: 'EU' },
  { code: 'LIS', name: 'Humberto Delgado Airport (Lisbon)', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', type: 'air', region: 'EU' },
  { code: 'PTLIS', name: 'Port of Lisbon', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', type: 'sea', region: 'EU' },
  { code: 'WAW', name: 'Warsaw Chopin', city: 'Warsaw', country: 'Poland', countryCode: 'PL', type: 'air', region: 'EU' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', type: 'air', region: 'EU' },
  { code: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', type: 'air', region: 'EU' },
  { code: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', countryCode: 'NO', type: 'air', region: 'EU' },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'Greece', countryCode: 'GR', type: 'both', region: 'EU' },
  { code: 'GRPIR', name: 'Port of Piraeus', city: 'Athens', country: 'Greece', countryCode: 'GR', type: 'sea', region: 'EU' },

  // ============ ASIA ============
  { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore', countryCode: 'SG', type: 'both', region: 'AS' },
  { code: 'SGSIN', name: 'Port of Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', type: 'sea', region: 'AS' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', type: 'both', region: 'AS' },
  { code: 'HKHKG', name: 'Port of Hong Kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', type: 'sea', region: 'AS' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'China', countryCode: 'CN', type: 'air', region: 'AS' },
  { code: 'CNSHA', name: 'Port of Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', type: 'sea', region: 'AS' },
  { code: 'CNNGB', name: 'Port of Ningbo-Zhoushan', city: 'Ningbo', country: 'China', countryCode: 'CN', type: 'sea', region: 'AS' },
  { code: 'CNSZX', name: 'Shenzhen & Yantian Ports', city: 'Shenzhen', country: 'China', countryCode: 'CN', type: 'sea', region: 'AS' },
  { code: 'SZX', name: 'Shenzhen Bao\'an International', city: 'Shenzhen', country: 'China', countryCode: 'CN', type: 'air', region: 'AS' },
  { code: 'CAN', name: 'Guangzhou Baiyun International', city: 'Guangzhou', country: 'China', countryCode: 'CN', type: 'air', region: 'AS' },
  { code: 'CNTAO', name: 'Port of Qingdao', city: 'Qingdao', country: 'China', countryCode: 'CN', type: 'sea', region: 'AS' },
  { code: 'CNTSN', name: 'Port of Tianjin', city: 'Tianjin', country: 'China', countryCode: 'CN', type: 'sea', region: 'AS' },
  { code: 'XMN', name: 'Xiamen Gaoqi International', city: 'Xiamen', country: 'China', countryCode: 'CN', type: 'both', region: 'AS' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'China', countryCode: 'CN', type: 'air', region: 'AS' },
  { code: 'NRT', name: 'Narita International', city: 'Tokyo', country: 'Japan', countryCode: 'JP', type: 'air', region: 'AS' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', countryCode: 'JP', type: 'air', region: 'AS' },
  { code: 'JPTYO', name: 'Port of Tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', type: 'sea', region: 'AS' },
  { code: 'JPYOK', name: 'Port of Yokohama', city: 'Yokohama', country: 'Japan', countryCode: 'JP', type: 'sea', region: 'AS' },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', countryCode: 'KR', type: 'air', region: 'AS' },
  { code: 'KRINC', name: 'Port of Incheon', city: 'Incheon', country: 'South Korea', countryCode: 'KR', type: 'sea', region: 'AS' },
  { code: 'KRPUS', name: 'Port of Busan', city: 'Busan', country: 'South Korea', countryCode: 'KR', type: 'sea', region: 'AS' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', type: 'both', region: 'AS' },
  { code: 'THBKK', name: 'Port of Bangkok (Laem Chabang)', city: 'Laem Chabang', country: 'Thailand', countryCode: 'TH', type: 'sea', region: 'AS' },
  { code: 'SGN', name: 'Tan Son Nhat International', city: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', type: 'air', region: 'AS' },
  { code: 'VNSGN', name: 'Cat Lai Port (HCMC)', city: 'Ho Chi Minh City', country: 'Vietnam', countryCode: 'VN', type: 'sea', region: 'AS' },
  { code: 'HAI', name: 'Noi Bai International', city: 'Hanoi', country: 'Vietnam', countryCode: 'VN', type: 'air', region: 'AS' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia', countryCode: 'MY', type: 'air', region: 'AS' },
  { code: 'MYPKG', name: 'Port Klang', city: 'Klang', country: 'Malaysia', countryCode: 'MY', type: 'sea', region: 'AS' },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', type: 'air', region: 'AS' },
  { code: 'IDTPP', name: 'Tanjung Priok Port', city: 'Jakarta', country: 'Indonesia', countryCode: 'ID', type: 'sea', region: 'AS' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'Philippines', countryCode: 'PH', type: 'both', region: 'AS' },

  // ============ AMERICAS ============
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'USNYC', name: 'Port of New York / New Jersey', city: 'New York', country: 'USA', countryCode: 'US', type: 'sea', region: 'AM' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'USLAX', name: 'Port of Los Angeles / Long Beach', city: 'Los Angeles', country: 'USA', countryCode: 'US', type: 'sea', region: 'AM' },
  { code: 'ORD', name: 'O\'Hare International', city: 'Chicago', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington DC', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'USA', countryCode: 'US', type: 'both', region: 'AM' },
  { code: 'USMIA', name: 'PortMiami', city: 'Miami', country: 'USA', countryCode: 'US', type: 'sea', region: 'AM' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'USHOU', name: 'Port of Houston', city: 'Houston', country: 'USA', countryCode: 'US', type: 'sea', region: 'AM' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta', country: 'USA', countryCode: 'US', type: 'air', region: 'AM' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', countryCode: 'CA', type: 'air', region: 'AM' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', countryCode: 'CA', type: 'both', region: 'AM' },
  { code: 'GRU', name: 'São Paulo Guarulhos International', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', type: 'air', region: 'AM' },
  { code: 'BRSSZ', name: 'Port of Santos', city: 'Santos (SP)', country: 'Brazil', countryCode: 'BR', type: 'sea', region: 'AM' },
  { code: 'BUE', name: 'Ministro Pistarini (Ezeiza)', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', type: 'air', region: 'AM' },
  { code: 'ARBUE', name: 'Port of Buenos Aires', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', type: 'sea', region: 'AM' },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'Chile', countryCode: 'CL', type: 'both', region: 'AM' },
  { code: 'MEX', name: 'Benito Juárez International (Mexico City)', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', type: 'air', region: 'AM' },
  { code: 'MXTAM', name: 'Port of Veracruz / Altamira / Manzanillo', city: 'Veracruz', country: 'Mexico', countryCode: 'MX', type: 'sea', region: 'AM' },
  { code: 'PTY', name: 'Tocumen International', city: 'Panama City', country: 'Panama', countryCode: 'PA', type: 'air', region: 'AM' },
  { code: 'PAPTY', name: 'Balboa / Cristóbal (Panama Canal)', city: 'Panama City', country: 'Panama', countryCode: 'PA', type: 'sea', region: 'AM' },

  // ============ OCEANIA ============
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', countryCode: 'AU', type: 'both', region: 'OC' },
  { code: 'AUMEL', name: 'Port of Melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', type: 'sea', region: 'OC' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', countryCode: 'AU', type: 'air', region: 'OC' },
  { code: 'AUSYD', name: 'Port Botany (Sydney)', city: 'Sydney', country: 'Australia', countryCode: 'AU', type: 'sea', region: 'OC' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', countryCode: 'AU', type: 'air', region: 'OC' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', type: 'both', region: 'OC' },
];

// Filter out empty placeholders
export const PORT_DIRECTORY: Port[] = PORTS.filter(p => p.city && p.country && p.code.length >= 3 && !p.name.includes('(unused)') && !p.name.includes('skipped'));

export function searchPorts(query: string, mode?: 'air' | 'sea', limit = 8): Port[] {
  let q = query.trim().toLowerCase();
  // If user typed a selection like "Toamasina (MGTOA)" they may continue typing to refine;
  // strip the parenthetical code so the rest still matches ("toamasina" etc).
  q = q.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) {
    // Return Madagascar + regional defaults when nothing typed
    return PORT_DIRECTORY
      .filter(p => !mode || p.type === mode || p.type === 'both')
      .sort((a, b) => {
        const score = (p: Port) =>
          (p.countryCode === 'MG' ? 0 : p.region === 'IO' ? 1 : p.region === 'AF' ? 2 : p.region === 'EU' ? 3 : p.region === 'ME' ? 4 : p.region === 'AS' ? 5 : 6);
        return score(a) - score(b);
      })
      .slice(0, limit);
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Array<{ p: Port; score: number }> = [];
  for (const p of PORT_DIRECTORY) {
    if (mode && p.type !== mode && p.type !== 'both') continue;
    const hay = (p.code + ' ' + p.name + ' ' + p.city + ' ' + p.country + ' ' + (p.countryCode||'')).toLowerCase();
    // every token must match somewhere in hay
    if (!tokens.every(tok => hay.includes(tok))) continue;
    let score = 0;
    if (p.code.toLowerCase() === q) score -= 100;
    if (p.code.toLowerCase().startsWith(tokens[0])) score -= 50;
    if (p.city.toLowerCase().startsWith(tokens[0])) score -= 30;
    if (p.name.toLowerCase().startsWith(tokens[0])) score -= 20;
    if (p.countryCode === 'MG') score -= 15;
    if (p.city.toLowerCase() === q) score -= 40;
    // substring earlier = better
    const idx = hay.indexOf(tokens[0]);
    if (idx >= 0) score += Math.min(idx, 50);
    scored.push({ p, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map(s => s.p);
}

export function findPort(cityOrCode: string | undefined): Port | undefined {
  if (!cityOrCode) return undefined;
  const q = cityOrCode.trim();
  if (!q) return undefined;
  // Exact code match first
  const exactCode = PORT_DIRECTORY.find(p => p.code.toUpperCase() === q.toUpperCase());
  if (exactCode) return exactCode;
  const ql = q.toLowerCase();
  return PORT_DIRECTORY.find(p =>
    p.city.toLowerCase() === ql ||
    p.name.toLowerCase() === ql ||
    (p.city + ' (' + p.code + ')').toLowerCase() === ql
  );
}

export function formatPort(p: Port): string {
  return `${p.city} (${p.code})`;
}
