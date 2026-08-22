export type ShipmentMode = 'air' | 'sea';
export type ShipmentDirection = 'import' | 'export';
export type ShipmentStatus =
  | 'quoted'
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'customs'
  | 'delivered'
  | 'cancelled';

export type CustomsStatus =
  | 'pending'
  | 'docs_received'
  | 'declared'
  | 'inspection'
  | 'duties_paid'
  | 'cleared'
  | 'rejected';

export type TruckingStatus =
  | 'scheduled'
  | 'dispatched'
  | 'en_route'
  | 'loaded'
  | 'unloaded'
  | 'completed';

export type UserRole = 'admin' | 'operations' | 'sales' | 'customs' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  initials: string;
}

// -------- Dangerous Goods (DGR) --------
export type DGRClass =
  | '1' | '1.1' | '1.2' | '1.3' | '1.4'
  | '2.1' | '2.2' | '2.3'
  | '3' | '4.1' | '4.2' | '4.3'
  | '5.1' | '5.2' | '6.1' | '6.2'
  | '7' | '8' | '9';

export interface DGEntry {
  id: string;
  shipmentId: string;
  unNumber: string;          // e.g. "UN3480"
  properShippingName: string; // PSN
  dgClass: DGRClass;
  packingGroup?: 'I' | 'II' | 'III';
  packagingInstructions?: string; // e.g. "PI965" for air
  netWeightKg: number;
  grossWeightKg: number;
  packages: number;
  flashpoint?: string;
  marinePollutant?: boolean;
  limitedQuantity?: boolean;
  sdsAttached?: boolean;     // safety data sheet
  declarationAttached?: boolean; // DGD
  approved?: boolean;
  approver?: string;
}

// -------- Documents --------
export type DocCategory =
  | 'commercial_invoice' | 'packing_list' | 'bill_of_lading' | 'airway_bill'
  | 'certificate_origin' | 'phytosanitary' | 'fumigation' | 'insurance'
  | 'customs_declaration' | 'import_permit' | 'export_declaration' | 'dgd'
  | 'sds' | 'pod' | 'invoice_attachment' | 'quote_attachment' | 'other';

export interface DocFile {
  id: string;
  name: string;
  category: DocCategory;
  sizeBytes: number;
  mimeType: string;
  // In production this would be S3/GCS URL; here we store a data URI for small files or synthetic placeholder
  dataUrl?: string;
  relatedType: 'shipment' | 'invoice' | 'quote' | 'trucking';
  relatedId: string;
  uploadedBy: string;
  uploadedAt: string;
  tags?: string[];
  version?: number;
}

// -------- Rate Cards --------
export type RateMode = 'air' | 'sea' | 'road';
export type RateUnit = 'kg' | 'cbm' | 'container_20' | 'container_40' | 'container_40hc' | 'shipment' | 'truck';

export interface RateCard {
  id: string;
  carrier: string;
  mode: RateMode;
  direction: 'import' | 'export' | 'both';
  origin: string;           // free text port/city
  destination: string;
  commodity?: string;
  validFrom: string;
  validUntil: string;
  buyRate: number;          // cost to us
  sellRate: number;         // charged to customer
  currency: string;
  unit: RateUnit;
  minCharge?: number;
  notes?: string;
  transitDaysMin?: number;
  transitDaysMax?: number;
  frequency?: string;       // weekly, etc
  active: boolean;
  createdAt: string;
}

// -------- Customer Quote Requests (public portal) --------
export interface QuoteRequest {
  id: string;
  token: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  mode: 'air' | 'sea' | 'road';
  direction: 'import' | 'export';
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  pieces: number;
  commodity: string;
  incoterm?: string;
  readyDate?: string;
  notes?: string;
  status: 'new' | 'quoted' | 'won' | 'lost';
  quotedPrice?: number;
  quotedId?: string;         // quote id once converted
  assignedTo?: string;
  createdAt: string;
}

