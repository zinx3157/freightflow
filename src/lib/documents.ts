'use client';

import jsPDF from 'jspdf';
import type { Shipment, Invoice, Quote } from './types';

// ============================================================
// FreightFlow professional document generators.
// - Air Waybill (AWB) — IATA-style layout
// - Bill of Lading (B/L) — traditional maritime B/L format
// - Commercial Invoice
// - Freight Quotation
// ============================================================

const BRAND = [15, 76, 129] as [number, number, number];       // #0f4c81
const BRAND_DARK = [10, 55, 95] as [number, number, number];
const INK = [20, 28, 42] as [number, number, number];
const MUTED = [100, 110, 125] as [number, number, number];
const GRID = [210, 215, 225] as [number, number, number];
const BG_SOFT = [246, 248, 252] as [number, number, number];
const PAGE_W = 210;
const MARGIN_L = 12;
const MARGIN_R = 12;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

type Ctx = {
  doc: jsPDF;
  y: number;
};

// ---------- helpers ----------
function text(doc: jsPDF, str: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: [number, number, number]; italic?: boolean; align?: 'left' | 'right' | 'center'; maxWidth?: number } = {}) {
  const { size = 9, bold = false, italic = false, color = INK, align = 'left', maxWidth } = opts;
  doc.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal');
  if (italic) doc.setFont('helvetica', 'italic');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const s = str ?? '';
  if (maxWidth) {
    const lines = doc.splitTextToSize(s, maxWidth);
    doc.text(lines, x, y, { align, baseline: 'top' });
    return y + lines.length * (size * 0.42) + 1;
  }
  doc.text(s, x, y, { align, baseline: 'top' });
  return y + size * 0.42 + 1;
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, color = GRID, width = 0.3) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

function rect(doc: jsPDF, x: number, y: number, w: number, h: number, fill?: boolean | [number, number, number], stroke: [number, number, number] = GRID) {
  doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
  doc.setLineWidth(0.3);
  if (fill) {
    const fc: [number, number, number] = Array.isArray(fill) ? fill : BG_SOFT;
    doc.setFillColor(fc[0], fc[1], fc[2]);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

function box(doc: jsPDF, x: number, y: number, w: number, label: string, value: string | number | undefined | null, opts: { labelSize?: number; valueSize?: number; h?: number; bold?: boolean } = {}) {
  const h = opts.h ?? 14;
  rect(doc, x, y, w, h);
  const labelSize = opts.labelSize ?? 7;
  const valSize = opts.valueSize ?? 9;
  doc.setFont('helvetica', 'bold').setFontSize(labelSize).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(label.toUpperCase(), x + 2, y + 3.5, { baseline: 'top' });
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(valSize).setTextColor(INK[0], INK[1], INK[2]);
  const v = value === undefined || value === null || value === '' ? '—' : String(value);
  const lines = doc.splitTextToSize(v, w - 4);
  doc.text(lines, x + 2, y + 7, { baseline: 'top' });
  return y + h;
}

function header(doc: jsPDF, documentTitle: string, refLabel: string, refValue: string, sub?: string) {
  // brand bar
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, PAGE_W, 18, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(255, 255, 255);
  doc.text('FREIGHTFLOW', MARGIN_L, 6, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8);
  doc.text('Logistics OS  ·  Antananarivo, Madagascar  ·  ops@freightflow.mg', MARGIN_L, 12, { baseline: 'top' });

  // document title block
  let y = 22;
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
  doc.text(documentTitle, MARGIN_L, y, { baseline: 'top' });
  y += 9;
  if (sub) {
    doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(sub, MARGIN_L, y, { baseline: 'top' });
    y += 5;
  }

  // Reference box on right
  const refW = 70;
  const refX = PAGE_W - MARGIN_R - refW;
  rect(doc, refX, 22, refW, 16, BG_SOFT, BRAND);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(refLabel.toUpperCase(), refX + 3, 24, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
  doc.text(String(refValue), refX + 3, 29, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, refX + 3, 35, { baseline: 'top' });

  return Math.max(y + 4, 40);
}

function footer(doc: jsPDF, pageNum: number, total: number) {
  const fy = 290;
  line(doc, MARGIN_L, fy - 2, PAGE_W - MARGIN_R, fy - 2);
  doc.setFont('helvetica', 'italic').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('Document generated by FreightFlow Logistics OS — computer-generated, no signature required.', MARGIN_L, fy, { baseline: 'top' });
  doc.text(`Page ${pageNum} / ${total}`, PAGE_W - MARGIN_R, fy, { align: 'right', baseline: 'top' });
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n: number, cur = 'USD') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n); } catch { return `${cur} ${n.toFixed(2)}`; }
}
function fmtNum(n: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: n % 1 ? digits : 0, maximumFractionDigits: digits }).format(n);
}

