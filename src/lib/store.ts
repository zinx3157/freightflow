import { signFiscalInvoice } from './rsa';
import { getActiveBranch, getActiveCompany } from '@/components/SettingsPanel';
import type {
  Customer,
  Shipment,
  TruckingDispatch,
  Invoice,
  Quote,
  Activity,
  ContainerPackage,
  CarrierBooking,
  EmailLog,
  DGEntry,
  DocFile,
  RateCard,
  QuoteRequest,
  GpsPing,
  CustomsDeclaration,
  JournalEntry,
  CustomerNote,
  WarehouseReceipt,
  CargoItem,
  ShipmentLeg,
  InboundEmail,
  Pod,
  PortalMessage,
  YardMove,
  YardSlot,
  DocApproval,
  AppNotification,
  EInvoiceMeta,
} from './types';

const KEY = 'freight_saas_db_v9';

const EF = { air: 602, sea: 15, road: 110 };
const LANE_KM: Record<string, number> = {
  'toamasina-hamburg': 12500, 'tnr-cdg': 8800, 'shanghai-toamasina': 11500,
  'dxb-tnr': 5400, 'toamasina-rotterdam': 12800, 'tnr-mru': 1100,
  'nhavasheva-toamasina': 7500, 'tnr-jnb': 2200,
};
function estCo2(mode: 'air' | 'sea', weightKg: number, pol: string, pod: string): number {
  const tonnes = Math.max(weightKg, 1) / 1000;
  const keyA = `${(pol || '').toLowerCase().replace(/\s+/g, '-')}-${(pod || '').toLowerCase().replace(/\s+/g, '-')}`;
  const keyB = `${(pod || '').toLowerCase().replace(/\s+/g, '-')}-${(pol || '').toLowerCase().replace(/\s+/g, '-')}`;
  const km = LANE_KM[keyA] || LANE_KM[keyB] || (mode === 'air' ? 8000 : 11000);
  const grams = EF[mode] * tonnes * km;
  return Math.round(grams / 1000);
}