// -------- GPS Tracking Pings (trucking) --------
export interface GpsPing {
  id: string;
  truckingId: string;
  lat: number;
  lng: number;
  speedKmh?: number;
  heading?: number;
  timestamp: string;
  locationLabel?: string;
}

// -------- Customs Declarations (ASYCUDA/SAD) --------
export type CustomsDecType = 'IM4' | 'EX1' | 'IM7' | 'EX2' | 'TR';
export type CustomsDecStatus = 'draft' | 'submitted' | 'accepted' | 'inspection' | 'assessed' | 'duties_paid' | 'released' | 'rejected' | 'amended';

export interface CustomsDeclaration {
  id: string;
  number: string;                // e.g. SAD-MG-2026-0001234
  shipmentId: string;
  type: CustomsDecType;
  status: CustomsDecStatus;
  declarantName: string;
  declarantCode: string;        // customs broker license
  importerExporter: string;
  incoterm: string;
  currency: string;
  cifValue: number;
  freightValue: number;
  insuranceValue: number;
  totalDuties: number;
  totalVAT: number;
  totalOtherTaxes: number;
  hsItems: { hsCode: string; description: string; netWeight: number; grossWeight: number; quantity: number; value: number; dutyRate: number; vatRate: number; dutyAmount: number; vatAmount: number; }[];
  officeOfEntry: string;
  officeOfExit?: string;
  transportMode: 'air' | 'sea' | 'road';
  conveyanceRef: string;        // vessel/flight
  packages: number;
  grossWeight: number;
  countryOfOrigin: string;
  countryOfExport: string;
  countryOfDestination: string;
  submittedAt?: string;
  acceptedAt?: string;
  releasedAt?: string;
  mrns?: string;                // MRN
  assessmentNumber?: string;
  notes?: string;
  createdAt: string;
  events: { at: string; stage: CustomsDecStatus | string; message: string; officer?: string }[];
}

// -------- GL / Accounting Journal --------
export type JournalEntryType =
  | 'invoice_receivable'
  | 'invoice_paid'
  | 'freight_cost'
  | 'customs_duty'
  | 'trucking_cost'
  | 'quote_accepted'
  | 'credit_note'
  | 'bank_deposit'
  | 'other';

export interface JournalEntry {
  id: string;
  date: string;
  type: JournalEntryType;
  reference: string;           // invoice #, shipment ref
  description: string;
  customerId?: string;
  shipmentId?: string;
  // Simple two-line bookkeeping: debit/credit in a single currency (USD for simplicity)
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  fxRate?: number;
  createdBy: string;
  createdAt: string;
  reconciled?: boolean;
}

// -------- Customer Communication / Timeline --------
export interface CustomerNote {
  id: string;
  customerId: string;
  type: 'note' | 'call' | 'meeting' | 'email' | 'document' | 'complaint';
  title: string;
  body?: string;
  author: string;
  createdAt: string;
  relatedRef?: string;
}

export interface ContainerPackage {
  id: string;
  shipmentId: string;
  containerNumber?: string; // e.g. MSKU1234567
  sealNumber?: string;
  containerType?: '20GP' | '40GP' | '40HC' | '45HC' | 'REEFER_20' | 'REEFER_40' | 'LCL' | 'ULD_AKE' | 'ULD_PMC' | 'BULK';
  tareWeight?: number; // kg
  grossWeight?: number; // kg
  packages?: number;
  description?: string;
  temperature?: number; // °C for reefers
  humidity?: number; // % for reefers
  dangerous?: boolean;
  unNumber?: string;
  volume?: number; // CBM
}

