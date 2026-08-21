'use client';

import type { Shipment, Invoice, Quote, TruckingDispatch } from './types';
import jsPDF from 'jspdf';

// Simple helper to add multiline text to jsPDF
function addText(doc: jsPDF, text: string, x: number, y: number, opts: { size?: number; bold?: boolean; maxWidth?: number; color?: [number, number, number] } = {}) {
  const { size = 10, bold = false, maxWidth = 170, color = [30, 41, 59] } = opts;
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * (size * 0.45);
}

export function generateShipmentBL(s: Shipment): Blob {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();
  let y = 20;

  // Header
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('FreightFlow', 15, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Logistics OS — Shipping Documents', 15, 24);

  // Title
  doc.setTextColor(15, 76, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(s.mode === 'air' ? 'AIR WAYBILL' : 'BILL OF LADING', 15, (y += 25));

  // Reference box
  y += 8;
  doc.setDrawColor(15, 76, 129);
  doc.setLineWidth(0.5);
  doc.rect(15, y, 180, 22);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 76, 129);
  doc.text(s.reference, 20, y + 8);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
  doc.text(s.mode === 'air' ? `MAWB: ${s.mawbOrBl}` : `B/L No: ${s.mawbOrBl}`, 20, y + 14);
  doc.text(`Issued: ${today}`, 130, y + 8);
  doc.text(`${s.mode.toUpperCase()} · ${s.direction.toUpperCase()} · ${s.incoterm}`, 130, y + 14);
  y += 28;

  // Shipper / Consignee boxes
  doc.setDrawColor(200, 210, 220);
  doc.rect(15, y, 85, 35);
  doc.rect(110, y, 85, 35);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('SHIPPER / EXPORTER', 18, y + 5);
  doc.text(s.direction === 'export' ? 'CONSIGNEE' : 'NOTIFY PARTY', 113, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  y += 10;
  doc.text(s.customerName, 18, y);
  doc.text(s.origin, 18, y + 5);
  doc.text(s.direction === 'export' ? s.destination : s.destination, 113, y);
  doc.text(s.portOfDischarge, 113, y + 5);
  y += 30;

  // Routing
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('ROUTING', 15, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  y = addText(doc, `${s.portOfLoading} (${s.origin}) → ${s.portOfDischarge} (${s.destination})`, 15, y);
  y = addText(doc, `Carrier: ${s.carrier}    ${s.mode === 'air' ? 'Flight' : 'Vessel'}: ${s.vesselOrFlight}`, 15, y + 2);
  y += 6;

  // Schedule
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('SCHEDULE', 15, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text(`ETD: ${s.etd}`, 15, y);
  doc.text(`ETA: ${s.eta}`, 70, y);
  if (s.atd) doc.text(`ATD: ${s.atd}`, 125, y);
  y += 8;

  // Cargo description table
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  doc.text('MARKS & NOS', 17, y + 5.5);
  doc.text('DESCRIPTION OF GOODS', 55, y + 5.5);
  doc.text('PIECES', 130, y + 5.5);
  doc.text('WEIGHT', 150, y + 5.5);
  doc.text('VOLUME', 175, y + 5.5);
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text(s.mawbOrBl.slice(0, 14), 17, y + 5);
  doc.text(s.commodity, 55, y + 5, { maxWidth: 70 });
  doc.text(String(s.pieces), 130, y + 5);
  doc.text(`${s.weight.toLocaleString()} kg`, 150, y + 5);
  doc.text(`${s.volume} CBM`, 175, y + 5);
  y += 20;

  // Charges / Value
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('DECLARED VALUE FOR CARRIAGE', 15, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  const valueStr = `${s.currency} ${s.totalAmount.toLocaleString()}`;
  doc.text(valueStr, 15, y);
  y += 12;

  // Footer
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated document issued via FreightFlow Logistics OS.', 15, 275);
  doc.text(`Generated ${today}`, 160, 275);

  return doc.output('blob');
}

export function generateInvoicePDF(inv: Invoice): Blob {
  const doc = new jsPDF();
  let y = 20;
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', 15, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('FreightFlow Logistics', 15, 28);

  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 76, 129);
  doc.text(inv.number, 130, 25);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text(`Issued: ${inv.issueDate}`, 130, 31);
  doc.text(`Due: ${inv.dueDate}`, 130, 36);

  y = 50;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text('BILL TO:', 15, y);
  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 59);
  y = addText(doc, inv.customerName, 15, y, { size: 12, bold: true });
  y += 3;

  // Items table
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION', 17, y + 5.5);
  doc.text('AMOUNT', 170, y + 5.5);
  y += 8;
  inv.items.forEach((it) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(it.description, 145);
    doc.text(lines, 17, y + 4);
    doc.text(`${inv.currency} ${it.amount.toLocaleString()}`, 160, y + 4, { align: 'right' });
    y += Math.max(lines.length * 5, 8);
  });
  y += 4;
  doc.setDrawColor(200, 210, 220);
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  doc.text('Subtotal', 140, y); doc.text(`${inv.currency} ${inv.subtotal.toLocaleString()}`, 170, y, { align: 'right' });
  y += 6;
  doc.text('Tax', 140, y); doc.text(`${inv.currency} ${inv.tax.toLocaleString()}`, 170, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 76, 129);
  doc.text('TOTAL DUE', 140, y); doc.text(`${inv.currency} ${inv.total.toLocaleString()}`, 170, y, { align: 'right' });

  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text(`Status: ${inv.status.toUpperCase()}${inv.paidDate ? ' · Paid ' + inv.paidDate : ''}`, 15, 280);
  doc.text('Thank you for your business.', 15, 275);

  return doc.output('blob');
}

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

export function generateQuotePDF(q: Quote): Blob {
  const doc = new jsPDF();
  let y = 20;
  doc.setFillColor(15, 76, 129);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text('FreightFlow', 15, 16);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Freight Quotation', 15, 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(15, 76, 129);
  doc.text(`QUOTATION ${q.number}`, 15, (y += 30));
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
  y = addText(doc, `Prepared for: ${q.customerName}`, 15, y);
  y = addText(doc, `${q.mode.toUpperCase()} ${q.direction.toUpperCase()}: ${q.origin} → ${q.destination}`, 15, y + 2);
  y = addText(doc, `Commodity: ${q.commodity} · ${q.weight} kg · ${q.volume} CBM`, 15, y + 2);
  y = addText(doc, `Valid until: ${q.validUntil}`, 15, y + 2);
  y += 10;
  const items = [
    ['Freight charges', q.freightRate],
    ['Customs processing & documentation', q.customsFee],
    ['Inland trucking', q.truckingFee],
  ];
  doc.setFillColor(241, 245, 249); doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  doc.text('ITEM', 17, y + 5.5);
  doc.text('AMOUNT (USD)', 155, y + 5.5);
  y += 8;
  items.forEach(([label, amount]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
    doc.text(label as string, 17, y + 4);
    doc.text(`$${(amount as number).toLocaleString()}`, 185, y + 4, { align: 'right' });
    y += 8;
  });
  doc.line(15, y, 195, y); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 76, 129);
  doc.text('TOTAL', 140, y); doc.text(`$${q.total.toLocaleString()}`, 185, y, { align: 'right' });
  y += 15;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('Rates are valid until the date shown above. Quotation subject to carrier space and security approval.', 15, y);
  return doc.output('blob');
}