export interface DB {
  customers: Customer[];
  shipments: Shipment[];
  trucking: TruckingDispatch[];
  invoices: Invoice[];
  quotes: Quote[];
  activities: Activity[];
  containers: ContainerPackage[];
  bookings: CarrierBooking[];
  emails: EmailLog[];
  dg: DGEntry[];
  docs: DocFile[];
  rates: RateCard[];
  quoteRequests: QuoteRequest[];
  gpsPings: GpsPing[];
  customsDeclarations: CustomsDeclaration[];
  journal: JournalEntry[];
  customerNotes: CustomerNote[];
  // Batch 6
  warehouseReceipts: WarehouseReceipt[];
  cargoItems: CargoItem[];
  shipmentLegs: ShipmentLeg[];
  inboundEmails: InboundEmail[];
  pods: Pod[];
  // Batch 7
  portalMessages: PortalMessage[];
  yardMoves: YardMove[];
  yardSlots: YardSlot[];
  // Batch 8
  docApprovals: DocApproval[];
  notifications: AppNotification[];
  counter: { shipment: number; invoice: number; quote: number; trucking: number; booking: number; container: number; email: number; doc: number; rate: number; qr: number; customsDec: number; je: number; note: number; whr: number; leg: number; pod: number; pm: number; ym: number; approval: number; notif: number };
}

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function seed(): DB {
  const now = new Date();
  const days = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
  const hoursAgoIso = (n: number) => new Date(Date.now() - n * 3600000).toISOString();

  const customers: Customer[] = [
    { id: uid('c_'), name: 'Indian Ocean Textiles Ltd', contactPerson: 'Rakoto Be', email: 'rakoto@iotextiles.mg', phone: '+261 20 22 123 45', address: 'Zone Industrielle Antanimora, Antananarivo', country: 'Madagascar', createdAt: days(-365), creditLimit: 50000, paymentTerms: 30, accountManager: 'Hery Lalao', tags: ['VIP', 'Export', 'Sea'], lifetimeValue: 142000 },
    { id: uid('c_'), name: 'Global Spice Exporters', contactPerson: 'Hanta Rasoa', email: 'hanta@globalspice.mg', phone: '+261 33 11 222 33', address: 'Port Toamasina, Lot 45', country: 'Madagascar', createdAt: days(-220), creditLimit: 25000, paymentTerms: 15, accountManager: 'Hery Lalao', tags: ['Export', 'Air+Sea'], lifetimeValue: 87500 },
    { id: uid('c_'), name: 'Mada Imports SARL', contactPerson: 'Jean Paul R.', email: 'jp@madaimports.mg', phone: '+261 34 55 666 77', address: 'Ivandry, Antananarivo', country: 'Madagascar', createdAt: days(-180), creditLimit: 75000, paymentTerms: 45, accountManager: 'Voahangy R.', tags: ['Import', 'Credit Risk'], lifetimeValue: 220000 },
    { id: uid('c_'), name: 'Mauritius Trading Co.', contactPerson: 'Priya D.', email: 'priya@mauritiustrading.mu', phone: '+230 212 3456', address: 'Port Louis, Mauritius', country: 'Mauritius', createdAt: days(-90), creditLimit: 30000, paymentTerms: 30, accountManager: 'Hery Lalao', tags: ['IOI', 'Air'], lifetimeValue: 42300 },
    { id: uid('c_'), name: 'Europe Pharma Group', contactPerson: 'Hans Mueller', email: 'h.mueller@europepharma.de', phone: '+49 40 1234567', address: 'Hamburg, Germany', country: 'Germany', createdAt: days(-45), creditLimit: 100000, paymentTerms: 60, accountManager: 'Andry R.', tags: ['VIP', 'Pharma', 'Cold Chain'], lifetimeValue: 68400 },
  ];

  const mkShipment = (overrides: Partial<Shipment>, n: number): Shipment => {
    const ref = `FRT-2026-${String(n).padStart(4, '0')}`;
    const cust = overrides.customerId ? customers.find((c) => c.id === overrides.customerId) || customers[0] : customers[n % customers.length];
    const base: Shipment = {
      id: uid('s_'), reference: ref, mode: 'sea', direction: 'export', status: 'booked',
      customerId: cust.id, customerName: cust.name, customerEmail: cust.email,
      origin: 'Antananarivo, MG', destination: 'Hamburg, DE',
      portOfLoading: 'Toamasina', portOfDischarge: 'Hamburg',
      weight: 5000, volume: 18, pieces: 120, commodity: 'General Cargo',
      incoterm: 'CIF', carrier: 'Maersk', vesselOrFlight: 'MAERSK EMDEN 042E',
      mawbOrBl: 'MAEU' + Math.floor(100000000 + Math.random() * 900000000),
      etd: days(3), eta: days(35), customsStatus: 'docs_received',
      totalAmount: 8500, currency: 'USD', createdAt: days(-n),
      ...overrides,
    };
    return { ...base, co2e: base.co2e ?? estCo2(base.mode, base.weight, base.portOfLoading, base.portOfDischarge) };
  };

  const shipments: Shipment[] = [
    mkShipment({ mode: 'sea', direction: 'export', status: 'in_transit', origin: 'Toamasina, MG', destination: 'Hamburg, DE', portOfLoading: 'Toamasina', portOfDischarge: 'Hamburg', weight: 12000, volume: 28, pieces: 320, commodity: 'Vanilla Beans', hsCode: '0905.10', hsDescription: 'Vanilla, neither crushed nor ground', dutyRate: 0, incoterm: 'CIF', carrier: 'Maersk', vesselOrFlight: 'MAERSK EMDEN 042E', etd: days(-10), eta: days(18), atd: days(-9), customsStatus: 'cleared', truckingDispatched: true, totalAmount: 14200, freightCost: 10500, customsCost: 1800, truckingCost: 1900, bookingConfirmed: true, docsChecked: { commercial_invoice: true, packing_list: true, certificate_origin: true, phytosanitary: true, bl: true } }, 1),
    mkShipment({ mode: 'air', direction: 'export', status: 'customs', origin: 'Antananarivo, MG', destination: 'Paris, FR', portOfLoading: 'TNR', portOfDischarge: 'CDG', weight: 480, volume: 2.5, pieces: 12, commodity: 'Pharmaceuticals - Cold Chain', hsCode: '3004.90', hsDescription: 'Medicaments packaged for retail', dutyRate: 0, incoterm: 'FOB', carrier: 'Air France Cargo', vesselOrFlight: 'AF935', mawbOrBl: '057-' + Math.floor(10000000 + Math.random() * 90000000), etd: days(2), eta: days(3), customsStatus: 'declared', totalAmount: 6800, freightCost: 5200, customsCost: 900, truckingCost: 400, bookingConfirmed: true, docsChecked: { commercial_invoice: true, packing_list: true, certificate_origin: false, pharma_cert: true, airway_bill: true } }, 2),
    mkShipment({ mode: 'sea', direction: 'import', status: 'picked_up', origin: 'Shanghai, CN', destination: 'Antananarivo, MG', portOfLoading: 'Shanghai', portOfDischarge: 'Toamasina', weight: 22000, volume: 55, pieces: 480, commodity: 'Consumer Electronics', hsCode: '8517.13', hsDescription: 'Smartphones for cellular networks', dutyRate: 20, dutyEstimate: 3700, incoterm: 'FOB', carrier: 'CMA CGM', vesselOrFlight: 'CMA CGM MOLIERE', etd: days(-25), eta: days(4), atd: days(-24), customsStatus: 'docs_received', totalAmount: 22500, freightCost: 18500, customsCost: 2200, truckingCost: 1800, bookingConfirmed: true, docsChecked: { commercial_invoice: true, packing_list: true, certificate_origin: true, bl: true } }, 3),
    mkShipment({ mode: 'air', direction: 'import', status: 'delivered', origin: 'Dubai, AE', destination: 'Antananarivo, MG', portOfLoading: 'DXB', portOfDischarge: 'TNR', weight: 1200, volume: 6.2, pieces: 45, commodity: 'Spare Parts', hsCode: '8481.80', hsDescription: 'Taps, cocks, valves', dutyRate: 10, dutyEstimate: 780, incoterm: 'DAP', carrier: 'Emirates SkyCargo', vesselOrFlight: 'EK897', mawbOrBl: '176-' + Math.floor(10000000 + Math.random() * 90000000), etd: days(-15), eta: days(-14), atd: days(-15), ata: days(-14), customsStatus: 'cleared', truckingDispatched: true, totalAmount: 9400, freightCost: 7800, customsCost: 1250, truckingCost: 350, bookingConfirmed: true, docsChecked: { commercial_invoice: true, packing_list: true, bl: true } }, 4),
    mkShipment({ mode: 'sea', direction: 'export', status: 'booked', origin: 'Toamasina, MG', destination: 'Rotterdam, NL', portOfLoading: 'Toamasina', portOfDischarge: 'Rotterdam', weight: 8500, volume: 22, pieces: 210, commodity: 'Cloves & Spices', hsCode: '0907.10', hsDescription: 'Cloves', incoterm: 'CFR', carrier: 'MSC', vesselOrFlight: 'MSC ISABELLA', etd: days(7), eta: days(40), customsStatus: 'pending', totalAmount: 11000, freightCost: 7800, customsCost: 1200, truckingCost: 800, docsChecked: { commercial_invoice: true, packing_list: false, certificate_origin: false, phytosanitary: false, bl: false } }, 5),
    mkShipment({ mode: 'air', direction: 'export', status: 'booked', origin: 'Antananarivo, MG', destination: 'Mauritius, MU', portOfLoading: 'TNR', portOfDischarge: 'MRU', weight: 220, volume: 1.1, pieces: 8, commodity: 'Documents / Samples', hsCode: '4901.99', hsDescription: 'Printed matter / samples', incoterm: 'EXW', carrier: 'Air Madagascar', vesselOrFlight: 'MD152', mawbOrBl: '258-' + Math.floor(10000000 + Math.random() * 90000000), etd: days(1), eta: days(1), customsStatus: 'pending', totalAmount: 1200, freightCost: 850, customsCost: 150, truckingCost: 100, bookingRequested: true, bookingConfirmed: false }, 6),
    mkShipment({ mode: 'sea', direction: 'import', status: 'quoted', origin: 'Mumbai, IN', destination: 'Antananarivo, MG', portOfLoading: 'Nhava Sheva', portOfDischarge: 'Toamasina', weight: 15000, volume: 34, pieces: 260, commodity: 'Textiles & Garments', hsCode: '6109.10', hsDescription: 'T-shirts, cotton', incoterm: 'CIF', carrier: 'Maersk', vesselOrFlight: 'TBD', mawbOrBl: 'TBD', etd: days(14), eta: days(42), customsStatus: 'pending', totalAmount: 16700, freightCost: 12400, customsCost: 2800, truckingCost: 1500 }, 7),
    mkShipment({ mode: 'air', direction: 'export', status: 'in_transit', origin: 'Antananarivo, MG', destination: 'Johannesburg, ZA', portOfLoading: 'TNR', portOfDischarge: 'JNB', weight: 680, volume: 3.8, pieces: 22, commodity: 'Fresh Produce', hsCode: '0804.50', hsDescription: 'Mangoes / fresh fruit', incoterm: 'CIP', carrier: 'South African Airways', vesselOrFlight: 'SA9022', mawbOrBl: '083-' + Math.floor(10000000 + Math.random() * 90000000), etd: days(-2), eta: days(1), atd: days(-2), customsStatus: 'inspection', totalAmount: 4200, freightCost: 2900, customsCost: 500, truckingCost: 300, bookingConfirmed: true }, 8),
  ];

  const trucking: TruckingDispatch[] = [
    { id: uid('t_'), reference: 'TRK-2026-0001', shipmentId: shipments[0].id, shipmentRef: shipments[0].reference, customerName: shipments[0].customerName, driverName: 'Rivo Andriamahefa', driverPhone: '+261 34 12 345 67', vehiclePlate: '2918 TAA', vehicleType: '40ft Container Truck', pickupLocation: 'Port Toamasina - Terminal 2', deliveryLocation: 'Zone Industrielle Antanimora, Antananarivo', status: 'en_route', scheduledDate: days(1), weight: 12000, cost: 1850, notes: 'Reefer container - temperature controlled', assignedDriverId: 'u_driver' },
    { id: uid('t_'), reference: 'TRK-2026-0002', shipmentId: shipments[2].id, shipmentRef: shipments[2].reference, customerName: shipments[2].customerName, driverName: 'Eric Randria', driverPhone: '+261 33 45 678 90', vehiclePlate: '4521 TAB', vehicleType: '2x 20ft Trucks', pickupLocation: 'Port Toamasina - CFS', deliveryLocation: 'Ivandry Warehouse, Antananarivo', status: 'dispatched', scheduledDate: days(5), weight: 22000, cost: 2400 },
    { id: uid('t_'), reference: 'TRK-2026-0003', shipmentId: shipments[3].id, shipmentRef: shipments[3].reference, customerName: shipments[3].customerName, driverName: 'Hery Lalao', driverPhone: '+261 32 98 765 43', vehiclePlate: '1122 TAC', vehicleType: 'Box Truck 10T', pickupLocation: 'Ivato Airport Cargo Terminal', deliveryLocation: 'Industriel Zone, Antananarivo', status: 'completed', scheduledDate: days(-13), completedDate: days(-12), weight: 1200, cost: 350 },
    { id: uid('t_'), reference: 'TRK-2026-0004', customerName: 'Global Spice Exporters', driverName: 'Naina R.', driverPhone: '+261 34 11 111 22', vehiclePlate: '7733 TAD', vehicleType: 'Flatbed Truck', pickupLocation: 'Sambava (local)', deliveryLocation: 'Port Toamasina', status: 'scheduled', scheduledDate: days(6), weight: 8000, cost: 2200, notes: 'Vanilla shipment, pre-cooling required' },
  ];

  const invoices: Invoice[] = [
    { id: uid('i_'), number: 'INV-2026-0101', customerId: customers[0].id, customerName: customers[0].name, customerEmail: customers[0].email, shipmentId: shipments[0].id, items: [{ description: 'Ocean freight Toamasina-Hamburg', amount: 10500 }, { description: 'Customs clearance & docs', amount: 1800 }, { description: 'Inland trucking', amount: 1900 }], subtotal: 14200, tax: 0, total: 14200, status: 'sent', issueDate: days(-45), dueDate: days(-15), currency: 'USD', sentAt: daysAgoIso(45), openedAt: hoursAgoIso(36) },
    { id: uid('i_'), number: 'INV-2026-0102', customerId: customers[3].id, customerName: customers[3].name, customerEmail: customers[3].email, shipmentId: shipments[3].id, items: [{ description: 'Air freight DXB-TNR', amount: 7800 }, { description: 'Customs duties & clearance', amount: 1250 }, { description: 'Last-mile delivery', amount: 350 }], subtotal: 9400, tax: 0, total: 9400, status: 'paid', issueDate: days(-20), dueDate: days(-5), paidDate: days(-7), currency: 'USD', sentAt: daysAgoIso(20), openedAt: daysAgoIso(19) },
    { id: uid('i_'), number: 'INV-2026-0103', customerId: customers[2].id, customerName: customers[2].name, customerEmail: customers[2].email, shipmentId: shipments[2].id, items: [{ description: 'Ocean freight Shanghai-Toamasina', amount: 18500 }, { description: 'Customs clearance (est.)', amount: 2200 }, { description: 'Inland transport to Tana', amount: 1800 }], subtotal: 22500, tax: 0, total: 22500, status: 'draft', issueDate: days(-2), dueDate: days(28), currency: 'USD' },
    { id: uid('i_'), number: 'INV-2026-0104', customerId: customers[0].id, customerName: customers[0].name, customerEmail: customers[0].email, items: [{ description: 'Quote Q-2026-0204 acceptance — Proforma', amount: 12600 }], subtotal: 12600, tax: 0, total: 12600, status: 'sent', issueDate: days(-5), dueDate: days(25), currency: 'USD', sentAt: daysAgoIso(5), openedAt: hoursAgoIso(48) },
    { id: uid('i_'), number: 'INV-2026-0105', customerId: customers[4].id, customerName: customers[4].name, customerEmail: customers[4].email, shipmentId: shipments[1].id, items: [{ description: 'Air freight FRA-TNR (cold chain)', amount: 8900 }, { description: 'Temperature-controlled handling', amount: 650 }, { description: 'Customs clearance', amount: 900 }], subtotal: 10450, tax: 0, total: 10450, status: 'sent', issueDate: days(-8), dueDate: days(22), currency: 'USD', sentAt: daysAgoIso(8), openedAt: daysAgoIso(7) },
  ];

  const quotes: Quote[] = [
    { id: uid('q_'), number: 'Q-2026-0201', customerId: customers[1].id, customerName: 'Global Spice Exporters', customerEmail: 'hanta@globalspice.mg', mode: 'air', direction: 'export', origin: 'Antananarivo, MG', destination: 'Tokyo, JP', weight: 350, volume: 2.0, commodity: 'Premium Vanilla', status: 'sent' as any, freightRate: 5200, customsFee: 650, truckingFee: 280, total: 6130, currency: 'USD', validUntil: days(14), createdAt: days(-2), sentAt: daysAgoIso(2), openedAt: hoursAgoIso(20) },
    { id: uid('q_'), number: 'Q-2026-0202', customerId: customers[4].id, customerName: 'Europe Pharma Group', customerEmail: 'h.mueller@europepharma.de', mode: 'air', direction: 'import', origin: 'Frankfurt, DE', destination: 'Antananarivo, MG', weight: 820, volume: 4.5, commodity: 'Vaccines (Cold Chain)', status: 'accepted', freightRate: 8900, customsFee: 1100, truckingFee: 450, total: 10450, currency: 'USD', validUntil: days(10), createdAt: days(-8), sentAt: daysAgoIso(8), openedAt: daysAgoIso(7) },
    { id: uid('q_'), number: 'Q-2026-0203', customerId: customers[2].id, customerName: 'Mada Imports SARL', customerEmail: 'jp@madaimports.mg', mode: 'sea', direction: 'import', origin: 'Istanbul, TR', destination: 'Toamasina, MG', weight: 18000, volume: 42, commodity: 'Construction Materials', status: 'pending', freightRate: 12400, customsFee: 2800, truckingFee: 1950, total: 17150, currency: 'USD', validUntil: days(21), createdAt: days(-1) },
    // One more pending quote for Indian Ocean Textiles to show in portal
    { id: uid('q_'), number: 'Q-2026-0204', customerId: customers[0].id, customerName: 'Indian Ocean Textiles Ltd', customerEmail: 'rakoto@iotextiles.mg', mode: 'sea', direction: 'export', origin: 'Toamasina, MG', destination: 'Rotterdam, NL', weight: 14000, volume: 32, commodity: 'Cotton Textiles', status: 'sent' as any, freightRate: 9800, customsFee: 1200, truckingFee: 1600, total: 12600, currency: 'USD', validUntil: days(18), createdAt: days(-3), sentAt: daysAgoIso(3), openedAt: daysAgoIso(2) },
    // A Mauritius Trading quote
    { id: uid('q_'), number: 'Q-2026-0205', customerId: customers[3].id, customerName: 'Mauritius Trading Co.', customerEmail: 'priya@mauritiustrading.mu', mode: 'air', direction: 'import', origin: 'Mauritius, MU', destination: 'Antananarivo, MG', weight: 220, volume: 1.4, commodity: 'Textile Samples', status: 'pending', freightRate: 1450, customsFee: 280, truckingFee: 180, total: 1910, currency: 'USD', validUntil: days(12), createdAt: hoursAgoIso(8) },
  ] as Quote[];

  // Container/package manifests for existing shipments
  const containers: ContainerPackage[] = [
    { id: uid('cp_'), shipmentId: shipments[0].id, containerNumber: 'MSKU6123847', sealNumber: 'MG-SEAL-20193', containerType: 'REEFER_40', tareWeight: 4800, grossWeight: 12000, packages: 320, description: 'Vanilla beans - cartons on 20 pallets', temperature: 5, humidity: 65, volume: 28 },
    { id: uid('cp_'), shipmentId: shipments[2].id, containerNumber: 'CMAU5283910', sealNumber: 'CNSL-88342', containerType: '40HC', tareWeight: 3900, grossWeight: 11000, packages: 240, description: 'Electronics - master cartons', volume: 27 },
    { id: uid('cp_'), shipmentId: shipments[2].id, containerNumber: 'CMAU7382942', sealNumber: 'CNSL-88343', containerType: '40HC', tareWeight: 3900, grossWeight: 11000, packages: 240, description: 'Electronics - master cartons (cont.)', volume: 28 },
    { id: uid('cp_'), shipmentId: shipments[4].id, containerNumber: 'MSCU8821330', sealNumber: 'MGS-11205', containerType: '20GP', tareWeight: 2300, grossWeight: 8500, packages: 210, description: 'Cloves & spices in jute bags', volume: 22 },
    { id: uid('cp_'), shipmentId: shipments[6].id, containerType: 'LCL', grossWeight: 15000, packages: 260, description: 'Garments on hangers / cartons (consol)', volume: 34 },
    { id: uid('cp_'), shipmentId: shipments[1].id, containerNumber: 'AKE-057-AF', containerType: 'ULD_AKE', grossWeight: 480, packages: 12, description: 'Pharma cold-chain ULD - active temp control', temperature: 2, volume: 2.5 },
    { id: uid('cp_'), shipmentId: shipments[3].id, containerType: 'BULK', grossWeight: 1200, packages: 45, description: 'Loose cargo - spares', volume: 6.2 },
    { id: uid('cp_'), shipmentId: shipments[7].id, containerType: 'ULD_PMC', grossWeight: 680, packages: 22, description: 'Fresh produce - perishable', temperature: 4, volume: 3.8 },
  ];

  // Carrier bookings
  const bookings: CarrierBooking[] = [
    { id: uid('bk_'), shipmentId: shipments[0].id, carrier: 'Maersk', mode: 'sea', bookingReference: 'MAEUBN2026010', status: 'confirmed', requestedAt: daysAgoIso(20), confirmedAt: daysAgoIso(19), sob: days(-12), vgmCutoff: days(-11), cyCutoff: days(-11), docsCutoff: days(-10), vgm: 24000, allocatedSpace: '1 x 40ft REEFER', equipmentReadyAt: days(-11), terminal: 'Toamasina International Terminal', eblIssued: true, eblIssueDate: days(-9), events: [{ at: daysAgoIso(20), stage: 'Requested', message: 'Booking requested to Maersk via INTTRA' }, { at: daysAgoIso(19), stage: 'Confirmed', message: 'Booking confirmed: MAEUBN2026010, vessel MAERSK EMDEN 042E' }, { at: daysAgoIso(11), stage: 'SI Cutoff', message: 'Shipping instructions submitted' }, { at: daysAgoIso(9), stage: 'eBL Issued', message: 'Electronic Bill of Lading issued (PDF available)' }] },
    { id: uid('bk_'), shipmentId: shipments[2].id, carrier: 'CMA CGM', mode: 'sea', bookingReference: 'CMABKSH8834', status: 'confirmed', requestedAt: daysAgoIso(40), confirmedAt: daysAgoIso(39), sob: days(-28), vgmCutoff: days(-27), cyCutoff: days(-26), vgm: 29800, allocatedSpace: '2 x 40HC', terminal: 'Shanghai Waigaoqiao T2', eblIssued: true, eblIssueDate: days(-25), events: [{ at: daysAgoIso(40), stage: 'Requested', message: 'Booking placed via CMA CGM eBusiness' }, { at: daysAgoIso(39), stage: 'Confirmed', message: 'Booking confirmed on CMA CGM MOLIERE' }, { at: daysAgoIso(25), stage: 'eBL Issued', message: 'eBL issued & surrendered' }] },
    { id: uid('bk_'), shipmentId: shipments[1].id, carrier: 'Air France Cargo', mode: 'air', bookingReference: 'AF-CGO-935-0226', status: 'confirmed', requestedAt: daysAgoIso(5), confirmedAt: daysAgoIso(4), allocatedSpace: '1 x AKE ULD (1.5t)', terminal: 'Ivato Cargo T1', events: [{ at: daysAgoIso(5), stage: 'Requested', message: 'Airway booking requested with AF Cargo' }, { at: daysAgoIso(4), stage: 'Confirmed', message: 'Allotment confirmed on AF935 20 Aug, 1 ULD AKE' }] },
    { id: uid('bk_'), shipmentId: shipments[3].id, carrier: 'Emirates SkyCargo', mode: 'air', bookingReference: 'EK-CGO-897-0088', status: 'confirmed', requestedAt: daysAgoIso(25), confirmedAt: daysAgoIso(24), allocatedSpace: 'Bulk 1.2t', terminal: 'DXB Cargo Mega Terminal', events: [{ at: daysAgoIso(25), stage: 'Requested', message: 'Booking placed on Emirates SkyCargo' }, { at: daysAgoIso(24), stage: 'Confirmed', message: 'Allotment granted on EK897' }] },
    { id: uid('bk_'), shipmentId: shipments[5].id, carrier: 'Air Madagascar', mode: 'air', bookingReference: 'MD-CGO-152-0801', status: 'requested', requestedAt: hoursAgoIso(6), allocatedSpace: 'Bulk 250kg', events: [{ at: hoursAgoIso(6), stage: 'Requested', message: 'Awaiting carrier confirmation...' }] },
    { id: uid('bk_'), shipmentId: shipments[7].id, carrier: 'South African Airways', mode: 'air', bookingReference: 'SA-CGO-9022-0701', status: 'confirmed', requestedAt: daysAgoIso(6), confirmedAt: daysAgoIso(5), allocatedSpace: '1 x PMC ULD', terminal: 'Ivato Cargo T1', events: [{ at: daysAgoIso(6), stage: 'Requested', message: 'Booking placed on SAA Cargo' }, { at: daysAgoIso(5), stage: 'Confirmed', message: 'Booking confirmed SA9022 17 Aug' }] },
  ];

  const emails: EmailLog[] = [
    { id: uid('em_'), to: customers[0].email!, subject: 'Invoice INV-2026-0101 - Indian Ocean Textiles Ltd', template: 'invoice', relatedType: 'invoice', relatedId: invoices[0].id, relatedRef: 'INV-2026-0101', body: 'Dear Rakoto Be,\n\nPlease find attached your invoice INV-2026-0101 for USD 14,200 covering the Maersk Emden shipment to Hamburg.\n\nPayment due: ' + days(18) + '.\n\nBest regards,\nFreightFlow Customer Care', sentAt: daysAgoIso(12), openedAt: hoursAgoIso(36), status: 'opened' },
    { id: uid('em_'), to: customers[3].email!, subject: 'Payment received - INV-2026-0102', template: 'pod', relatedType: 'invoice', relatedId: invoices[1].id, relatedRef: 'INV-2026-0102', body: 'Dear Priya,\n\nThank you for your payment of USD 9,400. Receipt attached. Shipment FRT-2026-0004 has been delivered.\n\nFreightFlow', sentAt: daysAgoIso(7), openedAt: daysAgoIso(6), clickedAt: daysAgoIso(6), status: 'clicked' },
    { id: uid('em_'), to: customers[1].email!, subject: 'Your quote Q-2026-0201 - Premium Vanilla to Tokyo', template: 'quote', relatedType: 'quote', relatedId: quotes[0].id, relatedRef: 'Q-2026-0201', body: 'Dear Hanta Rasoa,\n\nAttached is your air freight quote for 350kg Premium Vanilla Antananarivo-Tokyo.\nTotal: USD 6,130.\nValid until: ' + days(14) + '.\n\nReply "ACCEPT" to confirm.\n\nFreightFlow Sales', sentAt: daysAgoIso(2), openedAt: hoursAgoIso(20), status: 'opened' },
    { id: uid('em_'), to: customers[4].email!, subject: 'Quote accepted - Q-2026-0202 (Vaccines Frankfurt-TNR)', template: 'booking_conf', relatedType: 'quote', relatedId: quotes[1].id, relatedRef: 'Q-2026-0202', body: 'Dear Hans Mueller,\n\nThank you for accepting quote Q-2026-0202. We have placed the booking with Air France Cargo and will share the AWB shortly.\n\nFreightFlow Operations', sentAt: daysAgoIso(7), openedAt: daysAgoIso(7), clickedAt: daysAgoIso(7), status: 'clicked' },
    { id: uid('em_'), to: customers[0].email!, subject: 'FRT-2026-0001 departed Toamasina', template: 'tracking_update', relatedType: 'shipment', relatedId: shipments[0].id, relatedRef: 'FRT-2026-0001', body: 'Dear Rakoto,\n\nYour shipment FRT-2026-0001 (Vanilla Beans, 12,000 kg) departed Toamasina aboard MAERSK EMDEN 042E.\n\nETA Hamburg: ' + days(18) + '.\nTrack live: https://freightflow.mg/portal?t=...\n\nFreightFlow', sentAt: daysAgoIso(9), openedAt: daysAgoIso(9), status: 'clicked' },
  ];

  // Dangerous Goods declarations
  const dg: DGEntry[] = [
    { id: uid('dg_'), shipmentId: shipments[2].id, unNumber: 'UN3480', properShippingName: 'Lithium ion batteries', dgClass: '9', packingGroup: 'II', packagingInstructions: 'PI965 Section IA', netWeightKg: 320, grossWeightKg: 420, packages: 80, sdsAttached: true, declarationAttached: true, approved: true, approver: 'Lina Ratsimba' },
  ];

  // Documents (virtual files, metadata only — content can be attached/uploaded)
  const docs: DocFile[] = [
    { id: uid('d_'), name: 'Commercial_Invoice_IOT_FRT0001.pdf', category: 'commercial_invoice', sizeBytes: 184320, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[0].id, uploadedBy: 'Voahangy R.', uploadedAt: daysAgoIso(12) },
    { id: uid('d_'), name: 'Packing_List_FRT0001.pdf', category: 'packing_list', sizeBytes: 92160, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[0].id, uploadedBy: 'Voahangy R.', uploadedAt: daysAgoIso(12) },
    { id: uid('d_'), name: 'Certificate_of_Origin_MG2026120.pdf', category: 'certificate_origin', sizeBytes: 143360, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[0].id, uploadedBy: 'Hery Lalao', uploadedAt: daysAgoIso(11) },
    { id: uid('d_'), name: 'Phytosanitary_Vanilla_2026_31.pdf', category: 'phytosanitary', sizeBytes: 204800, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[0].id, uploadedBy: 'Lina Ratsimba', uploadedAt: daysAgoIso(11) },
    { id: uid('d_'), name: 'MAEU_Bill_of_Lading_MAEUBN2026010.pdf', category: 'bill_of_lading', sizeBytes: 286720, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[0].id, uploadedBy: 'Voahangy R.', uploadedAt: daysAgoIso(9) },
    { id: uid('d_'), name: 'Air_France_AWB_AF935.pdf', category: 'airway_bill', sizeBytes: 194560, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[1].id, uploadedBy: 'Voahangy R.', uploadedAt: daysAgoIso(3) },
    { id: uid('d_'), name: 'Pharma_ColdChain_Certificate.pdf', category: 'other', sizeBytes: 122880, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[1].id, uploadedBy: 'Lina Ratsimba', uploadedAt: daysAgoIso(3) },
    { id: uid('d_'), name: 'DGD_UN3480_FRT0003.pdf', category: 'dgd', sizeBytes: 102400, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[2].id, uploadedBy: 'Lina Ratsimba', uploadedAt: daysAgoIso(24) },
    { id: uid('d_'), name: 'INV-2026-0101.pdf', category: 'invoice_attachment', sizeBytes: 153600, mimeType: 'application/pdf', relatedType: 'invoice', relatedId: invoices[0].id, uploadedBy: 'Hery Lalao', uploadedAt: daysAgoIso(12) },
    { id: uid('d_'), name: 'INV-2026-0104_Proforma_Textiles_Rotterdam.pdf', category: 'invoice_attachment', sizeBytes: 148480, mimeType: 'application/pdf', relatedType: 'invoice', relatedId: invoices[3].id, uploadedBy: 'Hery Lalao', uploadedAt: daysAgoIso(5) },
    { id: uid('d_'), name: 'Q-2026-0201_Vanilla_Tokyo.pdf', category: 'quote_attachment', sizeBytes: 133120, mimeType: 'application/pdf', relatedType: 'quote', relatedId: quotes[0].id, uploadedBy: 'Hery Lalao', uploadedAt: daysAgoIso(2) },
    { id: uid('d_'), name: 'Q-2026-0204_Cotton_Rotterdam.pdf', category: 'quote_attachment', sizeBytes: 128000, mimeType: 'application/pdf', relatedType: 'quote', relatedId: quotes[3].id, uploadedBy: 'Hery Lalao', uploadedAt: daysAgoIso(3) },
    { id: uid('d_'), name: 'Pharma_Handling_Procedure_v2.pdf', category: 'other', sizeBytes: 245760, mimeType: 'application/pdf', relatedType: 'shipment', relatedId: shipments[1].id, uploadedBy: 'Voahangy R.', uploadedAt: daysAgoIso(4) },
  ];

  // Rate cards
  const rates: RateCard[] = [
    { id: uid('r_'), carrier: 'Air France Cargo', mode: 'air', direction: 'export', origin: 'TNR', destination: 'CDG', commodity: 'General', validFrom: days(-30), validUntil: days(60), buyRate: 3.2, sellRate: 4.8, currency: 'USD', unit: 'kg', minCharge: 80, transitDaysMin: 2, transitDaysMax: 3, frequency: 'Tue/Wed/Fri/Sun', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'Emirates SkyCargo', mode: 'air', direction: 'import', origin: 'DXB', destination: 'TNR', commodity: 'General', validFrom: days(-30), validUntil: days(60), buyRate: 3.8, sellRate: 5.5, currency: 'USD', unit: 'kg', minCharge: 100, transitDaysMin: 2, transitDaysMax: 4, frequency: '4x weekly', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'Air Madagascar', mode: 'air', direction: 'export', origin: 'TNR', destination: 'MRU', commodity: 'General', validFrom: days(-30), validUntil: days(60), buyRate: 1.8, sellRate: 2.9, currency: 'USD', unit: 'kg', minCharge: 45, transitDaysMin: 1, transitDaysMax: 1, frequency: '6x weekly', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'South African Airways', mode: 'air', direction: 'export', origin: 'TNR', destination: 'JNB', commodity: 'General', validFrom: days(-30), validUntil: days(60), buyRate: 2.2, sellRate: 3.4, currency: 'USD', unit: 'kg', minCharge: 60, transitDaysMin: 1, transitDaysMax: 2, frequency: '3x weekly', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'Maersk', mode: 'sea', direction: 'export', origin: 'Toamasina', destination: 'Hamburg', validFrom: days(-30), validUntil: days(90), buyRate: 1800, sellRate: 2600, currency: 'USD', unit: 'container_40hc', minCharge: 2600, transitDaysMin: 32, transitDaysMax: 38, frequency: 'Weekly (Wed)', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'MSC', mode: 'sea', direction: 'export', origin: 'Toamasina', destination: 'Rotterdam', validFrom: days(-30), validUntil: days(90), buyRate: 1750, sellRate: 2500, currency: 'USD', unit: 'container_40hc', transitDaysMin: 35, transitDaysMax: 42, frequency: 'Weekly (Sat)', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'CMA CGM', mode: 'sea', direction: 'import', origin: 'Shanghai', destination: 'Toamasina', validFrom: days(-30), validUntil: days(90), buyRate: 2200, sellRate: 3200, currency: 'USD', unit: 'container_40hc', transitDaysMin: 28, transitDaysMax: 35, frequency: 'Weekly (Thu)', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'Maersk', mode: 'sea', direction: 'import', origin: 'Nhava Sheva', destination: 'Toamasina', validFrom: days(-30), validUntil: days(90), buyRate: 1500, sellRate: 2300, currency: 'USD', unit: 'container_20', transitDaysMin: 18, transitDaysMax: 24, frequency: 'Every 10 days', active: true, createdAt: daysAgoIso(30) },
    { id: uid('r_'), carrier: 'Inland Trucking', mode: 'road', direction: 'both', origin: 'Toamasina Port', destination: 'Antananarivo', validFrom: days(-30), validUntil: days(90), buyRate: 750, sellRate: 1100, currency: 'USD', unit: 'container_20', minCharge: 1100, transitDaysMin: 1, transitDaysMax: 2, frequency: 'Daily', active: true, createdAt: daysAgoIso(30), notes: 'RN2 road; escort required for overweight' },
    { id: uid('r_'), carrier: 'Inland Trucking', mode: 'road', direction: 'both', origin: 'Toamasina Port', destination: 'Antananarivo', validFrom: days(-30), validUntil: days(90), buyRate: 900, sellRate: 1400, currency: 'USD', unit: 'container_40', minCharge: 1400, transitDaysMin: 1, transitDaysMax: 2, frequency: 'Daily', active: true, createdAt: daysAgoIso(30) },
  ];

  // Customer quote requests from public portal
  function qrToken() { return 'qr_' + Math.random().toString(36).slice(2, 10); }
  const quoteRequests: QuoteRequest[] = [
    { id: uid('qr_'), token: qrToken(), customerName: 'Rado Andriamihaja', customerEmail: 'rado@spices-connect.mg', customerPhone: '+261 34 22 99 001', company: 'Spices Connect SARL', mode: 'sea', direction: 'export', origin: 'Toamasina', destination: 'Dubai (Jebel Ali)', weight: 14000, volume: 28, pieces: 560, commodity: 'Black pepper & cloves', incoterm: 'CIF', readyDate: days(10), notes: 'Need 1x20GP dry container. Need phyto cert.', status: 'new', createdAt: hoursAgoIso(4) },
    { id: uid('qr_'), token: qrToken(), customerName: 'Claire Rakotonirina', customerEmail: 'claire@lotus-textile.mg', customerPhone: '+261 33 44 55 666', company: 'Lotus Textile', mode: 'air', direction: 'export', origin: 'Antananarivo (TNR)', destination: 'Paris (CDG)', weight: 320, volume: 3.2, pieces: 18, commodity: 'Garment samples', incoterm: 'FOB', readyDate: days(3), notes: 'Urgent - trade show next week', status: 'new', createdAt: hoursAgoIso(22) },
    { id: uid('qr_'), token: qrToken(), customerName: 'Pieter van der Merwe', customerEmail: 'pieter@capetraders.co.za', company: 'Cape Traders (Pty) Ltd', mode: 'sea', direction: 'import', origin: 'Durban', destination: 'Toamasina', weight: 9500, volume: 18, pieces: 180, commodity: 'Construction hardware', incoterm: 'CFR', readyDate: days(21), notes: '2x20GP, no DG. Please advise schedule.', status: 'quoted', quotedPrice: 4800, createdAt: daysAgoIso(3) },
  ];

  const activities: Activity[] = [
    { id: uid('a_'), type: 'booking', message: 'Booking MAEUBN2026010 confirmed with Maersk for FRT-2026-0001', reference: 'MAEUBN2026010', timestamp: daysAgoIso(19) },
    { id: uid('a_'), type: 'shipment', message: 'FRT-2026-0001 departed Toamasina on MAERSK EMDEN', reference: 'FRT-2026-0001', timestamp: daysAgoIso(9) },
    { id: uid('a_'), type: 'email', message: 'Tracking email opened by Indian Ocean Textiles for FRT-2026-0001', reference: 'FRT-2026-0001', timestamp: daysAgoIso(9) },
    { id: uid('a_'), type: 'customs', message: 'Customs declaration submitted for FRT-2026-0002 (AF935)', reference: 'FRT-2026-0002', timestamp: hoursAgoIso(1) },
    { id: uid('a_'), type: 'trucking', message: 'TRK-2026-0001 dispatched: Rivo en route to Antananarivo', reference: 'TRK-2026-0001', timestamp: hoursAgoIso(3) },
    { id: uid('a_'), type: 'quote', message: 'New quote request from Spices Connect SARL (Toamasina→Jebel Ali)', reference: 'Quote Request', timestamp: hoursAgoIso(4) },
    { id: uid('a_'), type: 'invoice', message: 'INV-2026-0101 paid (opened by client)', reference: 'INV-2026-0101', timestamp: hoursAgoIso(36) },
    { id: uid('a_'), type: 'quote', message: 'Quote Q-2026-0203 issued to Mada Imports SARL', reference: 'Q-2026-0203', timestamp: hoursAgoIso(18) },
    { id: uid('a_'), type: 'email', message: 'Quote Q-2026-0201 opened by Global Spice Exporters', reference: 'Q-2026-0201', timestamp: hoursAgoIso(20) },
    { id: uid('a_'), type: 'shipment', message: 'FRT-2026-0004 delivered and signed', reference: 'FRT-2026-0004', timestamp: daysAgoIso(12) },
  ];

  // GPS pings — simulate TRK-0001 (Rivo) driving RN2 from Toamasina to Antananarivo, mid-route
  // Route approx: Toamasina port (-18.15, 49.40) → Brickaville (-18.82, 49.07) → Moramanga (-18.94, 48.23) → Tana (-18.88, 47.50)
  const nowT = Date.now();
  const gpsRoute: [number, number, string][] = [
    [-18.150, 49.400, 'Port Toamasina Terminal 2'],
    [-18.220, 49.330, 'RN2 — Toamasina outskirts'],
    [-18.380, 49.250, 'RN2 — Ampasimanolotra'],
    [-18.540, 49.180, 'RN2 — Andevoranto'],
    [-18.700, 49.120, 'RN2 — Brickaville area'],
    [-18.820, 49.070, 'Brickaville (halfway stop)'],
    [-18.880, 48.800, 'RN2 — Ranomafana incline'],
    [-18.930, 48.520, 'RN2 — Beforona'],
    [-18.940, 48.230, 'Moramanga junction'],
    [-18.950, 48.000, 'RN2 — Ambanitsena'],
    [-18.930, 47.760, 'RN2 — Manjakandriana'],
    [-18.900, 47.600, 'RN2 — Sambaina'],
  ];
  const gpsPings: GpsPing[] = [];
  // Position the truck partway — say at index 8 (Moramanga) right now, with history of pings over last 6 hours
  const currentIdx = 8;
  for (let i = 0; i <= currentIdx; i++) {
    gpsPings.push({
      id: uid('gp_'),
      truckingId: trucking[0].id,
      lat: gpsRoute[i][0] + (Math.random() - 0.5) * 0.01,
      lng: gpsRoute[i][1] + (Math.random() - 0.5) * 0.01,
      speedKmh: 35 + Math.floor(Math.random() * 25),
      heading: 260 + Math.floor(Math.random() * 20),
      timestamp: new Date(nowT - (currentIdx - i) * 30 * 60 * 1000).toISOString(),
      locationLabel: gpsRoute[i][2],
    });
  }
  // Add a ping for TRK-0002 dispatched to port
  gpsPings.push({ id: uid('gp_'), truckingId: trucking[1].id, lat: -18.90, lng: 47.55, speedKmh: 0, timestamp: new Date(nowT - 2 * 3600 * 1000).toISOString(), locationLabel: 'Ivandry yard (pre-departure)' });

  // Customs declarations (ASYCUDA SAD)
  const customsDeclarations: CustomsDeclaration[] = [
    {
      id: uid('cd_'),
      number: 'SAD-MG-2026-0001203',
      shipmentId: shipments[0].id,
      type: 'EX1',
      status: 'released',
      declarantName: 'Lina Ratsimba',
      declarantCode: 'MG-BRO-00142',
      importerExporter: 'Indian Ocean Textiles Ltd',
      incoterm: 'CIF',
      currency: 'USD',
      cifValue: 14200,
      freightValue: 10500,
      insuranceValue: 420,
      totalDuties: 0,
      totalVAT: 0,
      totalOtherTaxes: 0,
      hsItems: [
        { hsCode: '0905.10', description: 'Vanilla beans, dried', netWeight: 11700, grossWeight: 12000, quantity: 320, value: 14200, dutyRate: 0, vatRate: 0, dutyAmount: 0, vatAmount: 0 },
      ],
      officeOfEntry: 'Toamasina Customs',
      officeOfExit: 'Hamburg HZA',
      transportMode: 'sea',
      conveyanceRef: 'MAERSK EMDEN 042E',
      packages: 320,
      grossWeight: 12000,
      countryOfOrigin: 'MG',
      countryOfExport: 'MG',
      countryOfDestination: 'DE',
      submittedAt: daysAgoIso(12),
      acceptedAt: daysAgoIso(12),
      releasedAt: daysAgoIso(11),
      mrns: 'MRN-MG-TMM-2026-07A8-1203',
      assessmentNumber: 'ASM-1203',
      createdAt: daysAgoIso(13),
      events: [
        { at: daysAgoIso(13), stage: 'draft', message: 'Declaration prepared by broker', officer: 'Lina R.' },
        { at: daysAgoIso(12), stage: 'submitted', message: 'Lodged to ASYCUDA World', officer: 'SYSTEM' },
        { at: daysAgoIso(12), stage: 'accepted', message: 'MRN assigned, goods under customs control', officer: 'SYSTEM' },
        { at: daysAgoIso(11), stage: 'released', message: 'Green channel — goods released for export', officer: 'Customs Officer H.R.' },
      ],
    },
    {
      id: uid('cd_'),
      number: 'SAD-MG-2026-0001247',
      shipmentId: shipments[2].id,
      type: 'IM4',
      status: 'assessed',
      declarantName: 'Lina Ratsimba',
      declarantCode: 'MG-BRO-00142',
      importerExporter: 'Mada Imports SARL',
      incoterm: 'FOB',
      currency: 'USD',
      cifValue: 22500,
      freightValue: 18500,
      insuranceValue: 680,
      totalDuties: 5625,
      totalVAT: 3938,
      totalOtherTaxes: 225,
      hsItems: [
        { hsCode: '8517.13', description: 'Smartphones, cellular', netWeight: 21400, grossWeight: 22000, quantity: 480, value: 22500, dutyRate: 20, vatRate: 20, dutyAmount: 4500, vatAmount: 4500 },
      ],
      officeOfEntry: 'Toamasina Customs',
      transportMode: 'sea',
      conveyanceRef: 'CMA CGM MOLIERE',
      packages: 480,
      grossWeight: 22000,
      countryOfOrigin: 'CN',
      countryOfExport: 'CN',
      countryOfDestination: 'MG',
      submittedAt: daysAgoIso(3),
      acceptedAt: daysAgoIso(3),
      mrns: 'MRN-MG-TMM-2026-08B2-1247',
      assessmentNumber: 'ASM-1247',
      createdAt: daysAgoIso(4),
      events: [
        { at: daysAgoIso(4), stage: 'draft', message: 'Import declaration prepared', officer: 'Lina R.' },
        { at: daysAgoIso(3), stage: 'submitted', message: 'SAD lodged to ASYCUDA', officer: 'SYSTEM' },
        { at: daysAgoIso(3), stage: 'accepted', message: 'MRN assigned', officer: 'SYSTEM' },
        { at: daysAgoIso(2), stage: 'assessed', message: 'Duties assessed: MGA ~22.5M payable', officer: 'Customs Officer A.R.' },
      ],
      notes: 'Awaiting duty payment before release. Customer Mada Imports has been invoiced.',
    },
    {
      id: uid('cd_'),
      number: 'SAD-MG-2026-0001252',
      shipmentId: shipments[1].id,
      type: 'EX1',
      status: 'submitted',
      declarantName: 'Lina Ratsimba',
      declarantCode: 'MG-BRO-00142',
      importerExporter: 'Europe Pharma Group',
      incoterm: 'FOB',
      currency: 'USD',
      cifValue: 6800,
      freightValue: 5200,
      insuranceValue: 180,
      totalDuties: 0,
      totalVAT: 0,
      totalOtherTaxes: 0,
      hsItems: [
        { hsCode: '3004.90', description: 'Pharmaceuticals cold chain', netWeight: 460, grossWeight: 480, quantity: 12, value: 6800, dutyRate: 0, vatRate: 0, dutyAmount: 0, vatAmount: 0 },
      ],
      officeOfEntry: 'Ivato Airport Customs',
      transportMode: 'air',
      conveyanceRef: 'AF935',
      packages: 12,
      grossWeight: 480,
      countryOfOrigin: 'MG',
      countryOfExport: 'MG',
      countryOfDestination: 'FR',
      submittedAt: hoursAgoIso(1),
      mrns: 'MRN-MG-TNR-2026-08C5-1252',
      createdAt: hoursAgoIso(2),
      events: [
        { at: hoursAgoIso(2), stage: 'draft', message: 'Declaration prepared', officer: 'Lina R.' },
        { at: hoursAgoIso(1), stage: 'submitted', message: 'Lodged to Customs; awaiting acceptance' },
      ],
    },
  ];

  // Journal entries (simple GL)
  const journal: JournalEntry[] = [
    { id: uid('je_'), date: days(-20), type: 'invoice_receivable', reference: 'INV-2026-0102', description: 'Invoice to Mauritius Trading (paid)', customerId: customers[3].id, shipmentId: shipments[3].id, debitAccount: '1200 - Accounts Receivable', creditAccount: '4000 - Revenue (Air Freight)', amount: 9400, currency: 'USD', createdBy: 'Andry R.', createdAt: daysAgoIso(20) },
    { id: uid('je_'), date: days(-7), type: 'bank_deposit', reference: 'INV-2026-0102', description: 'Payment received — Mauritius Trading', customerId: customers[3].id, debitAccount: '1000 - Bank Account', creditAccount: '1200 - Accounts Receivable', amount: 9400, currency: 'USD', createdBy: 'Andry R.', createdAt: daysAgoIso(7), reconciled: true },
    { id: uid('je_'), date: days(-12), type: 'invoice_receivable', reference: 'INV-2026-0101', description: 'Invoice to Indian Ocean Textiles (sent, open)', customerId: customers[0].id, shipmentId: shipments[0].id, debitAccount: '1200 - Accounts Receivable', creditAccount: '4000 - Revenue (Sea Freight)', amount: 14200, currency: 'USD', createdBy: 'Hery L.', createdAt: daysAgoIso(12) },
    { id: uid('je_'), date: days(-2), type: 'invoice_receivable', reference: 'INV-2026-0103', description: 'Invoice to Mada Imports (draft)', customerId: customers[2].id, shipmentId: shipments[2].id, debitAccount: '1200 - Accounts Receivable', creditAccount: '4000 - Revenue (Sea Freight)', amount: 22500, currency: 'USD', createdBy: 'Voahangy R.', createdAt: daysAgoIso(2) },
    { id: uid('je_'), date: days(-15), type: 'freight_cost', reference: 'FRT-2026-0001', description: 'Maersk ocean freight buy cost (est.)', shipmentId: shipments[0].id, debitAccount: '5000 - COGS Ocean Freight', creditAccount: '2000 - Accounts Payable (Carriers)', amount: 10500, currency: 'USD', createdBy: 'Andry R.', createdAt: daysAgoIso(15) },
    { id: uid('je_'), date: days(-3), type: 'trucking_cost', reference: 'TRK-2026-0001', description: 'Inland trucking cost Toamasina-Tana', shipmentId: shipments[0].id, debitAccount: '5100 - COGS Trucking', creditAccount: '2000 - Accounts Payable (Carriers)', amount: 1850, currency: 'USD', createdBy: 'Voahangy R.', createdAt: daysAgoIso(3) },
    { id: uid('je_'), date: days(-1), type: 'customs_duty', reference: 'SAD-MG-2026-0001247', description: 'Customs duties payable on FRT-2026-0003', shipmentId: shipments[2].id, debitAccount: '5200 - COGS Customs/Duties', creditAccount: '2200 - Duty Payable', amount: 9788, currency: 'USD', createdBy: 'Lina R.', createdAt: daysAgoIso(1) },
  ];

  // Customer notes / timeline
  const customerNotes: CustomerNote[] = [
    { id: uid('cn_'), customerId: customers[0].id, type: 'call', title: 'Q1 review call', body: 'Discussed Q1 vanilla volumes. They expect +30% over next 2 months. Need reefer capacity confirmed by week 4. Rakoto happy with Maersk service but wants faster turnaround on BLs.', author: 'Hery Lalao', createdAt: daysAgoIso(5) },
    { id: uid('cn_'), customerId: customers[0].id, type: 'meeting', title: 'Contract renewal discussion', body: 'Meeting scheduled 1 September to renegotiate 2027 rates. Target: hold rates flat, push for volume rebate > 150TEU/yr.', author: 'Andry R.', createdAt: daysAgoIso(2) },
    { id: uid('cn_'), customerId: customers[2].id, type: 'note', title: 'Credit watch', body: 'Two invoices overdue last quarter. Tighten credit limit to $50K until payment history improves. Voahangy to follow up weekly.', author: 'Andry R.', createdAt: daysAgoIso(30) },
    { id: uid('cn_'), customerId: customers[4].id, type: 'email', title: 'Cold chain SOP requested', body: 'Hans needs documented cold-chain SOP (2-8°C) for vaccine shipments. Shared our Pharma brochure. Scheduled site visit.', author: 'Hery Lalao', createdAt: daysAgoIso(10) },
    { id: uid('cn_'), customerId: customers[1].id, type: 'complaint', title: 'Phytosanitary cert delay', body: 'Hanta complained phyto was 1 day late on last clove shipment. Lina to prioritize GES certs for future bookings within 48h.', author: 'Voahangy R.', createdAt: daysAgoIso(8) },
  ];

  // Batch 6: Warehouse Receipts (WMS)
  const warehouseReceipts: WarehouseReceipt[] = [
    {
      id: uid('wr_'), number: 'WHR-2026-0001', shipmentId: shipments[0].id,
      type: 'cfs_stuff', status: 'loaded_out',
      customerName: customers[0].name, location: 'CFS Bay B, Position 14', zone: 'CFS_EXPORT',
      pieces: 320, weightKg: 12000, volumeCbm: 28,
      marksAndNumbers: 'IOT/VAN/HAM-320CTN', containerNumber: 'MSKU6123847', sealNumber: 'MG-SEAL-20193',
      commodity: 'Vanilla Beans', temperature: 5,
      etaDate: days(-12), arrivedAt: daysAgoIso(13), unloadedAt: daysAgoIso(13), receivedAt: daysAgoIso(13), releasedAt: daysAgoIso(11),
      createdAt: daysAgoIso(14),
      events: [
        { at: daysAgoIso(14), stage: 'expected', message: 'Cargo expected for consolidation' },
        { at: daysAgoIso(13), stage: 'arrived', message: 'Cargo received at warehouse dock', officer: 'Tiana R.' },
        { at: daysAgoIso(13), stage: 'unloaded', message: '320 cartons unloaded from truck TRK-2026-0001', officer: 'Tiana R.' },
        { at: daysAgoIso(13), stage: 'received', message: 'Cargo inspected, count matches paperwork', officer: 'Naina A.' },
        { at: daysAgoIso(12), stage: 'putaway', message: 'Stored in reefer zone at +5°C', officer: 'Tiana R.' },
        { at: daysAgoIso(11), stage: 'stuffed', message: 'Stuffed into container MSKU6123847, seal applied', officer: 'Warehouse Lead' },
        { at: daysAgoIso(11), stage: 'loaded_out', message: 'Container loaded onto MAERSK EMDEN', officer: 'Operations' },
      ],
    },
    {
      id: uid('wr_'), number: 'WHR-2026-0002', shipmentId: shipments[2].id,
      type: 'cfs_strip', status: 'unloaded',
      customerName: customers[2].name, location: 'CFS Bay A, Import Section', zone: 'CFS_IMPORT',
      pieces: 480, weightKg: 22000, volumeCbm: 55,
      marksAndNumbers: 'MADA/ECN/TSM-480CTN', containerNumber: 'CMAU5283910', sealNumber: 'CNSL-88342',
      commodity: 'Consumer Electronics (UN3480 Lithium)',
      etaDate: days(0), arrivedAt: days(-1),
      notes: 'DG cargo - Class 9 lithium batteries. Stored in DG locker pending customs inspection.',
      dangerous: true,
      createdAt: daysAgoIso(5),
      events: [
        { at: daysAgoIso(5), stage: 'expected', message: 'Import container ETA Toamasina' },
        { at: daysAgoIso(1), stage: 'arrived', message: 'Discharged from vessel CMA CGM MOLIERE', officer: 'Port Ops' },
        { at: hoursAgoIso(18), stage: 'unloaded', message: 'Container stripped at CFS, 480 cartons offloaded', officer: 'Tiana R.' },
      ],
    },
    {
      id: uid('wr_'), number: 'WHR-2026-0003', shipmentId: shipments[1].id,
      type: 'outbound', status: 'received',
      customerName: customers[4].name, location: 'Ivato Airport Cargo, Bay 3', zone: 'REEFER',
      pieces: 12, weightKg: 480, volumeCbm: 2.5,
      marksAndNumbers: 'EPG/CDG/PHARMA-12ULD',
      commodity: 'Pharmaceuticals Cold Chain', temperature: 2,
      etaDate: days(2), arrivedAt: hoursAgoIso(4), receivedAt: hoursAgoIso(3),
      notes: 'Pharma cold chain at +2°C. Awaiting customs clearance for AF935.',
      createdAt: daysAgoIso(2),
      events: [
        { at: daysAgoIso(2), stage: 'expected', message: 'Cargo expected at Ivato T1' },
        { at: hoursAgoIso(4), stage: 'arrived', message: 'Cargo delivered by temperature-controlled truck', officer: 'Airside Ops' },
        { at: hoursAgoIso(3), stage: 'received', message: 'Temperature log verified (+2°C throughout), cargo accepted', officer: 'Cold Chain Mgr' },
      ],
    },
    {
      id: uid('wr_'), number: 'WHR-2026-0004',
      type: 'inbound', status: 'expected',
      customerName: 'Global Spice Exporters', location: 'Toamasina CFS — Bay C', zone: 'CFS_EXPORT',
      pieces: 0, weightKg: 8000, volumeCbm: 22,
      commodity: 'Black Pepper & Cloves',
      etaDate: days(6),
      notes: 'Expected from Sambava via TRK-2026-0004',
      createdAt: daysAgoIso(1),
      events: [
        { at: daysAgoIso(1), stage: 'expected', message: 'Warehouse booking confirmed for FRT-2026-0005' },
      ],
    },
  ];

  // Cargo items (piece-level tracking for WHR-0002 DG import)
  const cargoItems: CargoItem[] = [
    { id: uid('ci_'), receiptId: warehouseReceipts[1].id, pieceLabel: 'CTN-001', description: 'Smartphones - Master Carton A', weightKg: 45.8, dimsCm: '60x40x40', hsCode: '8517.13', location: 'DG Locker 2' },
    { id: uid('ci_'), receiptId: warehouseReceipts[1].id, pieceLabel: 'CTN-002', description: 'Smartphones - Master Carton B', weightKg: 46.1, dimsCm: '60x40x40', hsCode: '8517.13', location: 'DG Locker 2' },
    { id: uid('ci_'), receiptId: warehouseReceipts[1].id, pieceLabel: 'CTN-003', description: 'Chargers & Accessories', weightKg: 32.0, dimsCm: '55x38x38', hsCode: '8504.40', location: 'DG Locker 2' },
    { id: uid('ci_'), receiptId: warehouseReceipts[0].id, pieceLabel: 'PAL-01', description: 'Vanilla - 16 cartons per pallet', weightKg: 600, dimsCm: '120x100x180', hsCode: '0905.10', location: 'Loaded in MSKU6123847' },
  ];

  // Shipment Legs (multi-leg door-to-door)
  const shipmentLegs: ShipmentLeg[] = [
    // FRT-2026-0001 (export sea Tana→Toamasina→Hamburg→door)
    { id: uid('lg_'), shipmentId: shipments[0].id, seq: 1, mode: 'trucking', carrier: 'Inland Trucking', voyageRef: 'TRK-2026-0001', fromLocation: 'Seller Warehouse, Antananarivo', toLocation: 'CFS Toamasina', etd: days(-13), eta: days(-12), atd: days(-13), status: 'completed', distanceKm: 370, cost: 450 },
    { id: uid('lg_'), shipmentId: shipments[0].id, seq: 2, mode: 'trucking', carrier: 'Inland Trucking', voyageRef: 'Local Haul', fromLocation: 'CFS Toamasina', toLocation: 'Port Toamasina Terminal 2', etd: days(-11), eta: days(-11), atd: days(-11), ata: days(-11), status: 'completed', distanceKm: 12, cost: 120 },
    { id: uid('lg_'), shipmentId: shipments[0].id, seq: 3, mode: 'sea', carrier: 'Maersk', voyageRef: 'MAERSK EMDEN 042E', fromLocation: 'Toamasina Port', toLocation: 'Hamburg Hafen', etd: days(-9), eta: days(18), atd: days(-9), status: 'in_transit', distanceKm: 12500, cost: 10500 },
    { id: uid('lg_'), shipmentId: shipments[0].id, seq: 4, mode: 'trucking', carrier: 'DB Schenker DE', fromLocation: 'Hamburg Hafen', toLocation: 'Buyer DC, Hamburg', etd: days(19), eta: days(20), status: 'booked', distanceKm: 25, cost: 380 },

    // FRT-2026-0003 (import sea Shanghai→Toamasina→Tana)
    { id: uid('lg_'), shipmentId: shipments[2].id, seq: 1, mode: 'trucking', carrier: 'Local CN Trucking', fromLocation: 'Foxconn Factory, Shenzhen', toLocation: 'Port Shanghai', etd: days(-28), eta: days(-27), atd: days(-28), ata: days(-27), status: 'completed', distanceKm: 250, cost: 450 },
    { id: uid('lg_'), shipmentId: shipments[2].id, seq: 2, mode: 'sea', carrier: 'CMA CGM', voyageRef: 'CMA CGM MOLIERE', fromLocation: 'Shanghai', toLocation: 'Toamasina', etd: days(-24), eta: days(4), atd: days(-24), status: 'in_transit', distanceKm: 11500, cost: 18500 },
    { id: uid('lg_'), shipmentId: shipments[2].id, seq: 3, mode: 'trucking', carrier: 'Eric Randria Trucking', voyageRef: 'TRK-2026-0002', fromLocation: 'Port Toamasina CFS', toLocation: 'Ivandry Warehouse, Antananarivo', etd: days(5), eta: days(6), status: 'booked', distanceKm: 370, cost: 2400, notes: 'Awaiting customs release before dispatch' },

    // FRT-2026-0002 air export (pharma TNR→CDG)
    { id: uid('lg_'), shipmentId: shipments[1].id, seq: 1, mode: 'trucking', carrier: 'Cold Chain Express', fromLocation: 'Pharma Plant, Antananarivo', toLocation: 'Ivato T1 Cargo', etd: days(2), eta: days(2), status: 'booked', distanceKm: 15, cost: 95 },
    { id: uid('lg_'), shipmentId: shipments[1].id, seq: 2, mode: 'air', carrier: 'Air France Cargo', voyageRef: 'AF935', fromLocation: 'TNR (Ivato)', toLocation: 'CDG (Paris CDG)', etd: days(2), eta: days(3), status: 'booked', distanceKm: 8800, cost: 5200 },
  ];

  // Inbound Emails (two-way inbox simulation)
  const inboundEmails: InboundEmail[] = [
    { id: uid('ie_'), from: 'tracking@maersk.com', fromName: 'Maersk Track & Trace', to: 'ops@freightflow.mg', subject: 'MAEUBN2026010 — Vessel delay notice (updated ETA)', bodyPreview: 'Dear Customer, please be advised that MAERSK EMDEN v.042E has experienced a 36-hour weather delay en route to Durban. Updated ETA Hamburg is now 2026-09-08...', receivedAt: hoursAgoIso(6), read: false, folder: 'carrier', classification: 'tracking', relatedType: 'shipment', relatedId: shipments[0].id, relatedRef: 'FRT-2026-0001' },
    { id: uid('ie_'), from: 'docs@cma-cgm.com', fromName: 'CMA CGM Documentation', to: 'docs@freightflow.mg', subject: 'Arrival Notice — CMAU5283910 on CMA CGM MOLIERE', bodyPreview: 'Dear Customer, Please find attached the Arrival Notice for B/L CMABKSH8834 discharging at Toamasina. D/O and customs documentation required before cargo release...', receivedAt: hoursAgoIso(12), read: true, folder: 'inbox', classification: 'booking_conf', relatedType: 'shipment', relatedId: shipments[2].id, relatedRef: 'FRT-2026-0003', attachments: [{ name: 'ArrivalNotice_CMABKSH8834.pdf', size: 184320 }] },
    { id: uid('ie_'), from: 'rakoto@iotextiles.mg', fromName: 'Rakoto Be (IOT Ltd)', to: 'sales@freightflow.mg', subject: 'Re: Q4 vanilla capacity inquiry', bodyPreview: 'Hello Hery, thanks for your update. We would like to confirm an additional 2x40HC reefer for the week of Sept 15. Please send proforma with preferred rates. Best, Rakoto', receivedAt: hoursAgoIso(20), read: true, folder: 'customer', classification: 'inquiry', relatedRef: 'Indian Ocean Textiles Ltd' },
    { id: uid('ie_'), from: 'customs-alerts@asycuda.mg', fromName: 'ASYCUDA World MG', to: 'customs@freightflow.mg', subject: 'MRN MRN-MG-TMM-2026-08B2-1247 — Duty Assessment Available', bodyPreview: 'Your declaration SAD-MG-2026-0001247 has been assessed. Total duties & taxes payable: MGA 44,046,000 (approx USD 9,788). Please proceed to payment via e-Tax...', receivedAt: hoursAgoIso(26), read: true, folder: 'customs', classification: 'customs', relatedType: 'shipment', relatedId: shipments[2].id, relatedRef: 'SAD-MG-2026-0001247' },
    { id: uid('ie_'), from: 'driver-rivo@freightflow.mg', fromName: 'Rivo Andriamahefa (Driver)', to: 'ops@freightflow.mg', subject: 'POD Uploaded — TRK-2026-0003 (completed)', bodyPreview: 'Hello Operations, Delivery completed and signed by Hery at Ivandry Warehouse. POD photo attached. Reefer temperature maintained at +5°C throughout transit. Regards, Rivo', receivedAt: daysAgoIso(12), read: true, folder: 'inbox', classification: 'pod', relatedType: 'trucking', relatedId: trucking[2].id, relatedRef: 'TRK-2026-0003', attachments: [{ name: 'POD_TRK-2026-0003.jpg', size: 842000 }] },
    { id: uid('ie_'), from: 'no-reply@afklcargo.com', fromName: 'Air France KLM Cargo', to: 'ops@freightflow.mg', subject: 'Booking Confirmation — AF-CGO-935-0226 (1 AKE)', bodyPreview: 'Thank you for choosing Air France Cargo. Your booking AF-CGO-935-0226 for 1x AKE ULD (1,500 kg) on flight AF935 from TNR to CDG on 2026-08-22 has been confirmed...', receivedAt: daysAgoIso(4), read: true, folder: 'carrier', classification: 'booking_conf', relatedType: 'shipment', relatedId: shipments[1].id, relatedRef: 'FRT-2026-0002' },
    { id: uid('ie_'), from: 'hanta@globalspice.mg', fromName: 'Hanta Rasoa', to: 'sales@freightflow.mg', subject: 'URGENT: Pepper shipment delay complaint', bodyPreview: 'Hello, Our clove shipment with you last month arrived in Rotterdam 5 days late and we incurred a USD 2,400 penalty from our buyer. We need an explanation and compensation proposal...', receivedAt: hoursAgoIso(32), read: false, folder: 'customer', classification: 'complaint' },
  ];

  // Proof of Delivery
  const pods: Pod[] = [
    {
      id: uid('pod_'), truckingId: trucking[2].id, shipmentId: shipments[3].id,
      receiverName: 'Hery Lalao (Warehouse Supervisor)',
      comments: 'All 45 pieces received in good order. Spare parts checked against packing list - no shortages.',
      deliveredAt: daysAgoIso(12), condition: 'good', piecesSigned: 45,
      createdAt: daysAgoIso(12),
    },
  ];
  // Link POD to completed trucking
  trucking[2].podId = pods[0].id;
  trucking[2].signedBy = 'Hery Lalao';
  trucking[2].signedAt = pods[0].deliveredAt;

  // ---------- Batch 7: Portal messages ----------
  const portalMessages: PortalMessage[] = [
    { id: uid('pm_'), shipmentId: shipments[0].id, from: 'customer', authorName: 'Rakoto Vanilla Co.', body: 'Bonjour, can you confirm the ETA for our vanilla shipment to Hamburg? We need to arrange cold storage.', createdAt: daysAgoIso(1) },
    { id: uid('pm_'), shipmentId: shipments[0].id, from: 'forwarder', authorName: 'Voahangy R. (Ops)', body: 'Hi Rakoto, the MSKU1234567 vessel is currently transiting Durban and is on schedule for ETA 28 Aug. We\'ll send the arrival notice 72h prior.', createdAt: daysAgoIso(1) },
    { id: uid('pm_'), shipmentId: shipments[2].id, from: 'customer', authorName: 'Hanta R.', body: 'Please send the commercial invoice and packing list — our accounts team needs them for payment.', createdAt: hoursAgoIso(6) },
  ];

  // ---------- Batch 7: Yard slots (Toamasina) ----------
  const yardSlots: YardSlot[] = [];
  const zones: YardSlot['zone'][] = ['import_full','import_full','import_full','export_full','export_full','export_full','empty','empty','reefer','dg','awaiting_inspection'];
  const letters = ['A','B','C','D'];
  let ci = 0;
  for (const L of letters) {
    for (let n = 1; n <= 8; n++) {
      const zone = zones[ci % zones.length];
      const hasContainer = Math.random() > 0.3 || zone === 'reefer' || zone === 'dg';
      const cnum = hasContainer ? ['MSKU','MAEU','CMAU','TCLU','TCNU'][Math.floor(Math.random()*5)] + String(1000000 + Math.floor(Math.random()*8999999)) : undefined;
      yardSlots.push({
        code: `${L}-${String(n).padStart(2,'0')}`,
        zone,
        container: cnum,
        size: Math.random() > 0.4 ? '40' : '20',
        reefer: zone === 'reefer',
        dg: zone === 'dg',
        dwellHours: cnum ? Math.floor(Math.random() * 120) + 4 : 0,
      });
      ci++;
    }
  }

  // ---------- Batch 7: Yard moves (gate log) ----------
  const yardMoves: YardMove[] = [
    { id: uid('ym_'), containerNumber: 'MSKU1234567', type: 'discharged_from_vessel', location: 'Berth 3 → B-04', terminal: 'Toamasina Intl Container Terminal', time: daysAgoIso(3), vesselRef: 'MAERSK-CASABLANCA/082W', sealed: true, officer: 'Lina Ratsimba' },
    { id: uid('ym_'), containerNumber: 'CMAU9876543', type: 'gate_in', location: 'Gate 1', terminal: 'Toamasina Intl Container Terminal', time: daysAgoIso(2), truckPlate: '5241 TAA', sealed: true, officer: 'Andry R.' },
    { id: uid('ym_'), containerNumber: 'TCLU1112223', type: 'loaded_to_vessel', location: 'D-02 → Berth 1', terminal: 'Toamasina Intl Container Terminal', time: daysAgoIso(1), vesselRef: 'CMA-CGM-CALLAO/045E', sealed: true, officer: 'Voahangy R.' },
    { id: uid('ym_'), containerNumber: 'TCNU4445556', type: 'gate_out', location: 'Gate 2', terminal: 'Toamasina Intl Container Terminal', time: hoursAgoIso(14), truckPlate: '1234 TAA', sealed: true, officer: 'Andry R.' },
    { id: uid('ym_'), containerNumber: 'MSKU7788990', type: 'mounted_to_truck', location: 'Yard B-07', terminal: 'Toamasina Intl Container Terminal', time: hoursAgoIso(4), truckPlate: '6789 TAA', sealed: true, officer: 'Rivo A.' },
  ];

  // ---------- Batch 8: Document Approvals ----------
  const docApprovals: DocApproval[] = [
    { id: uid('ap_'), docName: 'Draft Bill of Lading — FRT-2026-0001 (please confirm)', relatedType: 'shipment', relatedId: shipments[0].id, category: 'BL Draft Approval', requestedBy: 'Voahangy R. (Docs)', requestedAt: hoursAgoIso(4), status: 'pending', reviewers: [
      { name: 'Customer (Indian Ocean Textiles)', role: 'Customer', status: 'pending' },
      { name: 'Voahangy R.', role: 'Ops Mgr', status: 'approved', decidedAt: hoursAgoIso(3), comment: 'Docs verified internally' },
    ]},
    { id: uid('ap_'), docName: 'Phytosanitary Certificate — Spices to Rotterdam', relatedType: 'shipment', relatedId: shipments[4].id, category: 'Certificate', requestedBy: 'Hery Lalao (Sales)', requestedAt: hoursAgoIso(18), status: 'pending', reviewers: [
      { name: 'Ministry of Agriculture', role: 'External', status: 'pending' },
      { name: 'Voahangy R.', role: 'Ops Mgr', status: 'approved', decidedAt: hoursAgoIso(12), comment: 'Docs complete, awaiting cert' },
    ], expiryDate: days(21) },
    { id: uid('ap_'), docName: 'Customs Broker License Renewal', category: 'License', requestedBy: 'Admin', requestedAt: daysAgo(-90), status: 'approved', reviewers: [
      { name: 'Direction Générale des Douanes', role: 'Regulator', status: 'approved', decidedAt: daysAgo(-80), comment: 'License valid until 31/12/2026' },
    ], expiryDate: '2026-12-31' },
    { id: uid('ap_'), docName: 'Invoice INV-2026-0101 — please acknowledge', relatedType: 'invoice', relatedId: invoices[0].id, category: 'Invoice Acknowledgement', requestedBy: 'Finance', requestedAt: daysAgoIso(2), status: 'pending', reviewers: [
      { name: 'Customer (Indian Ocean Textiles)', role: 'Customer', status: 'pending' },
    ]},
    { id: uid('ap_'), docName: 'Certificate of Origin MG2026120 — FRT-0001', relatedType: 'shipment', relatedId: shipments[0].id, category: 'Document Acknowledgement', requestedBy: 'Docs team', requestedAt: daysAgoIso(3), status: 'approved', reviewers: [
      { name: 'Customer (Indian Ocean Textiles)', role: 'Customer', status: 'approved', decidedAt: daysAgoIso(2), comment: 'Looks good, thanks' },
    ]},
  ];

  // ---------- Batch 8: Notifications feed (seeded with recent activity) ----------
  const notifications: AppNotification[] = [
    { id: uid('n_'), kind: 'trucking', title: 'POD signed for TRK-2026-0001', body: 'Rivo A. delivered at Indian Ocean Textiles HQ', href: `/trucking/`, at: hoursAgoIso(2), read: false },
    { id: uid('n_'), kind: 'customs', title: 'FRT-2026-0002 held for inspection', body: 'ASYCUDA: Red channel — physical inspection required at Ivato', href: `/customs/`, at: hoursAgoIso(5), read: false },
    { id: uid('n_'), kind: 'shipment', title: 'FRT-2026-0001 departed Toamasina', body: 'MAERSK EMDEN 042E — atd ' + daysAgoIso(9).slice(0,10), href: `/shipments/`, at: daysAgoIso(9), read: true },
    { id: uid('n_'), kind: 'email', title: 'Quote Q-2026-0201 opened by Global Spice', body: 'Customer viewed quote 20h ago — follow up?', href: `/emails/`, at: hoursAgoIso(20), read: true },
    { id: uid('n_'), kind: 'approval', title: 'Awaiting your approval: BL Release FRT-0001', body: 'Requested by Voahangy R. — 2 reviewers pending', href: `/shipments/?id=${shipments[0].id}`, at: hoursAgoIso(12), read: false },
    { id: uid('n_'), kind: 'yard', title: 'Container MSKU7788990 dwell > 72h', body: 'Slot B-07 — reefer at 5°C, awaiting clearance', href: `/yard/`, at: hoursAgoIso(4), read: false },
    { id: uid('n_'), kind: 'ai', title: 'AI: 3 shipments arrive in next 7 days', body: 'Capacity alerts on Toamasina yard — review dispatches', href: `/reports/`, at: hoursAgoIso(8), read: true },
    { id: uid('n_'), kind: 'system', title: 'Welcome to FreightFlow BETA 8', body: 'New: Doc approvals, OOBO e-invoicing, PWA offline, CSV export, yard drag-drop, quote→shipment, toasts, notification feed', href: `/benchmark/`, at: new Date().toISOString(), read: false },
  ];

  // Add an MGA e-invoice sample (Madagascar OOBO format) onto invoice index 2
  if (invoices[2]) {
    const eInvSample: EInvoiceMeta = {
      invoiceType: 'standard', nifEmitter: '1003456789', statEmitter: '9876543210123',
      nifClient: '2001122334', statClient: '5544332210987', ooboStatus: 'validated',
      ooboUid: 'OOBO-MG-2026-08-' + Math.floor(100000 + Math.random()*899999),
      ooboSubmittedAt: daysAgoIso(7),
      ooboQrCode: 'https://oobo.dgi.mg/v/' + Math.random().toString(36).slice(2,14),
      htva: 2500000, tvaRate: 20, tva: 500000, ttc: 3000000, paymentMethod: 'bank_transfer',
    };
    invoices[2] = {
      ...invoices[2],
      currency: 'MGA', subtotal: eInvSample.htva, tax: eInvSample.tva, total: eInvSample.ttc,
      einvoice: eInvSample,
      items: [
        { description: 'Fret maritime Shanghai-Toamasina (2×40HC)', amount: 1700000 },
        { description: 'Dédouanement & formalités (est.)', amount: 450000 },
        { description: 'Transport routier Toamasina-Tana', amount: 350000 },
      ],
    };
  }

  return {
    customers, shipments, trucking, invoices, quotes, activities,
    containers, bookings, emails, dg, docs, rates, quoteRequests,
    gpsPings, customsDeclarations, journal, customerNotes,
    // Batch 6
    warehouseReceipts, cargoItems, shipmentLegs, inboundEmails, pods,
    // Batch 7
    portalMessages, yardMoves, yardSlots,
    // Batch 8
    docApprovals, notifications,
    counter: { shipment: 8, invoice: 103, quote: 203, trucking: 4, booking: 6, container: 8, email: 5, doc: docs.length, rate: rates.length, qr: quoteRequests.length, customsDec: customsDeclarations.length, je: journal.length, note: customerNotes.length, whr: warehouseReceipts.length, leg: shipmentLegs.length, pod: pods.length, pm: portalMessages.length, ym: yardMoves.length, approval: docApprovals.length, notif: notifications.length },
  };
}