export interface CarrierBooking {
  id: string;
  shipmentId: string;
  carrier: string;
  mode: ShipmentMode;
  bookingReference: string;    // carrier's own ref e.g. MAEUBN2012345
  status: 'draft' | 'requested' | 'confirmed' | 'rejected' | 'amended';
  requestedAt: string;
  confirmedAt?: string;
  sob?: string;                // SI cutoff
  vgmCutoff?: string;
  cyCutoff?: string;
  docsCutoff?: string;
  vgm?: number;
  allocatedSpace?: string;     // e.g. "1 x 40HC"
  equipmentReadyAt?: string;
  terminal?: string;
  notes?: string;
  events: { at: string; stage: string; message: string }[];
  // eBL
  eblIssued?: boolean;
  eblUrl?: string;
  eblIssueDate?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  cc?: string;
  subject: string;
  template: 'quote' | 'invoice' | 'booking_conf' | 'tracking_update' | 'customs_update' | 'pod' | 'custom';
  relatedType?: 'shipment' | 'invoice' | 'quote' | 'booking';
  relatedId?: string;
  relatedRef?: string;
  body: string;
  sentAt: string;
  openedAt?: string;
  clickedAt?: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  createdAt: string;
  creditLimit?: number;
  paymentTerms?: number;      // days
  accountManager?: string;
  tags?: string[];
  lifetimeValue?: number;
}

export interface Shipment {
  id: string;
  reference: string;
  mode: ShipmentMode;
  direction: ShipmentDirection;
  status: ShipmentStatus;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  origin: string;
  destination: string;
  portOfLoading: string;
  portOfDischarge: string;
  weight: number;                 // gross weight kg
  volume: number;                 // CBM
  pieces: number;
  chargeableWeight?: number;      // kg (IATA max(gross, volumetric) for air; W/M for LCL)
  dimLengthCm?: number;
  dimWidthCm?: number;
  dimHeightCm?: number;
  commodity: string;
  hsCode?: string;
  hsDescription?: string;
  dutyRate?: number;
  dutyEstimate?: number;
  incoterm: string;
  carrier: string;
  vesselOrFlight: string;
  mawbOrBl: string;
  etd: string;
  eta: string;
  atd?: string;
  ata?: string;
  customsStatus?: CustomsStatus;
  duties?: number;
  truckingDispatched?: boolean;
  notes?: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  freightCost?: number;
  customsCost?: number;
  truckingCost?: number;
  otherCost?: number;
  co2e?: number;
  docsChecked?: Record<string, boolean>;
  bookingRequested?: boolean;
  bookingConfirmed?: boolean;
  // Batch 6 additions
  doorPickupAddress?: string;
  doorDeliveryAddress?: string;
  masterRef?: string;            // master AWB/BL for consols
}