// ============================================================
// AIR WAYBILL (IATA-style)
// ============================================================
export function generateShipmentBL(s: Shipment): Blob {
  const isAir = s.mode === 'air';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ---- HEADER ----
  let y = header(doc, isAir ? 'AIR WAYBILL' : 'BILL OF LADING',
    isAir ? 'MAWB Number' : 'B/L Number',
    s.mawbOrBl,
    isAir ? 'Non-negotiable Air Waybill (IATA Resolution 600a)' : 'Original — negotiable Marine Bill of Lading');

  // ---- Shipper / Consignee / Notify grid ----
  const colW = (CONTENT_W) / 3;
  const addrH = 32;
  const shipperY = y + 1;
  rect(doc, MARGIN_L, shipperY, colW, addrH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('SHIPPER / EXPORTER', MARGIN_L + 2, shipperY + 2, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  let cy = shipperY + 6;
  cy = text(doc, s.customerName, MARGIN_L + 2, cy, { size: 9, bold: true, maxWidth: colW - 4 });
  text(doc, s.origin, MARGIN_L + 2, cy, { size: 8, maxWidth: colW - 4 });

  const conY = shipperY;
  const conLabel = s.direction === 'export' ? 'CONSIGNEE' : 'CONSIGNEE';
  rect(doc, MARGIN_L + colW, conY, colW, addrH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(conLabel, MARGIN_L + colW + 2, conY + 2, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  cy = conY + 6;
  cy = text(doc, s.customerName, MARGIN_L + colW + 2, cy, { size: 9, bold: true, maxWidth: colW - 4 });
  text(doc, s.destination, MARGIN_L + colW + 2, cy, { size: 8, maxWidth: colW - 4 });

  const notY = shipperY;
  rect(doc, MARGIN_L + colW * 2, notY, colW, addrH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('NOTIFY PARTY / AGENT', MARGIN_L + colW * 2 + 2, notY + 2, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  cy = notY + 6;
  cy = text(doc, 'Same as consignee', MARGIN_L + colW * 2 + 2, cy, { size: 9, italic: true, maxWidth: colW - 4 });
  text(doc, s.carrier + ' — local agent', MARGIN_L + colW * 2 + 2, cy, { size: 8, maxWidth: colW - 4 });

  y = shipperY + addrH + 2;

  // ---- Routing grid ----
  const rh = 32;
  rect(doc, MARGIN_L, y, CONTENT_W, rh);
  // Split into 4 columns
  const rW = CONTENT_W / 4;
  const rx0 = MARGIN_L, rx1 = MARGIN_L + rW, rx2 = MARGIN_L + rW * 2, rx3 = MARGIN_L + rW * 3;
  line(doc, rx1, y, rx1, y + rh);
  line(doc, rx2, y, rx2, y + rh);
  line(doc, rx3, y, rx3, y + rh);
  const cell = (label: string, val: string, x: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(label.toUpperCase(), x + 2, y + 2, { baseline: 'top' });
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK[0], INK[1], INK[2]);
    const lines = doc.splitTextToSize(val || '—', rW - 4);
    doc.text(lines, x + 2, y + 6, { baseline: 'top' });
  };
  cell(isAir ? 'Airport of Departure' : 'Port of Loading', s.portOfLoading, rx0);
  cell(isAir ? 'Airport of Destination' : 'Port of Discharge', s.portOfDischarge, rx1);
  cell(isAir ? 'Carrier / Flight' : 'Carrier / Vessel', `${s.carrier}  ·  ${s.vesselOrFlight}`, rx2);
  cell('Incoterms', s.incoterm || '—', rx3);
  y += rh + 2;

  // ---- Schedule / reference row ----
  const schedH = 14;
  const cols = 6;
  const sw = CONTENT_W / cols;
  const rowFields: [string, string][] = [
    ['Reference No.', s.reference],
    ['Direction', `${s.mode.toUpperCase()} / ${s.direction.toUpperCase()}`],
    ['ETD', fmtDate(s.etd)],
    ['ETA', fmtDate(s.eta)],
    ['ATD', s.atd ? fmtDate(s.atd) : '—'],
    ['ATA', s.ata ? fmtDate(s.ata) : '—'],
  ];
  rowFields.forEach(([lbl, val], i) => {
    box(doc, MARGIN_L + i * sw, y, sw, lbl, val, { h: schedH, bold: true });
  });
  y += schedH + 3;

  // ---- Cargo table header ----
  rect(doc, MARGIN_L, y, CONTENT_W, 7, BG_SOFT);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const tblCols: [string, number, 'left' | 'right' | 'center'][] = isAir
    ? [
        ['Pieces', 20, 'right'],
        ['Gross Weight (kg)', 32, 'right'],
        ['Rate Class', 18, 'center'],
        ['Chargeable Weight (kg)', 38, 'right'],
        ['Rate/kg', 20, 'right'],
        ['Nature & Quantity of Goods', 0, 'left'],
      ]
    : [
        ['Marks & Numbers', 40, 'left'],
        ['Packages', 18, 'right'],
        ['Description of Goods', 0, 'left'],
        ['Gross Weight (kg)', 30, 'right'],
        ['Measurement (CBM)', 30, 'right'],
      ];
  let cx = MARGIN_L + 2;
  const totalW = tblCols.reduce((s, [, w]) => s + (w || 0), 0);
  const flexIdx = tblCols.findIndex(([, w]) => !w);
  if (flexIdx >= 0) tblCols[flexIdx][1] = CONTENT_W - 4 - (totalW);
  tblCols.forEach(([lbl, w, a]) => {
    doc.text(lbl.toUpperCase(), a === 'right' ? cx + w - 2 : a === 'center' ? cx + w / 2 : cx, y + 2, { align: a, baseline: 'top' });
    cx += w;
  });
  y += 7;

  // ---- Cargo row ----
  const rowH = 18;
  rect(doc, MARGIN_L, y, CONTENT_W, rowH);
  cx = MARGIN_L + 2;
  // vertical dividers
  let ax = MARGIN_L;
  tblCols.forEach(([, w]) => { ax += w; if (ax < MARGIN_L + CONTENT_W - 0.5) line(doc, ax, y, ax, y + rowH); });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  const chg = s.chargeableWeight ?? s.weight;
  const rowVals = isAir
    ? [String(s.pieces), fmtNum(s.weight, 1), 'Q', fmtNum(chg, 1), s.totalAmount && chg ? fmtNum(s.totalAmount / chg, 2) : '—']
    : [s.mawbOrBl.slice(0, 18), String(s.pieces)];
  rowVals.forEach((v, i) => {
    const [, w, a] = tblCols[i];
    const tx = a === 'right' ? cx + w - 2 : a === 'center' ? cx + w / 2 : cx;
    doc.text(v, tx, y + 4, { align: a, baseline: 'top' });
    cx += w;
  });
  // Last col — commodity
  const last = tblCols[tblCols.length - 1];
  const lx = MARGIN_L + tblCols.slice(0, -1).reduce((s, [, w]) => s + w, 0) + 2;
  const lw = last[1] - 4;
  const commLines = doc.splitTextToSize(s.commodity, lw);
  doc.text(commLines, lx, y + 4, { baseline: 'top' });
  y += rowH;

  // ---- Totals row (AWB) or totals (B/L) ----
  if (isAir) {
    const tH = 8;
    rect(doc, MARGIN_L, y, CONTENT_W, tH);
    cx = MARGIN_L + 2;
    let ax = MARGIN_L;
    tblCols.forEach(([, w]) => { ax += w; if (ax < MARGIN_L + CONTENT_W - 0.5) line(doc, ax, y, ax, y + tH); });
    const totals = ['', String(s.pieces), '', '', fmtNum(chg, 1), 'TOTAL'];
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
    totals.forEach((v, i) => {
      const [, w, a] = tblCols[i];
      const tx = a === 'right' ? cx + w - 2 : a === 'center' ? cx + w / 2 : cx;
      doc.text(v, tx, y + 2.5, { align: a, baseline: 'top' });
      cx += w;
    });
    y += tH + 2;
  } else {
    y += 3;
  }

  // ---- Charges summary ----
  y += 2;
  const ch = 28;
  rect(doc, MARGIN_L, y, CONTENT_W, ch);
  line(doc, MARGIN_L + CONTENT_W / 2, y, MARGIN_L + CONTENT_W / 2, y + ch);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('WEIGHT / CHARGE PREPAID/COLLECT', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.text('OTHER CHARGES', MARGIN_L + CONTENT_W / 2 + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  doc.text(`Freight: ${fmtMoney(s.totalAmount, s.currency)}`, MARGIN_L + 3, y + 9, { baseline: 'top' });
  doc.text(`Prepaid  ·  ${s.incoterm}`, MARGIN_L + 3, y + 15, { baseline: 'top' });
  doc.text('Customs clearance, origin handling,', MARGIN_L + CONTENT_W / 2 + 3, y + 9, { baseline: 'top', maxWidth: CONTENT_W / 2 - 6 });
  doc.text('documentation, and security screening', MARGIN_L + CONTENT_W / 2 + 3, y + 14, { baseline: 'top', maxWidth: CONTENT_W / 2 - 6 });
  doc.text('as per service agreement.', MARGIN_L + CONTENT_W / 2 + 3, y + 19, { baseline: 'top', maxWidth: CONTENT_W / 2 - 6 });
  y += ch + 2;

  // ---- Handling info ----
  const hiH = 30;
  rect(doc, MARGIN_L, y, CONTENT_W, hiH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('HANDLING INFORMATION / REMARKS', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  const notes = [
    `Commodity: ${s.commodity}`,
    s.notes ? `Notes: ${s.notes}` : '',
    isAir
      ? `Chargeable weight computed per IATA 1:6000 volumetric formula. Pieces: ${s.pieces}. Gross: ${fmtNum(s.weight,1)} kg. Volumetric: ${fmtNum((s.volume*1e6)/6000,1)} kg. Billed: ${fmtNum(chg,1)} kg.`
      : `FCL/LCL as booked. Total ${s.pieces} packages, ${fmtNum(s.weight,1)} kg gross, ${fmtNum(s.volume,3)} CBM.`,
    s.hsCode ? `HS Code: ${s.hsCode}${s.hsDescription ? ' — ' + s.hsDescription : ''}` : '',
  ].filter(Boolean).join('\n');
  doc.text(doc.splitTextToSize(notes, CONTENT_W - 6), MARGIN_L + 3, y + 8, { baseline: 'top', maxWidth: CONTENT_W - 6 });
  y += hiH + 3;

  // ---- Shipper cert / Carrier cert boxes ----
  const sigH = 22;
  const sigW = (CONTENT_W - 3) / 2;
  // Shipper
  rect(doc, MARGIN_L, y, sigW, sigH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(isAir ? 'SHIPPER\'S CERTIFICATION' : 'SHIPPED ON BOARD IN APPARENT GOOD ORDER', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
  doc.text(doc.splitTextToSize(
    isAir
      ? 'Shipper certifies that the particulars on the face hereof are correct and agrees to the carrier\'s conditions of carriage.'
      : 'Received by the Carrier from the Shipper in apparent good order and condition (unless otherwise noted herein) the total number or quantity of Containers or other packages or units indicated for carriage subject to all the terms hereof.',
    sigW - 6
  ), MARGIN_L + 3, y + 8, { baseline: 'top' });
  line(doc, MARGIN_L + 5, y + sigH - 5, MARGIN_L + sigW - 5, y + sigH - 5);
  doc.setFont('helvetica', 'italic').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('Shipper / Authorised signatory', MARGIN_L + 5, y + sigH - 3, { baseline: 'bottom' });

  // Carrier
  const sx = MARGIN_L + sigW + 3;
  rect(doc, sx, y, sigW, sigH);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(isAir ? 'CARRIER\'S EXECUTION' : 'CARRIER / ISSUING AGENT', sx + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
  doc.text(doc.splitTextToSize(
    `Executed by FreightFlow on behalf of ${s.carrier} at Antananarivo on ${fmtDate(new Date().toISOString())}.`,
    sigW - 6
  ), sx + 3, y + 8, { baseline: 'top' });
  line(doc, sx + 5, y + sigH - 5, sx + sigW - 5, y + sigH - 5);
  doc.setFont('helvetica', 'italic').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(`${s.carrier} — as carrier`, sx + 5, y + sigH - 3, { baseline: 'bottom' });

  footer(doc, 1, 1);
  return doc.output('blob');
}

// ============================================================
// INVOICE — professional A4
// ============================================================
export function generateInvoicePDF(inv: Invoice): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = header(doc, 'COMMERCIAL INVOICE', 'Invoice No.', inv.number, 'Freight & logistics services');

  // BILL TO / SHIP TO / terms boxes
  const bw = (CONTENT_W - 6) / 3;
  const bh = 30;
  let by = y;
  rect(doc, MARGIN_L, by, bw, bh);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('BILL TO', MARGIN_L + 3, by + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK[0], INK[1], INK[2]);
  let cy = by + 8;
  cy = text(doc, inv.customerName, MARGIN_L + 3, cy, { size: 10, bold: true, maxWidth: bw - 6 });
  // fallback address — customer record not passed, just label
  text(doc, 'Customer account on file', MARGIN_L + 3, cy, { size: 8, italic: true, maxWidth: bw - 6, color: MUTED });

  rect(doc, MARGIN_L + bw + 3, by, bw, bh);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('SHIPMENT REF', MARGIN_L + bw + 6, by + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK[0], INK[1], INK[2]);
  text(doc, inv.shipmentId || '—', MARGIN_L + bw + 6, by + 8, { size: 10, bold: true });

  rect(doc, MARGIN_L + 2 * (bw + 3), by, bw, bh);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('TERMS', MARGIN_L + 2 * (bw + 3) + 3, by + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  let ty = by + 8;
  ty = text(doc, `Invoice date: ${fmtDate(inv.issueDate)}`, MARGIN_L + 2 * (bw + 3) + 3, ty, { size: 8 });
  ty = text(doc, `Due date: ${fmtDate(inv.dueDate)}`, MARGIN_L + 2 * (bw + 3) + 3, ty, { size: 8 });
  ty = text(doc, `Currency: ${inv.currency}`, MARGIN_L + 2 * (bw + 3) + 3, ty, { size: 8 });
  ty = text(doc, `Status: ${inv.status.toUpperCase()}${inv.paidDate ? ' · paid ' + fmtDate(inv.paidDate) : ''}`, MARGIN_L + 2 * (bw + 3) + 3, ty, { size: 8, bold: true, color: inv.status === 'paid' ? [20, 130, 70] : inv.status === 'overdue' ? [180, 40, 40] : BRAND });

  y = by + bh + 6;

  // Items table
  const itemsTop = y;
  const thH = 7;
  rect(doc, MARGIN_L, y, CONTENT_W, thH, BG_SOFT);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('#', MARGIN_L + 3, y + 2, { baseline: 'top' });
  doc.text('DESCRIPTION', MARGIN_L + 12, y + 2, { baseline: 'top' });
  doc.text('AMOUNT', PAGE_W - MARGIN_R - 3, y + 2, { baseline: 'top', align: 'right' });
  y += thH;

  inv.items.forEach((it, idx) => {
    const desc = doc.splitTextToSize(it.description, CONTENT_W - 40);
    const rh = Math.max(8, desc.length * 4.2 + 3);
    if (idx % 2 === 1) rect(doc, MARGIN_L, y, CONTENT_W, rh, [250, 252, 255]);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(idx + 1), MARGIN_L + 3, y + 2, { baseline: 'top' });
    doc.text(desc, MARGIN_L + 12, y + 2, { baseline: 'top' });
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(fmtMoney(it.amount, inv.currency), PAGE_W - MARGIN_R - 3, y + 2, { baseline: 'top', align: 'right' });
    y += rh;
  });

  // bottom grid lines
  line(doc, MARGIN_L, itemsTop, MARGIN_L, y);
  line(doc, PAGE_W - MARGIN_R, itemsTop, PAGE_W - MARGIN_R, y);
  line(doc, MARGIN_L, y, PAGE_W - MARGIN_R, y);

  y += 4;

  // Totals
  const totW = 70;
  const totX = PAGE_W - MARGIN_R - totW;
  const line_ = (label: string, value: string, opts: { bold?: boolean; fill?: boolean | [number, number, number]; color?: [number, number, number] } = {}) => {
    const lh = 7;
    if (opts.fill) rect(doc, totX, y, totW, lh, opts.fill);
    else line(doc, totX, y, PAGE_W - MARGIN_R, y);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(opts.bold ? 11 : 9).setTextColor((opts.color || INK)[0], (opts.color || INK)[1], (opts.color || INK)[2]);
    doc.text(label, totX + 3, y + 2, { baseline: 'top' });
    doc.text(value, PAGE_W - MARGIN_R - 3, y + 2, { align: 'right', baseline: 'top' });
    y += lh;
  };
  line_('Subtotal', fmtMoney(inv.subtotal, inv.currency));
  line_('VAT / Tax', fmtMoney(inv.tax, inv.currency));
  line_('TOTAL DUE', fmtMoney(inv.total, inv.currency), { bold: true, fill: BRAND, color: [255,255,255] });

  y += 6;

  // Payment / thanks
  rect(doc, MARGIN_L, y, CONTENT_W, 30, BG_SOFT);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
  doc.text('PAYMENT INSTRUCTIONS', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
  const py = y + 8;
  text(doc, 'Bank: Banque Centrale de Madagascar (correspondent) – details on statement', MARGIN_L + 3, py, { size: 8, maxWidth: CONTENT_W - 6 });
  text(doc, `Please reference invoice ${inv.number} on all payments. Terms: Net ${Math.max(0, Math.ceil((new Date(inv.dueDate).getTime() - new Date(inv.issueDate).getTime()) / 86400000))} days.`, MARGIN_L + 3, py + 6, { size: 8, maxWidth: CONTENT_W - 6 });
  text(doc, 'Thank you for your business — we appreciate the partnership. 🇲🇬', MARGIN_L + 3, py + 12, { size: 8, italic: true, color: MUTED, maxWidth: CONTENT_W - 6 });

  // OOBO info if present
  if (inv.einvoice) {
    y += 34;
    rect(doc, MARGIN_L, y, CONTENT_W, 12, [235, 250, 240], [80, 160, 110]);
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(20, 90, 50);
    doc.text('OOBO / DGI E-INVOICE (MADAGASCAR)', MARGIN_L + 3, y + 3, { baseline: 'top' });
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
    const uid = inv.einvoice.ooboUid ? `UID: ${inv.einvoice.ooboUid}` : 'Draft — pending OOBO submission';
    doc.text(uid, MARGIN_L + 3, y + 7.5, { baseline: 'top' });
    doc.text(`NIF émetteur: ${inv.einvoice.nifEmitter}  ·  TVA: ${fmtMoney(inv.einvoice.tva, inv.currency)}  ·  TTC: ${fmtMoney(inv.einvoice.ttc, inv.currency)}`, MARGIN_L + 3, y + 7.5, { align: 'right', baseline: 'top' });
  }

  footer(doc, 1, 1);
  return doc.output('blob');
}

// ============================================================
// QUOTE
// ============================================================
export function generateQuotePDF(q: Quote): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = header(doc, 'FREIGHT QUOTATION', 'Quote No.', q.number, `${q.mode.toUpperCase()} ${q.direction.toUpperCase()} · Valid until ${fmtDate(q.validUntil)}`);

  // Customer / route block
  const bw = CONTENT_W / 2;
  rect(doc, MARGIN_L, y, bw, 24);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('PREPARED FOR', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(INK[0], INK[1], INK[2]);
  let cy = y + 8;
  cy = text(doc, q.customerName, MARGIN_L + 3, cy, { size: 10, bold: true, maxWidth: bw - 6 });
  if (q.customerEmail) text(doc, q.customerEmail, MARGIN_L + 3, cy, { size: 8, color: MUTED, maxWidth: bw - 6 });

  rect(doc, MARGIN_L + bw, y, bw, 24);
  doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('ROUTING', MARGIN_L + bw + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
  cy = y + 8;
  cy = text(doc, `${q.origin}  →  ${q.destination}`, MARGIN_L + bw + 3, cy, { size: 9, bold: true, maxWidth: bw - 6 });
  text(doc, `${q.commodity} · ${fmtNum(q.weight,1)} kg · ${fmtNum(q.volume,3)} CBM`, MARGIN_L + bw + 3, cy, { size: 8, color: MUTED, maxWidth: bw - 6 });
  y += 28;

  // Items
  rect(doc, MARGIN_L, y, CONTENT_W, 7, BG_SOFT);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text('CHARGE ITEM', MARGIN_L + 3, y + 2, { baseline: 'top' });
  doc.text('AMOUNT', PAGE_W - MARGIN_R - 3, y + 2, { baseline: 'top', align: 'right' });
  y += 7;

  const items: [string, number][] = [
    ['Freight charges (ocean/air)', q.freightRate],
    ['Customs processing & documentation', q.customsFee],
    ['Inland trucking & delivery', q.truckingFee],
  ];
  items.forEach(([lbl, amt]) => {
    rect(doc, MARGIN_L, y, CONTENT_W, 7);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(INK[0], INK[1], INK[2]);
    doc.text(lbl, MARGIN_L + 3, y + 2, { baseline: 'top' });
    doc.text(fmtMoney(amt, 'USD'), PAGE_W - MARGIN_R - 3, y + 2, { baseline: 'top', align: 'right' });
    y += 7;
  });

  rect(doc, MARGIN_L, y, CONTENT_W, 8, BRAND);
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255,255,255);
  doc.text('TOTAL ALL-IN', MARGIN_L + 3, y + 2.5, { baseline: 'top' });
  doc.text(fmtMoney(q.total, 'USD'), PAGE_W - MARGIN_R - 3, y + 2.5, { baseline: 'top', align: 'right' });
  y += 12;

  // T&Cs
  rect(doc, MARGIN_L, y, CONTENT_W, 40, BG_SOFT);
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(BRAND_DARK[0], BRAND_DARK[1], BRAND_DARK[2]);
  doc.text('TERMS & CONDITIONS', MARGIN_L + 3, y + 3, { baseline: 'top' });
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(INK[0], INK[1], INK[2]);
  const terms = [
    '• Rates are valid until the date shown above, subject to carrier space, security approval and bunker/fuel surcharge adjustments.',
    '• Quoted amounts exclude insurance, duties, taxes (VAT/TVA) and storage beyond free time (7 days at CFS/yard).',
    '• Transit times are estimates; no guarantees are made for carrier schedule changes, customs inspection delays, or force majeure.',
    '• Dangerous goods / perishables require prior approval and may incur additional handling fees.',
    '• Payment terms: 50% deposit on booking confirmation; balance due prior to document release.',
  ].join('\n');
  doc.text(doc.splitTextToSize(terms, CONTENT_W - 6), MARGIN_L + 3, y + 8, { baseline: 'top', maxWidth: CONTENT_W - 6 });

  footer(doc, 1, 1);
  return doc.output('blob');
}

// ============================================================
// Download helper
// ============================================================
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