function load(): DB {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) { const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
    const parsed = JSON.parse(raw) as DB;
    // forward-compat: ensure new arrays exist
    if (!parsed.containers) parsed.containers = [];
    if (!parsed.bookings) parsed.bookings = [];
    if (!parsed.emails) parsed.emails = [];
    if (!parsed.dg) parsed.dg = [];
    if (!parsed.docs) parsed.docs = [];
    if (!parsed.rates) parsed.rates = [];
    if (!parsed.quoteRequests) parsed.quoteRequests = [];
    if (!parsed.gpsPings) parsed.gpsPings = [];
    if (!parsed.customsDeclarations) parsed.customsDeclarations = [];
    if (!parsed.journal) parsed.journal = [];
    if (!parsed.customerNotes) parsed.customerNotes = [];
    // Batch 6
    if (!parsed.warehouseReceipts) parsed.warehouseReceipts = [];
    if (!parsed.cargoItems) parsed.cargoItems = [];
    if (!parsed.shipmentLegs) parsed.shipmentLegs = [];
    if (!parsed.inboundEmails) parsed.inboundEmails = [];
    if (!parsed.pods) parsed.pods = [];
    // Batch 7
    if (!parsed.portalMessages) parsed.portalMessages = [];
    if (!parsed.yardMoves) parsed.yardMoves = [];
    if (!parsed.yardSlots) parsed.yardSlots = [];
    // Batch 8
    if (!parsed.docApprovals) parsed.docApprovals = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.counter.pm) parsed.counter.pm = 0;
    if (!parsed.counter.ym) parsed.counter.ym = 0;
    if (!parsed.counter.approval) parsed.counter.approval = 0;
    if (!parsed.counter.notif) parsed.counter.notif = 0;
    if (!parsed.counter.booking) parsed.counter.booking = 0;
    if (!parsed.counter.container) parsed.counter.container = 0;
    if (!parsed.counter.email) parsed.counter.email = 0;
    if (!parsed.counter.doc) parsed.counter.doc = 0;
    if (!parsed.counter.rate) parsed.counter.rate = 0;
    if (!parsed.counter.qr) parsed.counter.qr = 0;
    if (!parsed.counter.customsDec) parsed.counter.customsDec = 0;
    if (!parsed.counter.je) parsed.counter.je = 0;
    if (!parsed.counter.note) parsed.counter.note = 0;
    if (!parsed.counter.whr) parsed.counter.whr = 0;
    if (!parsed.counter.leg) parsed.counter.leg = 0;
    if (!parsed.counter.pod) parsed.counter.pod = 0;
    // B9.1: backfill chargeable weight for existing shipments (air: IATA 1:6000; sea: gross)
    parsed.shipments.forEach((s) => {
      if (typeof s.chargeableWeight !== 'number' || !isFinite(s.chargeableWeight)) {
        const volKg = s.mode === 'air' ? ((s.volume || 0) * 1_000_000) / 6000 : (s.volume || 0) * 1000;
        s.chargeableWeight = Math.max(s.weight || 0, volKg);
      }
    });
    return parsed;
  } catch { return seed(); }
}