export interface TruckingDispatch {
  id: string;
  reference: string;
  shipmentId?: string;
  shipmentRef?: string;
  customerName: string;
  driverName: string;
  driverPhone: string;
  driverUserId?: string;         // for driver app
  vehiclePlate: string;
  vehicleType: string;
  pickupLocation: string;
  deliveryLocation: string;
  status: TruckingStatus;
  scheduledDate: string;
  completedDate?: string;
  weight: number;
  notes?: string;
  cost: number;
  assignedDriverId?: string;
  // Batch 6 additions
  podId?: string;                // linked proof-of-delivery
  signedBy?: string;
  signedAt?: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  shipmentId?: string;
  items: { description: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  currency: string;
  sentAt?: string;
  openedAt?: string;
  einvoice?: EInvoiceMeta; // Batch 8 — Madagascar OOBO e-invoice
}

export interface Quote {
  id: string;
  number: string;
  customerName: string;
  customerEmail?: string;
  mode: ShipmentMode;
  direction: ShipmentDirection;
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  commodity: string;
  status: 'pending' | 'accepted' | 'rejected' | 'converted';
  freightRate: number;
  customsFee: number;
  truckingFee: number;
  total: number;
  validUntil: string;
  createdAt: string;
  sentAt?: string;
  openedAt?: string;
}

export interface Activity {
  id: string;
  type: 'shipment' | 'customs' | 'trucking' | 'invoice' | 'quote' | 'booking' | 'email' | 'warehouse' | 'pod';
  message: string;
  reference: string;
  timestamp: string;
}

// -------- Warehouse / WMS (Batch 6) --------
export type WhsStatus = 'expected' | 'arrived' | 'unloaded' | 'received' | 'putaway' | 'picked' | 'stuffed' | 'stripped' | 'released' | 'loaded_out';
export type WarehouseZone = 'CFS_EXPORT' | 'CFS_IMPORT' | 'REEFER' | 'DG_LOCKER' | 'YARD' | 'BAY_A' | 'BAY_B' | 'BAY_C' | 'QC' | 'DOOR';

export interface WarehouseReceipt {
  id: string;
  number: string;                 // WHR-2026-0001
  shipmentId?: string;
  type: 'inbound' | 'outbound' | 'cfs_stuff' | 'cfs_strip';
  status: WhsStatus;
  customerName: string;
  supplier?: string;
  location: string;               // e.g. "Bay B, Position 14"
  zone: WarehouseZone;
  pieces: number;
  weightKg: number;
  volumeCbm: number;
  marksAndNumbers?: string;
  containerNumber?: string;
  sealNumber?: string;
  commodity: string;
  dangerous?: boolean;
  temperature?: number;
  etaDate?: string;               // expected arrival
  arrivedAt?: string;
  unloadedAt?: string;
  receivedAt?: string;
  releasedAt?: string;
  notes?: string;
  createdAt: string;
  events: { at: string; stage: WhsStatus | string; message: string; officer?: string }[];
}

export interface CargoItem {
  id: string;
  receiptId: string;
  pieceLabel: string;             // e.g. "CTN-001"
  description: string;
  weightKg: number;
  dimsCm?: string;                // LxWxH
  hsCode?: string;
  location?: string;              // current slot
  picked?: boolean;
  loaded?: boolean;
}

// -------- Shipment Legs (Batch 6 — multi-leg door-to-door) --------
export type LegMode = 'pickup' | 'trucking' | 'sea' | 'air' | 'rail' | 'barge' | 'delivery';
export type LegStatus = 'planned' | 'booked' | 'in_transit' | 'completed' | 'delayed';

export interface ShipmentLeg {
  id: string;
  shipmentId: string;
  seq: number;                    // 1, 2, 3...
  mode: LegMode;
  carrier: string;
  voyageRef?: string;             // vessel/flight/truck ref
  fromLocation: string;
  toLocation: string;
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  status: LegStatus;
  distanceKm?: number;
  cost?: number;
  notes?: string;
}

// -------- Inbound Emails (Batch 6 — two-way inbox) --------
export interface InboundEmail {
  id: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  bodyPreview: string;
  bodyHtml?: string;
  receivedAt: string;
  read: boolean;
  folder: 'inbox' | 'sent' | 'carrier' | 'customs' | 'customer' | 'spam' | 'archived';
  relatedType?: 'shipment' | 'invoice' | 'quote' | 'booking' | 'trucking';
  relatedId?: string;
  relatedRef?: string;
  classification?: 'booking_conf' | 'tracking' | 'customs' | 'inquiry' | 'complaint' | 'other' | 'pod';
  attachments?: { name: string; size: number }[];
}

// -------- POD (Proof of Delivery) (Batch 6) --------
export interface Pod {
  id: string;
  truckingId: string;
  shipmentId?: string;
  receiverName: string;
  receiverSignature?: string;     // data URL
  podPhotoDataUrl?: string;       // photo data URL (real camera capture in B9.4+)
  podPhotoLat?: number;           // geotag
  podPhotoLng?: number;
  podPhotoCaption?: string;
  photos?: PodPhoto[];            // multiple photos (B9.4+)
  comments?: string;
  deliveredAt: string;
  condition: 'good' | 'damaged' | 'short' | 'over';
  piecesSigned: number;
  createdAt: string;
}

// -------- Batch 7: Portal messages (customer chat) --------
export interface PortalMessage {
  id: string;
  shipmentId: string;
  from: 'customer' | 'forwarder';
  authorName: string;
  body: string;
  createdAt: string;
  read?: boolean;
}

// -------- Batch 7: Yard moves --------
export type YardMoveType = 'gate_in' | 'gate_out' | 'yard_shift' | 'mounted_to_truck' | 'discharged_from_vessel' | 'loaded_to_vessel';
export interface YardMove {
  id: string;
  containerNumber: string;
  type: YardMoveType;
  location: string;         // slot
  terminal: string;
  time: string;
  truckPlate?: string;
  vesselRef?: string;
  sealed?: boolean;
  officer?: string;
  note?: string;
}
export interface YardSlot {
  code: string;          // e.g. "A-12"
  zone: 'import_full' | 'export_full' | 'empty' | 'reefer' | 'dg' | 'awaiting_inspection';
  container?: string;
  size?: '20' | '40' | '45';
  reefer?: boolean;
  dg?: boolean;
  dwellHours?: number;
}

// ===== Batch 8 types =====
export type DocApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export interface DocApproval {
  id: string;
  docId?: string;        // optional link to DocFile
  docName: string;
  relatedType?: 'shipment' | 'invoice' | 'customs' | 'customer';
  relatedId?: string;
  requestedBy: string;
  requestedAt: string;
  reviewers: { name: string; role: string; status: DocApprovalStatus; decidedAt?: string; comment?: string }[];
  status: DocApprovalStatus;
  category: string;       // e.g. "BL Release", "License", "Certificate", "Commercial Invoice"
  expiryDate?: string;    // for permits/licenses
  alert30d?: boolean;
  alert7d?: boolean;
}

export type NotifKind =
  | 'shipment' | 'customs' | 'trucking' | 'pod' | 'warehouse' | 'yard'
  | 'invoice' | 'quote' | 'email' | 'doc' | 'approval' | 'ai' | 'system';
export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  href?: string;         // deep link
  relatedId?: string;
  at: string;            // ISO timestamp
  read: boolean;
}

