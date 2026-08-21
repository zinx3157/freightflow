// Lightweight CSV exporter for Batch 8 reports
// Escapes values per RFC 4180 and triggers a browser download.

export function downloadCsv(filename: string, rows: (string|number|Date|null|undefined)[][]) {
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
  // BOM so Excel auto-detects UTF-8 (for Malagasy/French accents)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Prebuilt report extractors
export function shipmentsReport(shipments: any[]) {
  const header = ['Reference','Mode','Direction','Status','Customer','Origin','Destination','POL','POD','Carrier','Vessel/Flight','MAWB/BL','Incoterm','Weight (kg)','Volume (m3)','Pieces','Commodity','HS Code','Currency','Total','Freight','Customs','Trucking','ETD','ETA','ATD','CO2e (kg)','Customs Status','Created'];
  const rows = shipments.map(s => [
    s.reference, s.mode, s.direction, s.status, s.customerName, s.origin, s.destination,
    s.portOfLoading, s.portOfDischarge, s.carrier, s.vesselOrFlight, s.mawbOrBl, s.incoterm,
    s.weight, s.volume, s.pieces, s.commodity, s.hsCode, s.currency,
    s.totalAmount, s.freightCost, s.customsCost, s.truckingCost,
    s.etd, s.eta, s.atd, s.co2e, s.customsStatus, s.createdAt,
  ]);
  return [header, ...rows];
}

export function invoicesReport(invoices: any[]) {
  const header = ['Number','Customer','Shipment Ref','Currency','Subtotal','Tax','Total','Status','Issue Date','Due Date','Paid Date','OOBO UID','OOBO Status'];
  const rows = invoices.map(i => [
    i.number, i.customerName, i.shipmentRef, i.currency,
    i.subtotal, i.tax, i.total, i.status, i.issueDate, i.dueDate, i.paidDate,
    i.einvoice?.ooboUid || '', i.einvoice?.ooboStatus || '',
  ]);
  return [header, ...rows];
}

export function quotesReport(quotes: any[]) {
  const header = ['Number','Customer','Email','Mode','Direction','Origin','Destination','Weight','Volume','Commodity','Freight','Customs','Trucking','Total','Status','Valid Until','Created'];
  const rows = quotes.map(q => [
    q.number, q.customerName, q.customerEmail, q.mode, q.direction, q.origin, q.destination,
    q.weight, q.volume, q.commodity, q.freightRate, q.customsFee, q.truckingFee, q.total,
    q.status, q.validUntil, q.createdAt,
  ]);
  return [header, ...rows];
}

export function yardReport(slots: any[], moves: any[]) {
  const header = ['Code','Zone','Container','Size','Reefer','DG','Dwell Hours'];
  const rows = slots.map(s => [s.code, s.zone, s.container || '', s.size || '', s.reefer ? 'Y':'', s.dg ? 'Y':'', s.dwellHours || 0]);
  // Append a separator + moves
  return [header, ...rows, [], ['--- RECENT YARD MOVES ---'], ['Time','Container','Type','Location','Truck','Vessel','Officer','Sealed'],
    ...moves.slice(0, 200).map(m => [m.time, m.containerNumber, m.type, m.location, m.truckPlate||'', m.vesselRef||'', m.officer||'', m.sealed?'Y':'N']),
  ];
}