function save(db: DB) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(db));
  try { window.dispatchEvent(new CustomEvent('ff:data-changed')); } catch {}
}

// Toast bus — store dispatches toast events when important actions happen.
// UI listens via window.addEventListener('ff:toast', ...).
export type ToastPayload = { title: string; description?: string; variant?: 'success'|'error'|'warning'|'info'|'shipment'|'email'|'ai'; duration?: number };
export function toast(p: ToastPayload) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent<ToastPayload>('ff:toast', { detail: p })); } catch {}
}

// Notification bus — adds to persistent notification feed AND fires toast
function pushNotif(db: DB, kind: AppNotification['kind'], title: string, body?: string, href?: string, relatedId?: string) {
  const n: AppNotification = { id: uid('n_'), kind, title, body, href, relatedId, at: new Date().toISOString(), read: false };
  db.notifications.unshift(n);
  if (db.notifications.length > 200) db.notifications.length = 200;
  db.counter.notif += 1;
  const variantMap: Record<string, ToastPayload['variant']> = {
    shipment: 'shipment', customs: 'warning', trucking: 'shipment', pod: 'success',
    warehouse: 'info', yard: 'info', invoice: 'success', quote: 'shipment',
    email: 'email', doc: 'info', approval: 'warning', ai: 'ai', system: 'info',
  };
  toast({ title, description: body, variant: variantMap[kind] || 'info' });
  return n;
}