// Extend Invoice with Madagascar e-invoicing (OOBO / DGI NIF/STAT fields)
export interface EInvoiceMeta {
  invoiceType: 'standard' | 'debit_note' | 'credit_note';
  nifEmitter: string;    // NIF du prestataire (FreightFlow)
  statEmitter: string;   // STAT
  nifClient?: string;
  statClient?: string;
  ooboStatus: 'draft' | 'submitted' | 'validated' | 'rejected';
  ooboUid?: string;      // identifiant unique OOBO
  ooboSubmittedAt?: string;
  ooboQrCode?: string;        // SVG/PNG data URL for QR
  ooboSignature?: string;     // RSA-SHA256 base64url signature
  ooboPayload?: string;       // raw QR pipe-delimited payload
  htva: number;          // Hors TVA (Ariary)
  tvaRate: number;       // 20% standard MG
  tva: number;           // TVA
  ttc: number;           // TTC
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'card';
}

// ===== Beta 9.4 — Multi-company / multi-branch + camera POD photos + navigation =====

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  phone?: string;
  iataCode?: string;
  fiataMemberId?: string;
  nif?: string;       // Madagascar NIF
  stat?: string;      // Madagascar STAT
}

export interface Company {
  id: string;
  legalName: string;
  shortName: string;
  logoColor?: string;
  nif?: string;
  stat?: string;
  iataCode?: string;
  fiataMemberId?: string;
  branches: Branch[];
}

export interface PodPhoto {
  id: string;
  podId?: string;          // attached to a POD (driver app)
  truckingId?: string;
  shipmentId?: string;
  dataUrl: string;         // base64 (for localStorage demo)
  caption?: string;
  takenAt: string;
  takenBy?: string;
  lat?: number;
  lng?: number;
}