function addActivity(db: DB, type: Activity['type'], message: string, reference: string, opts: { silent?: boolean } = {}) {
  db.activities.unshift({ id: uid('a_'), type, message, reference, timestamp: new Date().toISOString() });
  if (db.activities.length > 80) db.activities.length = 80;
  // Auto-create a notification + toast for significant events (Batch 8)
  // Only fire for state-changing messages to avoid noise.
  if (opts.silent) return;
  try {
    const lc = message.toLowerCase();
    const isSignificant =
      /status:|delivered|released|rejected|inspection|confirmed|paid|p\.?o\.?d|signed|approved|submitted|booked\b|departed|arrived|accepted|e-invoice|oo|cutoff/i.test(lc);
    if (!isSignificant) return;
    const kindMap: Record<string, AppNotification['kind']> = {
      shipment: 'shipment', customs: 'customs', invoice: 'invoice', quote: 'quote',
      email: 'email', warehouse: 'warehouse', trucking: 'trucking', pod: 'pod',
      booking: 'shipment', dg: 'system', note: 'system', customer: 'system',
    };
    const hrefMap: Record<string, string> = {
      shipment: `/shipments/`, invoice: `/invoices/`, quote: `/quotes/`,
      customs: `/customs/`, email: `/emails/`, warehouse: `/warehouse/`,
      trucking: `/trucking/`, pod: `/trucking/`, booking: `/shipments/`,
    };
    const k = kindMap[type];
    if (!k) return;
    const hrefBase = hrefMap[type] || '/';
    let href = hrefBase;
    if (reference) {
      const lookup = db.shipments.find(s => s.reference === reference)
        || db.invoices.find(i => i.number === reference)
        || db.quotes.find(q => q.number === reference)
        || db.trucking.find(t => t.reference === reference);
      if (lookup) href = `${hrefBase}?id=${(lookup as any).id}`;
    }
    pushNotif(db, k, message.slice(0, 90), reference, href);
  } catch {}
}

export const db = {
  getAll: (): DB => load(),
  reset: () => { const s = seed(); save(s); return s; },

  nextShipmentRef: () => { const d = load(); d.counter.shipment += 1; save(d); return `FRT-2026-${String(d.counter.shipment).padStart(4, '0')}`; },
  nextInvoiceNum: () => { const d = load(); d.counter.invoice += 1; save(d); return `INV-2026-${String(d.counter.invoice).padStart(4, '0')}`; },
  nextQuoteNum: () => { const d = load(); d.counter.quote += 1; save(d); return `Q-2026-${String(d.counter.quote).padStart(4, '0')}`; },
  nextTruckingRef: () => { const d = load(); d.counter.trucking += 1; save(d); return `TRK-2026-${String(d.counter.trucking).padStart(4, '0')}`; },
  nextBookingRef: () => { const d = load(); d.counter.booking += 1; save(d); return d.counter.booking; },

  createCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => { const d = load(); const nc: Customer = { ...c, id: uid('c_'), createdAt: new Date().toISOString() }; d.customers.push(nc); addActivity(d, 'shipment', `New customer added: ${nc.name}`, nc.name); save(d); return nc; },
  createShipment: (s: Omit<Shipment, 'id' | 'createdAt' | 'reference'>) => { const d = load(); const ref = `FRT-2026-${String(d.counter.shipment + 1).padStart(4, '0')}`; d.counter.shipment += 1; const ns: Shipment = { ...s, id: uid('s_'), reference: ref, createdAt: new Date().toISOString() }; d.shipments.unshift(ns); addActivity(d, 'shipment', `New ${s.mode} ${s.direction} shipment booked: ${ref}`, ref); save(d); return ns; },
  updateShipment: (id: string, patch: Partial<Shipment>) => { const d = load(); const i = d.shipments.findIndex((x) => x.id === id); if (i >= 0) { const prev = d.shipments[i]; d.shipments[i] = { ...prev, ...patch }; if (patch.status && patch.status !== prev.status) addActivity(d, 'shipment', `${d.shipments[i].reference} status: ${prev.status} → ${patch.status}`, d.shipments[i].reference); save(d); return d.shipments[i]; } return null; },
  deleteShipment: (id: string) => { const d = load(); d.shipments = d.shipments.filter((x) => x.id !== id); save(d); },

  createTrucking: (t: Omit<TruckingDispatch, 'id' | 'reference'>) => { const d = load(); const ref = `TRK-2026-${String(d.counter.trucking + 1).padStart(4, '0')}`; d.counter.trucking += 1; const nt: TruckingDispatch = { ...t, id: uid('t_'), reference: ref }; d.trucking.unshift(nt); if (nt.shipmentId) { const sh = d.shipments.find((s) => s.id === nt.shipmentId); if (sh) sh.truckingDispatched = true; } addActivity(d, 'trucking', `Trucking dispatch created: ${ref}`, ref); save(d); return nt; },
  updateTrucking: (id: string, patch: Partial<TruckingDispatch>) => { const d = load(); const i = d.trucking.findIndex((x) => x.id === id); if (i >= 0) { d.trucking[i] = { ...d.trucking[i], ...patch }; save(d); return d.trucking[i]; } return null; },

  createInvoice: (inv: Omit<Invoice, 'id' | 'number'>) => { const d = load(); const num = `INV-2026-${String(d.counter.invoice + 1).padStart(4, '0')}`; d.counter.invoice += 1; const ni: Invoice = { ...inv, id: uid('i_'), number: num }; d.invoices.unshift(ni); addActivity(d, 'invoice', `Invoice ${num} created for ${ni.customerName} (${ni.currency} ${ni.total.toLocaleString()})`, num); save(d); return ni; },
  updateInvoice: (id: string, patch: Partial<Invoice>) => { const d = load(); const i = d.invoices.findIndex((x) => x.id === id); if (i >= 0) { d.invoices[i] = { ...d.invoices[i], ...patch }; save(d); return d.invoices[i]; } return null; },

  createQuote: (q: Omit<Quote, 'id' | 'number' | 'createdAt'>) => { const d = load(); const num = `Q-2026-${String(d.counter.quote + 1).padStart(4, '0')}`; d.counter.quote += 1; const nq: Quote = { ...q, id: uid('q_'), number: num, createdAt: new Date().toISOString() }; d.quotes.unshift(nq); addActivity(d, 'quote', `Quote ${num} issued to ${q.customerName}`, num); save(d); return nq; },
  updateQuote: (id: string, patch: Partial<Quote>) => { const d = load(); const i = d.quotes.findIndex((x) => x.id === id); if (i >= 0) { d.quotes[i] = { ...d.quotes[i], ...patch }; save(d); return d.quotes[i]; } return null; },

  // ----- Container / Package manifest -----
  addContainer: (cp: Omit<ContainerPackage, 'id'>) => { const d = load(); const nc: ContainerPackage = { ...cp, id: uid('cp_') }; d.containers.push(nc); save(d); return nc; },
  updateContainer: (id: string, patch: Partial<ContainerPackage>) => { const d = load(); const i = d.containers.findIndex((x) => x.id === id); if (i >= 0) { d.containers[i] = { ...d.containers[i], ...patch }; save(d); return d.containers[i]; } return null; },
  deleteContainer: (id: string) => { const d = load(); d.containers = d.containers.filter((x) => x.id !== id); save(d); },
  containersForShipment: (sid: string) => load().containers.filter((c) => c.shipmentId === sid),

  // ----- Carrier e-Bookings -----
  createBooking: (b: Omit<CarrierBooking, 'id' | 'events'> & { initialEvent?: { stage: string; message: string } }) => {
    const d = load();
    const id = uid('bk_');
    const now = new Date().toISOString();
    const nb: CarrierBooking = { ...b, id, events: b.initialEvent ? [{ at: now, stage: b.initialEvent.stage, message: b.initialEvent.message }] : [] };
    d.bookings.push(nb);
    const sh = d.shipments.find((s) => s.id === b.shipmentId);
    if (sh) { sh.bookingRequested = true; if (b.status === 'confirmed') sh.bookingConfirmed = true; }
    addActivity(d, 'booking', `Booking ${b.bookingReference} ${b.status} with ${b.carrier}`, b.bookingReference);
    save(d);
    return nb;
  },
  updateBooking: (id: string, patch: Partial<CarrierBooking>, eventMessage?: { stage: string; message: string }) => {
    const d = load();
    const i = d.bookings.findIndex((x) => x.id === id);
    if (i >= 0) {
      d.bookings[i] = { ...d.bookings[i], ...patch };
      if (eventMessage) {
        d.bookings[i].events.push({ at: new Date().toISOString(), stage: eventMessage.stage, message: eventMessage.message });
        addActivity(d, 'booking', `${d.bookings[i].bookingReference}: ${eventMessage.message}`, d.bookings[i].bookingReference);
      }
      if (patch.status === 'confirmed') {
        const sh = d.shipments.find((s) => s.id === d.bookings[i].shipmentId);
        if (sh) sh.bookingConfirmed = true;
      }
      save(d);
      return d.bookings[i];
    }
    return null;
  },
  bookingForShipment: (sid: string) => load().bookings.find((b) => b.shipmentId === sid),

  // ----- Email logs -----
  logEmail: (e: Omit<EmailLog, 'id' | 'sentAt' | 'status'> & { status?: EmailLog['status'] }) => {
    const d = load();
    const ne: EmailLog = { ...e, id: uid('em_'), sentAt: new Date().toISOString(), status: e.status || 'sent' };
    d.emails.unshift(ne);
    d.counter.email += 1;
    // Mark related item as sent
    if (e.relatedType === 'invoice' && e.relatedId) {
      const inv = d.invoices.find((x) => x.id === e.relatedId);
      if (inv) { inv.sentAt = ne.sentAt; inv.status = inv.status === 'draft' ? 'sent' : inv.status; }
    }
    if (e.relatedType === 'quote' && e.relatedId) {
      const q = d.quotes.find((x) => x.id === e.relatedId);
      if (q) { q.sentAt = ne.sentAt; if (q.status === 'pending') q.status = 'sent' as any; }
    }
    addActivity(d, 'email', `Email sent: "${e.subject}" to ${e.to}`, e.relatedRef || '');
    save(d);
    return ne;
  },
  markEmailOpened: (id: string) => {
    const d = load();
    const i = d.emails.findIndex((x) => x.id === id);
    if (i >= 0) {
      d.emails[i].openedAt = new Date().toISOString();
      d.emails[i].status = 'opened';
      if (d.emails[i].relatedType === 'invoice' && d.emails[i].relatedId) {
        const inv = d.invoices.find((x) => x.id === d.emails[i].relatedId);
        if (inv && !inv.openedAt) inv.openedAt = d.emails[i].openedAt;
      }
      if (d.emails[i].relatedType === 'quote' && d.emails[i].relatedId) {
        const q = d.quotes.find((x) => x.id === d.emails[i].relatedId);
        if (q && !q.openedAt) q.openedAt = d.emails[i].openedAt;
      }
      save(d);
      return d.emails[i];
    }
    return null;
  },
  markEmailClicked: (id: string) => {
    const d = load();
    const i = d.emails.findIndex((x) => x.id === id);
    if (i >= 0) {
      d.emails[i].clickedAt = new Date().toISOString();
      d.emails[i].status = 'clicked';
      save(d);
      return d.emails[i];
    }
    return null;
  },

  // ----- Dangerous Goods -----
  dgForShipment: (sid: string) => load().dg.filter((x) => x.shipmentId === sid),
  addDG: (entry: Omit<DGEntry, 'id'>) => {
    const d = load();
    const ne: DGEntry = { ...entry, id: uid('dg_') };
    d.dg.push(ne);
    // mark container dangerous if any
    d.containers.filter((c) => c.shipmentId === entry.shipmentId).forEach((c) => { c.dangerous = true; if (entry.unNumber && !c.unNumber) c.unNumber = entry.unNumber; });
    addActivity(d, 'shipment', `DGD added for ${(d.shipments.find((s) => s.id === entry.shipmentId) || {}).reference || 'shipment'}: ${entry.unNumber}`, entry.unNumber);
    save(d);
    return ne;
  },
  updateDG: (id: string, patch: Partial<DGEntry>) => {
    const d = load();
    const i = d.dg.findIndex((x) => x.id === id);
    if (i >= 0) { d.dg[i] = { ...d.dg[i], ...patch }; save(d); return d.dg[i]; }
    return null;
  },
  deleteDG: (id: string) => { const d = load(); d.dg = d.dg.filter((x) => x.id !== id); save(d); },

  // ----- Documents (file metadata; base64 data optional) -----
  docsFor: (type: DocFile['relatedType'], id: string) => load().docs.filter((d) => d.relatedType === type && d.relatedId === id),
  addDoc: (doc: Omit<DocFile, 'id' | 'uploadedAt' | 'version'>) => {
    const d = load();
    const existingSameCat = d.docs.filter((x) => x.relatedType === doc.relatedType && x.relatedId === doc.relatedId && x.name === doc.name).length;
    const nd: DocFile = { ...doc, id: uid('d_'), uploadedAt: new Date().toISOString(), version: existingSameCat + 1 };
    d.docs.unshift(nd);
    d.counter.doc += 1;
    addActivity(d, 'shipment', `Document uploaded: ${doc.name}`, doc.name);
    save(d);
    return nd;
  },
  deleteDoc: (id: string) => { const d = load(); d.docs = d.docs.filter((x) => x.id !== id); save(d); },
  allDocs: () => load().docs,

  // ----- Rate cards -----
  allRates: () => load().rates,
  addRate: (r: Omit<RateCard, 'id' | 'createdAt'>) => {
    const d = load();
    const nr: RateCard = { ...r, id: uid('r_'), createdAt: new Date().toISOString() };
    d.rates.push(nr);
    d.counter.rate += 1;
    save(d);
    return nr;
  },
  updateRate: (id: string, patch: Partial<RateCard>) => { const d = load(); const i = d.rates.findIndex((x) => x.id === id); if (i >= 0) { d.rates[i] = { ...d.rates[i], ...patch }; save(d); return d.rates[i]; } return null; },
  deleteRate: (id: string) => { const d = load(); d.rates = d.rates.filter((x) => x.id !== id); save(d); },
  // Best rate for a lane (auto-quote engine)
  quoteRate: (mode: RateCard['mode'], direction: 'import' | 'export' | 'both', origin: string, destination: string, weightKg: number, volumeCbm: number): RateCard | null => {
    const d = load();
    const today = new Date().toISOString().slice(0, 10);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const o = norm(origin);
    const dest = norm(destination);
    const candidates = d.rates.filter((r) =>
      r.active && r.mode === mode &&
      (r.direction === 'both' || r.direction === direction) &&
      (norm(r.origin).includes(o.slice(0, 3)) || o.includes(norm(r.origin).slice(0, 3))) &&
      (norm(r.destination).includes(dest.slice(0, 3)) || dest.includes(norm(r.destination).slice(0, 3))) &&
      r.validFrom <= today && r.validUntil >= today
    );
    if (!candidates.length) {
      // fallback to closest carrier match by mode
      const any = d.rates.filter((r) => r.active && r.mode === mode && (r.direction === 'both' || r.direction === direction));
      return any[0] || null;
    }
    // pick cheapest sellRate adjusted by unit
    return candidates.sort((a, b) => {
      const costA = unitCost(a, weightKg, volumeCbm);
      const costB = unitCost(b, weightKg, volumeCbm);
      return costA - costB;
    })[0];
  },

  // ----- Quote requests (public portal) -----
  allQuoteRequests: () => load().quoteRequests,
  addQuoteRequest: (qr: Omit<QuoteRequest, 'id' | 'token' | 'status' | 'createdAt'>) => {
    const d = load();
    const nq: QuoteRequest = { ...qr, id: uid('qr_'), token: qrToken(), status: 'new', createdAt: new Date().toISOString() };
    d.quoteRequests.unshift(nq);
    d.counter.qr += 1;
    addActivity(d, 'quote', `New quote request from ${qr.customerName} (${qr.company || qr.customerEmail}) — ${qr.origin}→${qr.destination}`, 'Quote Request');
    save(d);
    return nq;
  },
  updateQuoteRequest: (id: string, patch: Partial<QuoteRequest>) => { const d = load(); const i = d.quoteRequests.findIndex((x) => x.id === id); if (i >= 0) { d.quoteRequests[i] = { ...d.quoteRequests[i], ...patch }; save(d); return d.quoteRequests[i]; } return null; },
  deleteQuoteRequest: (id: string) => { const d = load(); d.quoteRequests = d.quoteRequests.filter((x) => x.id !== id); save(d); },

  // ----- GPS pings -----
  gpsForTrucking: (tid: string) => load().gpsPings.filter((g) => g.truckingId === tid).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  addGpsPing: (g: Omit<GpsPing, 'id'>) => { const d = load(); const p: GpsPing = { ...g, id: uid('gp_') }; d.gpsPings.push(p); save(d); return p; },

  // ----- Customs declarations -----
  allCustomsDeclarations: () => load().customsDeclarations,
  customsForShipment: (sid: string) => load().customsDeclarations.find((c) => c.shipmentId === sid) || null,
  createCustomsDeclaration: (c: Omit<CustomsDeclaration, 'id' | 'createdAt' | 'events' | 'number'>) => {
    const d = load();
    const id = uid('cd_');
    d.counter.customsDec += 1;
    const num = `SAD-MG-2026-${String(1200 + d.counter.customsDec).padStart(7, '0')}`;
    const cd: CustomsDeclaration = { ...c, id, number: num, createdAt: new Date().toISOString(), events: [{ at: new Date().toISOString(), stage: 'draft', message: 'Declaration created', officer: c.declarantName }] };
    d.customsDeclarations.push(cd);
    addActivity(d, 'customs', `Customs declaration ${num} (${c.type}) prepared for shipment`, num);
    save(d); return cd;
  },
  advanceCustomsDeclaration: (id: string, nextStage: CustomsDeclaration['status'], message: string, officer?: string) => {
    const d = load();
    const i = d.customsDeclarations.findIndex((c) => c.id === id);
    if (i < 0) return null;
    const now = new Date().toISOString();
    d.customsDeclarations[i].events.push({ at: now, stage: nextStage, message, officer });
    d.customsDeclarations[i].status = nextStage;
    if (nextStage === 'submitted') d.customsDeclarations[i].submittedAt = now;
    if (nextStage === 'accepted') d.customsDeclarations[i].acceptedAt = now;
    if (nextStage === 'released') d.customsDeclarations[i].releasedAt = now;
    // Sync shipment customs status
    const sh = d.shipments.find((s) => s.id === d.customsDeclarations[i].shipmentId);
    if (sh) {
      if (nextStage === 'submitted') sh.customsStatus = 'declared';
      if (nextStage === 'inspection') sh.customsStatus = 'inspection';
      if (nextStage === 'assessed') sh.customsStatus = 'docs_received';
      if (nextStage === 'duties_paid') { sh.customsStatus = 'duties_paid'; sh.duties = d.customsDeclarations[i].totalDuties + d.customsDeclarations[i].totalVAT + d.customsDeclarations[i].totalOtherTaxes; }
      if (nextStage === 'released') sh.customsStatus = 'cleared';
      if (nextStage === 'rejected') sh.customsStatus = 'rejected';
    }
    addActivity(d, 'customs', `Customs ${d.customsDeclarations[i].number}: ${message}`, d.customsDeclarations[i].number);
    save(d);
    return d.customsDeclarations[i];
  },

  // ----- Journal / GL -----
  allJournal: () => load().journal,
  addJournalEntry: (je: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const d = load();
    const nj: JournalEntry = { ...je, id: uid('je_'), createdAt: new Date().toISOString() };
    d.journal.unshift(nj); d.counter.je += 1;
    save(d); return nj;
  },

  // ----- Customer notes -----
  notesForCustomer: (cid: string) => load().customerNotes.filter((n) => n.customerId === cid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  addCustomerNote: (n: Omit<CustomerNote, 'id' | 'createdAt'>) => {
    const d = load();
    const nn: CustomerNote = { ...n, id: uid('cn_'), createdAt: new Date().toISOString() };
    d.customerNotes.push(nn); d.counter.note += 1;
    addActivity(d, 'shipment', `Note added for ${d.customers.find((c) => c.id === n.customerId)?.name || 'customer'}: ${n.title}`, n.customerId);
    save(d); return nn;
  },
  deleteCustomerNote: (id: string) => { const d = load(); d.customerNotes = d.customerNotes.filter((x) => x.id !== id); save(d); },

  // Update customer (for CRM)
  updateCustomer: (id: string, patch: Partial<Customer>) => { const d = load(); const i = d.customers.findIndex((c) => c.id === id); if (i >= 0) { d.customers[i] = { ...d.customers[i], ...patch }; save(d); return d.customers[i]; } return null; },

  // ----- Batch 6: Warehouse / WMS -----
  allWarehouseReceipts: () => load().warehouseReceipts,
  whrForShipment: (sid: string) => load().warehouseReceipts.filter((w) => w.shipmentId === sid),
  createWarehouseReceipt: (w: Omit<WarehouseReceipt, 'id' | 'createdAt' | 'events' | 'number'>) => {
    const d = load();
    d.counter.whr += 1;
    const num = `WHR-2026-${String(d.counter.whr).padStart(4, '0')}`;
    const nw: WarehouseReceipt = { ...w, id: uid('wr_'), number: num, createdAt: new Date().toISOString(), events: [{ at: new Date().toISOString(), stage: w.status, message: `WHR ${num} created` }] };
    d.warehouseReceipts.push(nw);
    addActivity(d, 'warehouse', `Warehouse receipt ${num} created (${w.commodity})`, num);
    save(d); return nw;
  },
  advanceWarehouseReceipt: (id: string, nextStage: WarehouseReceipt['status'], message: string, officer?: string) => {
    const d = load();
    const i = d.warehouseReceipts.findIndex((w) => w.id === id);
    if (i < 0) return null;
    const now = new Date().toISOString();
    d.warehouseReceipts[i].events.push({ at: now, stage: nextStage, message, officer });
    d.warehouseReceipts[i].status = nextStage;
    if (nextStage === 'arrived') d.warehouseReceipts[i].arrivedAt = now;
    if (nextStage === 'unloaded') d.warehouseReceipts[i].unloadedAt = now;
    if (nextStage === 'received') d.warehouseReceipts[i].receivedAt = now;
    if (nextStage === 'released' || nextStage === 'loaded_out') d.warehouseReceipts[i].releasedAt = now;
    addActivity(d, 'warehouse', `${d.warehouseReceipts[i].number}: ${message}`, d.warehouseReceipts[i].number);
    save(d); return d.warehouseReceipts[i];
  },

  // ----- Batch 6: Cargo Items (piece-level) -----
  itemsForReceipt: (rid: string) => load().cargoItems.filter((ci) => ci.receiptId === rid),
  addCargoItem: (ci: Omit<CargoItem, 'id'>) => { const d = load(); const n: CargoItem = { ...ci, id: uid('ci_') }; d.cargoItems.push(n); save(d); return n; },
  updateCargoItem: (id: string, patch: Partial<CargoItem>) => { const d = load(); const i = d.cargoItems.findIndex((x) => x.id === id); if (i >= 0) { d.cargoItems[i] = { ...d.cargoItems[i], ...patch }; save(d); return d.cargoItems[i]; } return null; },
  deleteCargoItem: (id: string) => { const d = load(); d.cargoItems = d.cargoItems.filter((x) => x.id !== id); save(d); },

  // ----- Batch 6: Shipment Legs (multi-leg routing) -----
  legsForShipment: (sid: string) => load().shipmentLegs.filter((l) => l.shipmentId === sid).sort((a, b) => a.seq - b.seq),
  addShipmentLeg: (l: Omit<ShipmentLeg, 'id'>) => { const d = load(); const n: ShipmentLeg = { ...l, id: uid('lg_') }; d.shipmentLegs.push(n); d.counter.leg += 1; save(d); return n; },
  updateLeg: (id: string, patch: Partial<ShipmentLeg>) => { const d = load(); const i = d.shipmentLegs.findIndex((x) => x.id === id); if (i >= 0) { d.shipmentLegs[i] = { ...d.shipmentLegs[i], ...patch }; save(d); return d.shipmentLegs[i]; } return null; },

  // ----- Batch 6: Inbound Emails (two-way inbox) -----
  allInboundEmails: () => load().inboundEmails.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
  markInboundRead: (id: string) => { const d = load(); const i = d.inboundEmails.findIndex((e) => e.id === id); if (i >= 0) { d.inboundEmails[i].read = true; save(d); return d.inboundEmails[i]; } return null; },
  classifyInbound: (id: string, folder: InboundEmail['folder']) => { const d = load(); const i = d.inboundEmails.findIndex((e) => e.id === id); if (i >= 0) { d.inboundEmails[i].folder = folder; save(d); return d.inboundEmails[i]; } return null; },

  // ----- Batch 6: ASYCUDA SAD XML export -----
  generateSadXml: (sadId: string): string => {
    const d = load();
    const dec = d.customsDeclarations.find((c) => c.id === sadId);
    if (!dec) return '';
    // Simplified UNeDocs/SAD XML aligned with ASYCUDA World schema
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<UNEDECLA xmlns="urn:unece:uncefact:data:standard:CrossBorderDeclaration:2">
  <Declaration>
    <ID>${dec.number}</ID>
    <TypeCode listID="WCO-DECTYPE">${dec.type}</TypeCode>
    <FunctionalCategoryCode>9</FunctionalCategoryCode>
    <IssueDateTime>${dec.createdAt.slice(0,10)}</IssueDateTime>
    <Declarant>
      <Name>${dec.declarantName}</Name>
      <ID>${dec.declarantCode}</ID>
    </Declarant>
      <Importer><Name>${dec.importerExporter}</Name><RoleCode>${dec.type.startsWith('IM') ? 'IM' : 'EX'}</RoleCode></Importer>
    <BorderTransport>
      <ID>${dec.conveyanceRef}</ID>
      <ModeCode listID="UN-LOCODE-MOD">${dec.transportMode === 'sea' ? '1' : dec.transportMode === 'air' ? '4' : '3'}</ModeCode>
    </BorderTransport>
    <Consignment>
      <GoodsItemQuantity unitCode="NAR">${dec.packages}</GoodsItemQuantity>
      <GrossWeightMeasure unitCode="KGM">${dec.grossWeight}</GrossWeightMeasure>
      ${dec.hsItems.map((it, idx) => `
      <ConsignmentItem>
        <SequenceNumeric>${idx + 1}</SequenceNumeric>
        <Commodity>
          <ClassificationCode listID="HS">${it.hsCode}</ClassificationCode>
          <Description>${it.description}</Description>
        </Commodity>
        <GoodsMeasure>
          <GrossWeight unitCode="KGM">${it.grossWeight}</GrossWeight>
          <NetWeight unitCode="KGM">${it.netWeight}</NetWeight>
        </GoodsMeasure>
        <CustomsValuation>
          <ChargeableWeight unitCode="KGM">${it.netWeight}</ChargeableWeight>
          <CustomsValue amount="${dec.currency}">${it.value}</CustomsValue>
          <DutyTaxFee>
            <TypeCode>A00</TypeCode>
            <RateNumeric>${it.dutyRate}</RateNumeric>
            <CalculatedAmount amount="${dec.currency}">${it.dutyAmount}</CalculatedAmount>
          </DutyTaxFee>
        </CustomsValuation>
      </ConsignmentItem>`).join('')}
      <CustomsValuation>
        <InvoiceAmount amount="${dec.currency}">${dec.cifValue - dec.freightValue - dec.insuranceValue}</InvoiceAmount>
        <FreightAmount amount="${dec.currency}">${dec.freightValue}</FreightAmount>
        <InsuranceAmount amount="${dec.currency}">${dec.insuranceValue}</InsuranceAmount>
        <CustomsValue amount="${dec.currency}">${dec.cifValue}</CustomsValue>
      </CustomsValuation>
    </Consignment>
    <DutyTaxFee>
      <TypeCode>A00</TypeCode><AppliedAmount amount="${dec.currency}">${dec.totalDuties}</AppliedAmount>
    </DutyTaxFee>
    <DutyTaxFee>
      <TypeCode>B00</TypeCode><AppliedAmount amount="${dec.currency}">${dec.totalVAT}</AppliedAmount>
    </DutyTaxFee>
  </Declaration>
</UNEDECLA>`;
    return xml;
  },

  // ----- Batch 6: POD (Proof of Delivery) -----
  allPods: () => load().pods,
  podForTrucking: (tid: string) => load().pods.find((p) => p.truckingId === tid) || null,
  createPod: (p: Omit<Pod, 'id' | 'createdAt'>) => {
    const d = load();
    d.counter.pod += 1;
    const np: Pod = { ...p, id: uid('pod_'), createdAt: new Date().toISOString() };
    d.pods.push(np);
    // Update trucking
    const ti = d.trucking.findIndex((t) => t.id === p.truckingId);
    if (ti >= 0) {
      d.trucking[ti].status = 'completed';
      d.trucking[ti].completedDate = p.deliveredAt.slice(0, 10);
      d.trucking[ti].podId = np.id;
      d.trucking[ti].signedBy = p.receiverName;
      d.trucking[ti].signedAt = p.deliveredAt;
    }
    addActivity(d, 'pod', `POD signed by ${p.receiverName} for ${d.trucking[ti]?.reference || 'delivery'}`, d.trucking[ti]?.reference || '');
    save(d); return np;
  },

  // ----- Batch 7: Portal messages -----
  messagesForShipment: (sid: string) => load().portalMessages.filter(m => m.shipmentId === sid).sort((a,b) => a.createdAt.localeCompare(b.createdAt)),
  addPortalMessage: (m: Omit<PortalMessage, 'id'|'createdAt'|'read'>) => {
    const d = load();
    d.counter.pm += 1;
    const nm: PortalMessage = { ...m, id: uid('pm_'), createdAt: new Date().toISOString(), read: m.from === 'forwarder' };
    d.portalMessages.push(nm);
    save(d); return nm;
  },

  // ----- Batch 7: Yard management -----
  allYardSlots: () => load().yardSlots,
  allYardMoves: () => load().yardMoves.sort((a,b) => b.time.localeCompare(a.time)),
  recordYardMove: (m: Omit<YardMove, 'id'|'time'>) => {
    const d = load();
    d.counter.ym += 1;
    const nm: YardMove = { ...m, id: uid('ym_'), time: new Date().toISOString() };
    d.yardMoves.unshift(nm);
    // Also update yard slot if mounted/discharged
    if (m.type === 'gate_out') {
      const s = d.yardSlots.find(x => x.container === m.containerNumber);
      if (s) { s.container = undefined; s.dwellHours = 0; s.size = undefined; s.reefer = false; s.dg = false; }
    }
    if (m.type === 'discharged_from_vessel') {
      const empty = d.yardSlots.find(x => !x.container);
      if (empty) { empty.container = m.containerNumber; empty.size = '40'; empty.dwellHours = 0; }
    }
    save(d); return nm;
  },
  dwellStats: () => {
    const slots = load().yardSlots;
    const occupied = slots.filter(s => s.container).length;
    const longDwell = slots.filter(s => s.container && (s.dwellHours||0) > 72).length;
    return { total: slots.length, occupied, free: slots.length - occupied, longDwell };
  },

  // Batch 8: drag-and-drop yard shift between two slots
  moveYardSlot: (fromCode: string, toCode: string) => {
    const d = load();
    const si = d.yardSlots.findIndex(s => s.code === fromCode);
    const di = d.yardSlots.findIndex(s => s.code === toCode);
    if (si < 0 || di < 0) return null;
    const src = d.yardSlots[si], dst = d.yardSlots[di];
    if (!src.container || dst.container) return null;
    d.yardSlots[di] = { ...dst, container: src.container, size: src.size, reefer: src.reefer, dg: src.dg, dwellHours: src.dwellHours, zone: src.zone };
    d.yardSlots[si] = { code: src.code, zone: 'empty' };
    d.counter.ym += 1;
    d.yardMoves.unshift({
      id: uid('ym_'), containerNumber: src.container, type: 'yard_shift',
      location: `${fromCode} → ${toCode}`,
      terminal: 'Toamasina Intl Container Terminal',
      time: new Date().toISOString(), officer: 'Yard Planner',
    });
    toast({ title: `Container moved`, description: `${src.container} ${fromCode} → ${toCode}`, variant: 'success' });
    addActivity(d, 'warehouse', `Container ${src.container} shifted ${fromCode} → ${toCode}`, src.container, { silent: true });
    save(d);
    return d.yardSlots[di];
  },

  // ----- Batch 8: Document approvals -----
  allApprovals: () => load().docApprovals.sort((a,b) => b.requestedAt.localeCompare(a.requestedAt)),
  requestApproval: (a: Omit<DocApproval, 'id'|'status'>) => {
    const d = load(); d.counter.approval += 1;
    const na: DocApproval = { ...a, id: uid('ap_'), status: 'pending' };
    d.docApprovals.unshift(na);
    pushNotif(d, 'approval', `Approval requested: ${a.docName}`, a.category);
    save(d); return na;
  },
  decideApproval: (id: string, reviewerName: string, status: 'approved'|'rejected', comment?: string) => {
    const d = load();
    const ap = d.docApprovals.find(x => x.id === id);
    if (!ap) return null;
    const rev = ap.reviewers.find(r => r.name === reviewerName);
    if (rev) { rev.status = status; rev.decidedAt = new Date().toISOString(); rev.comment = comment; }
    else { ap.reviewers.push({ name: reviewerName, role: 'Ad-hoc', status, decidedAt: new Date().toISOString(), comment }); }
    const allDone = ap.reviewers.every(r => r.status === 'approved' || r.status === 'rejected');
    if (allDone) ap.status = ap.reviewers.some(r => r.status === 'rejected') ? 'rejected' : 'approved';
    pushNotif(d, 'approval',
      ap.status === 'approved' ? `Approved: ${ap.docName}` : ap.status === 'rejected' ? `Rejected: ${ap.docName}` : `Review from ${reviewerName} on ${ap.docName}`,
      comment, `/shipments/?rel=approval&id=${ap.id}`);
    save(d); return ap;
  },

  // ----- Batch 8: Notifications feed -----
  allNotifications: () => load().notifications,
  unreadNotifCount: () => load().notifications.filter(n => !n.read).length,
  markNotifRead: (id: string) => { const d = load(); const n = d.notifications.find(x => x.id === id); if (n) n.read = true; save(d); },
  markAllNotifRead: () => { const d = load(); d.notifications.forEach(n => n.read = true); save(d); },

  // ----- Batch 8: Quote -> Shipment conversion -----
  convertQuoteToShipment: (quoteId: string) => {
    const d = load();
    const q = d.quotes.find(x => x.id === quoteId);
    if (!q) return null;
    d.counter.shipment += 1;
    const ref = `FRT-2026-${String(d.counter.shipment).padStart(4,'0')}`;
    const ns: any = {
      id: uid('s_'), reference: ref, mode: q.mode, direction: q.direction,
      status: 'booked', customerName: q.customerName, customerEmail: q.customerEmail,
      origin: q.origin, destination: q.destination,
      portOfLoading: q.origin.split(',')[0].trim(), portOfDischarge: q.destination.split(',')[0].trim(),
      weight: q.weight, volume: q.volume, commodity: q.commodity,
      pieces: 1, incoterm: 'FOB', carrier: 'TBC', vesselOrFlight: 'TBD',
      mawbOrBl: 'TBD', etd: new Date(Date.now()+86400000*3).toISOString().slice(0,10),
      eta: q.mode === 'air' ? new Date(Date.now()+86400000*5).toISOString().slice(0,10) : new Date(Date.now()+86400000*32).toISOString().slice(0,10),
      customsStatus: 'pending', totalAmount: q.total, currency: 'USD',
      freightCost: q.freightRate, customsCost: q.customsFee, truckingCost: q.truckingFee,
      createdAt: new Date().toISOString(), co2e: estCo2(q.mode, q.weight, q.origin.split(',')[0].trim(), q.destination.split(',')[0].trim()),
    };
    d.shipments.unshift(ns);
    q.status = 'accepted' as any;
    addActivity(d, 'shipment', `Quote ${q.number} converted to shipment ${ref}`, ref);
    toast({ title: `Shipment ${ref} created`, description: `Converted from quote ${q.number}`, variant: 'success' });
    save(d); return ns;
  },

  // ----- Customer Portal v2 helpers (scoped to one customer) -----
  customerShipments: (cid: string) => load().shipments.filter(s => s.customerId === cid).sort((a,b) => b.createdAt.localeCompare(a.createdAt)),
  customerQuotes: (cid: string) => {
    const d = load();
    const cust = d.customers.find(c => c.id === cid);
    if (!cust) return [];
    return d.quotes.filter(q => q.customerId === cid || q.customerName === cust.name).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  },
  customerInvoices: (cid: string) => load().invoices.filter(i => i.customerId === cid).sort((a,b) => b.issueDate.localeCompare(a.issueDate)),
  customerDocs: (cid: string) => {
    const d = load();
    const shipIds = new Set(d.shipments.filter(s => s.customerId === cid).map(s => s.id));
    const invIds = new Set(d.invoices.filter(i => i.customerId === cid).map(i => i.id));
    const quotes = d.quotes.filter(q => {
      const cust = d.customers.find(c => c.id === cid);
      return cust && q.customerName === cust.name;
    });
    const qIds = new Set(quotes.map(q => q.id));
    return d.docs.filter(doc =>
      (doc.relatedType === 'shipment' && doc.relatedId && shipIds.has(doc.relatedId)) ||
      (doc.relatedType === 'invoice' && doc.relatedId && invIds.has(doc.relatedId)) ||
      (doc.relatedType === 'quote' && doc.relatedId && qIds.has(doc.relatedId))
    );
  },
  customerApprovals: (cid: string) => {
    const d = load();
    const shipIds = new Set(d.shipments.filter(s => s.customerId === cid).map(s => s.id));
    const invIds = new Set(d.invoices.filter(i => i.customerId === cid).map(i => i.id));
    return d.docApprovals.filter(a =>
      (a.relatedType === 'shipment' && a.relatedId && shipIds.has(a.relatedId)) ||
      (a.relatedType === 'invoice' && a.relatedId && invIds.has(a.relatedId)) ||
      (a.relatedType === 'customer' && a.relatedId === cid)
    ).sort((a,b) => b.requestedAt.localeCompare(a.requestedAt));
  },
  customerStatement: (cid: string) => {
    const d = load();
    const lines: { date: string; ref: string; type: 'invoice'|'payment'|'credit'|'debit'; description: string; debit: number; credit: number; balance: number; status?: string }[] = [];
    const invs = d.invoices.filter(i => i.customerId === cid).sort((a,b) => a.issueDate.localeCompare(b.issueDate));
    const je = d.journal.filter(j => j.customerId === cid).sort((a,b) => a.date.localeCompare(b.date));
    let running = 0;
    invs.forEach(i => {
      running += i.total;
      lines.push({ date: i.issueDate, ref: i.number, type: 'invoice', description: `Invoice ${i.number}`, debit: i.total, credit: 0, balance: running, status: i.status });
      if (i.status === 'paid' && i.paidDate) {
        running -= i.total;
        lines.push({ date: i.paidDate, ref: i.number + '-PAY', type: 'payment', description: `Payment received — ${i.number}`, debit: 0, credit: i.total, balance: running, status: 'paid' });
      }
    });
    je.filter(j => j.type === 'credit_note').forEach(j => {
      running -= j.amount;
      lines.push({ date: j.date, ref: j.reference, type: 'credit', description: j.description, debit: 0, credit: j.amount, balance: running });
    });
    return lines.sort((a,b) => a.date.localeCompare(b.date));
  },
  customerMessages: (cid: string) => {
    const d = load();
    const shipIds = new Set(d.shipments.filter(s => s.customerId === cid).map(s => s.id));
    return d.portalMessages.filter(m => shipIds.has(m.shipmentId)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  },
  customerTotalBalance: (cid: string) => {
    const d = load();
    return d.invoices.filter(i => i.customerId === cid && i.status !== 'paid' && i.status !== 'draft').reduce((s,i) => s+i.total, 0);
  },
  customerOverdue: (cid: string) => {
    const d = load();
    const today = new Date().toISOString().slice(0,10);
    return d.invoices.filter(i => i.customerId === cid && i.status !== 'paid' && i.dueDate < today).reduce((s,i) => s+i.total, 0);
  },
  // Customer actions from portal
  customerAcceptQuote: (quoteId: string) => {
    const d = load();
    const q = d.quotes.find(x => x.id === quoteId);
    if (!q) return null;
    q.status = 'accepted';
    addActivity(d, 'quote', `Quote ${q.number} ACCEPTED by customer via portal`, q.number);
    pushNotif(d, 'quote', `🎉 ${q.customerName} accepted quote ${q.number}`, `${q.origin} → ${q.destination} · ${q.total.toLocaleString()} ${q.currency || 'USD'}`, `/quotes/?id=${q.id}`, q.id);
    save(d);
    // Auto-reply forwarder message
    d.counter.pm += 1;
    const replyMsg: PortalMessage = { id: uid('pm_'), shipmentId: '__portal__' + q.id, from: 'forwarder', authorName: 'FreightFlow Sales', body: `Thank you for accepting quote ${q.number}! Your account manager ${q.customerEmail?.includes('pharma')?'Andry R.':'Hery Lalao'} will contact you within 2 hours during business hours to confirm booking details and issue the proforma invoice.`, createdAt: new Date().toISOString(), read: true };
    d.portalMessages.push(replyMsg);
    save(d);
    return q;
  },
  customerRejectQuote: (quoteId: string, reason?: string) => {
    const d = load();
    const q = d.quotes.find(x => x.id === quoteId);
    if (!q) return null;
    q.status = 'rejected';
    addActivity(d, 'quote', `Quote ${q.number} rejected by customer: ${reason || 'no reason given'}`, q.number);
    pushNotif(d, 'quote', `❌ Quote ${q.number} declined by ${q.customerName}`, reason || 'No reason provided', `/quotes/?id=${q.id}`, q.id);
    save(d);
    return q;
  },
  customerAddMessage: (customerId: string, body: string, shipmentId?: string) => {
    const d = load();
    const cust = d.customers.find(c => c.id === customerId);
    if (!cust) return null;
    d.counter.pm += 1;
    const sid = shipmentId || (d.shipments.find(s => s.customerId === customerId)?.id || '__general__');
    const nm: PortalMessage = { id: uid('pm_'), shipmentId: sid, from: 'customer', authorName: cust.contactPerson || cust.name, body: body.trim(), createdAt: new Date().toISOString(), read: false };
    d.portalMessages.push(nm);
    pushNotif(d, 'email', `💬 New message from ${cust.name}`, body.trim().slice(0,120), `/customers/?id=${customerId}`);
    save(d);
    return nm;
  },
  customerDecideApproval: (approvalId: string, decision: 'approved'|'rejected', comment?: string) => {
    const d = load();
    const ap = d.docApprovals.find(x => x.id === approvalId);
    if (!ap) return null;
    // Add a "Customer" reviewer decision
    const existing = ap.reviewers.find(r => r.role === 'Customer');
    if (existing) {
      existing.status = decision; existing.decidedAt = new Date().toISOString(); existing.comment = comment;
    } else {
      ap.reviewers.push({ name: 'Customer', role: 'Customer', status: decision, decidedAt: new Date().toISOString(), comment });
    }
    const allDone = ap.reviewers.every(r => r.status === 'approved' || r.status === 'rejected');
    if (allDone) ap.status = ap.reviewers.some(r => r.status === 'rejected') ? 'rejected' : 'approved';
    pushNotif(d, 'approval',
      decision === 'approved' ? `✅ Customer approved: ${ap.docName}` : `❌ Customer rejected: ${ap.docName}`,
      comment, `/approvals/`, ap.id);
    addActivity(d, 'customs', `Customer ${decision} document "${ap.docName}"${comment ? ': ' + comment : ''}`, ap.docName);
    save(d);
    return ap;
  },
  customerRequestQuote: (customerId: string, req: { mode: 'air'|'sea'|'road'; direction: 'import'|'export'; origin: string; destination: string; weight: number; volume: number; pieces: number; commodity: string; incoterm?: string; readyDate?: string; notes?: string; }) => {
    const d = load();
    const cust = d.customers.find(c => c.id === customerId);
    if (!cust) return null;
    d.counter.qr += 1;
    const qr: QuoteRequest = {
      id: uid('qr_'), token: qrToken(),
      customerName: cust.name, customerEmail: cust.email, customerPhone: cust.phone, company: cust.name,
      ...req,
      status: 'new', createdAt: new Date().toISOString(),
    };
    d.quoteRequests.unshift(qr);
    addActivity(d, 'quote', `New quote request from ${cust.name} via portal: ${req.origin} → ${req.destination} (${req.commodity})`, 'Portal Request');
    pushNotif(d, 'quote', `📨 New quote request from ${cust.name}`, `${req.origin} → ${req.destination} · ${req.commodity}`, `/quotes/`);
    save(d);
    return qr;
  },

  // ----- Batch 8+: OOBO Madagascar e-invoice with real RSA-SHA256 signing -----
  submitOobo: async (invoiceId: string) => {
    const d = load();
    const inv = d.invoices.find(x => x.id === invoiceId);
    if (!inv) return null;
    const htva = Math.round(inv.subtotal);
    const tvaRate = 0.20;
    const tva = inv.tax || Math.round(htva * tvaRate);
    const ttc = htva + tva;
    const co = getActiveCompany();
    const br = getActiveBranch();
    const nifEmitter = br?.nif || co?.nif || '2001234567';
    const statEmitter = br?.stat || co?.stat || '85240/11101/000123';
    const result = await signFiscalInvoice({
      invoiceNumber: inv.number,
      issueDate: inv.issueDate,
      nifEmitter,
      nifClient: inv.einvoice?.nifClient || '',
      invoiceType: inv.einvoice?.invoiceType || 'standard',
      htva, tvaRate, tva, ttc,
    });
    inv.einvoice = {
      invoiceType: inv.einvoice?.invoiceType || 'standard',
      nifEmitter,
      statEmitter,
      nifClient: inv.einvoice?.nifClient || '',
      statClient: inv.einvoice?.statClient || '',
      ooboStatus: 'validated',
      ooboUid: result.ooboUid,
      ooboSubmittedAt: result.signedAt,
      ooboQrCode: result.qrDataUrl,
      ooboSignature: result.signature,
      ooboPayload: result.qrPayload,
      htva, tvaRate, tva, ttc,
      paymentMethod: inv.einvoice?.paymentMethod || 'bank_transfer',
    };
    inv.tax = tva; inv.total = ttc;
    addActivity(d, 'invoice', `E-invoice (OOBO) digitally signed for ${inv.number} — UID ${result.ooboUid}`, inv.number);
    save(d);
    window.dispatchEvent(new CustomEvent('ff:data-changed'));
    return inv;
  },
};

function qrToken() { return 'qr_' + Math.random().toString(36).slice(2, 10); }

/**
 * Deterministic per-customer portal token (demo-only).
 * In production, use signed JWTs or per-customer random UUIDs stored server-side.
 */
export function customerPortalToken(customerId: string): string {
  // FNV-1a style simple hash over id + salt, base36
  const salt = 'FreightFlow::Portal::v2::MG';
  const str = salt + '::' + customerId;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'cp_' + h.toString(36) + '_' + customerId.slice(-4);
}

/** Verify a customer portal token (constant-time-ish string compare for demo). */
export function verifyCustomerToken(customerId: string, token: string): boolean {
  if (!customerId || !token) return false;
  const expected = customerPortalToken(customerId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** Build a full customer portal URL for external sharing. */
export function customerPortalUrl(customerId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined'
    ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || '')
    : 'https://freightflow.mg');
  return `${base}/portal/?c=${encodeURIComponent(customerId)}&t=${customerPortalToken(customerId)}`;
}

function unitCost(r: RateCard, weightKg: number, volCbm: number): number {
  switch (r.unit) {
    case 'kg': return r.sellRate * Math.max(weightKg, 1);
    case 'cbm': return r.sellRate * Math.max(volCbm, 1);
    case 'container_20': return r.sellRate * Math.ceil(volCbm / 33);
    case 'container_40': return r.sellRate * Math.ceil(volCbm / 67);
    case 'container_40hc': return r.sellRate * Math.ceil(volCbm / 76);
    case 'truck': return r.sellRate;
    case 'shipment': return r.sellRate;
    default: return r.sellRate;
  }
}
