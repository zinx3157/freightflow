'use client';

import React, { useState, useEffect } from 'react';
import type { Shipment, CarrierBooking } from '@/lib/types';
import { db } from '@/lib/store';
import { Button, Badge, Card } from './ui';
import { Plane, Ship, CheckCircle2, Clock, FileCheck, AlertCircle, Zap, Download, Send, FileText } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface Props {
  shipment: Shipment;
}

function statusColor(s: CarrierBooking['status']) {
  switch (s) {
    case 'confirmed': return 'emerald';
    case 'requested': return 'amber';
    case 'rejected': return 'rose';
    case 'amended': return 'blue';
    default: return 'slate';
  }
}

// Simulated carrier API response — picks carrier booking reference & schedule
function simulatedCarrierApi(carrier: string, mode: 'air' | 'sea', pol: string, pod: string, weight: number) {
  const prefix = mode === 'air'
    ? carrier.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3) + '-CGO-'
    : carrier.split(' ')[0].slice(0, 4).toUpperCase() + 'BN';
  const ref = prefix + Math.floor(1000000 + Math.random() * 9000000);
  // "API call" delay handled outside
  const cutoffs = {
    sob: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    vgm: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    cy: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    docs: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    equipment: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    terminal: pol === 'Toamasina' ? 'Toamasina International Terminal (TIT)' :
              pol === 'TNR' ? 'Ivato Airport Cargo Terminal 1' :
              pol === 'Shanghai' ? 'Shanghai Waigaoqiao T2' :
              pol === 'DXB' ? 'Dubai Cargo Mega Terminal' : `${pol} Main Terminal`,
    allotment: mode === 'air'
      ? weight < 1000 ? 'Bulk ' + Math.ceil(weight) + 'kg' : '1 x PMC ULD'
      : weight > 20000 ? '2 x 40HC' : weight > 8000 ? '1 x 40HC' : weight > 5000 ? '1 x 20GP' : 'LCL',
  };
  return { ref, ...cutoffs };
}

export default function CarrierBookingPanel({ shipment }: Props) {
  const [booking, setBooking] = useState<CarrierBooking | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    setBooking(db.bookingForShipment(shipment.id) ?? null);
    const onChange = () => setBooking(db.bookingForShipment(shipment.id) ?? null);
    window.addEventListener('ff:data-changed', onChange);
    return () => window.removeEventListener('ff:data-changed', onChange);
  }, [shipment.id]);

  const requestBooking = () => {
    setRequesting(true);
    setTimeout(() => {
      const api = simulatedCarrierApi(shipment.carrier, shipment.mode, shipment.portOfLoading, shipment.portOfDischarge, shipment.weight);
      db.createBooking({
        shipmentId: shipment.id,
        carrier: shipment.carrier,
        mode: shipment.mode,
        bookingReference: api.ref,
        status: 'requested',
        requestedAt: new Date().toISOString(),
        sob: api.sob,
        vgmCutoff: api.vgm,
        cyCutoff: api.cy,
        docsCutoff: api.docs,
        equipmentReadyAt: api.equipment,
        terminal: api.terminal,
        allocatedSpace: api.allotment,
        initialEvent: { stage: 'Requested', message: `Booking ${api.ref} submitted to ${shipment.carrier} via eAPI` },
      });
      setRequesting(false);
    }, 1200);
  };

  const confirmBooking = () => {
    if (!booking) return;
    setConfirming(true);
    setTimeout(() => {
      db.updateBooking(booking.id, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
      }, { stage: 'Confirmed', message: `${shipment.carrier} confirmed allotment: ${booking.allocatedSpace} on ${shipment.vesselOrFlight}` });
      setConfirming(false);
    }, 1000);
  };

  const issueEBL = () => {
    if (!booking) return;
    setIssuing(true);
    setTimeout(() => {
      db.updateBooking(booking.id, {
        eblIssued: true,
        eblIssueDate: new Date().toISOString().slice(0, 10),
        eblUrl: `https://freightflow.mg/ebl/${booking.bookingReference}`,
      }, { stage: 'eBL Issued', message: `${shipment.mode === 'air' ? 'e-AWB' : 'eBL'} issued and available for download / surrender` });
      setIssuing(false);
    }, 900);
  };

  const ModeIcon = shipment.mode === 'air' ? Plane : Ship;

  if (!booking) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-brand text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Carrier e-Booking</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant API booking with {shipment.carrier || 'selected carrier'}</p>
            </div>
          </div>
          <Badge color="slate">Not requested</Badge>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Send a booking request electronically via INTTRA / cargo portal.
          CargoWise customers typically wait 30-60 minutes on hold or email back-and-forth — FreightFlow e-Booking confirms in seconds.
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
          <InfoItem label="Carrier" value={shipment.carrier || 'TBD'} />
          <InfoItem label="Mode" value={shipment.mode === 'air' ? 'Air (e-AWB)' : 'Sea (eBL)'} />
          <InfoItem label="Allotment" value={shipment.mode === 'air' ? (shipment.weight < 1000 ? `Bulk ${shipment.weight}kg` : '1 x ULD') : shipment.weight > 20000 ? '2 x 40HC' : shipment.weight > 8000 ? '1 x 40HC' : 'LCL'} />
        </div>
        <Button onClick={requestBooking} disabled={requesting || !shipment.carrier} className="w-full">
          {requesting ? <><span className="animate-pulse">Sending to {shipment.carrier}...</span></> : <><Zap className="w-4 h-4" /> Send e-Booking request</>}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-brand text-white flex items-center justify-center">
            <ModeIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">
              {shipment.carrier} — <span className="font-mono text-sm">{booking.bookingReference}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              e-Booking via FreightFlow API {booking.mode === 'air' ? '(e-AWB)' : '(INTTRA/eBL)'}
            </p>
          </div>
        </div>
        <Badge color={statusColor(booking.status) as any}>
          {booking.status === 'requested' && <Clock className="w-3 h-3" />}
          {booking.status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
          {booking.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
          {booking.status === 'amended' && <FileCheck className="w-3 h-3" />}
          {booking.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <InfoItem label="Allocated space" value={booking.allocatedSpace || '-'} />
        <InfoItem label="Terminal" value={booking.terminal || '-'} />
        <InfoItem label="SI cutoff" value={booking.sob ? formatDate(booking.sob) : '-'} />
        <InfoItem label="VGM cutoff" value={booking.vgmCutoff ? formatDate(booking.vgmCutoff) : '-'} />
        <InfoItem label="CY / Depot cutoff" value={booking.cyCutoff ? formatDate(booking.cyCutoff) : '-'} />
        <InfoItem label="Docs cutoff" value={booking.docsCutoff ? formatDate(booking.docsCutoff) : '-'} />
        <InfoItem label="Equipment ready" value={booking.equipmentReadyAt ? formatDate(booking.equipmentReadyAt) : '-'} />
        <InfoItem label="eBL/eAWB" value={booking.eblIssued ? 'Issued' : 'Not yet issued'} />
      </div>

      <div className="mb-4">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Booking timeline</div>
        <div className="space-y-2 relative before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
          {booking.events.map((ev, i) => (
            <div key={i} className="relative pl-6">
              <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${i === booking.events.length - 1 ? 'bg-brand border-brand animate-pulse' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`} />
              <div className="text-sm font-medium text-slate-900 dark:text-white">{ev.stage}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{ev.message}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(ev.at)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {booking.status === 'requested' && (
          <Button onClick={confirmBooking} disabled={confirming}>
            {confirming ? 'Confirming…' : <><CheckCircle2 className="w-4 h-4" /> Simulate carrier confirmation</>}
          </Button>
        )}
        {booking.status === 'confirmed' && !booking.eblIssued && (
          <Button onClick={issueEBL} disabled={issuing} variant="secondary">
            {issuing ? 'Issuing…' : <><FileText className="w-4 h-4" /> Issue {shipment.mode === 'air' ? 'e-AWB' : 'eBL'}</>}
          </Button>
        )}
        {booking.eblIssued && (
          <Button variant="secondary" onClick={() => alert('In production this would stream the signed PDF eBL from the carrier. For this demo, use the Download B/L button above to generate a FreightFlow PDF preview.')}>
            <Download className="w-4 h-4" /> Download eBL PDF
          </Button>
        )}
        <Button variant="outline" onClick={() => {
          db.logEmail({
            to: shipment.customerEmail || 'customer@example.com',
            subject: `Booking confirmed ${booking.bookingReference} — ${shipment.reference}`,
            template: 'booking_conf',
            relatedType: 'shipment',
            relatedId: shipment.id,
            relatedRef: shipment.reference,
            body: `Dear ${shipment.customerName},\n\nYour booking ${booking.bookingReference} with ${shipment.carrier} has been confirmed.\nAllotted: ${booking.allocatedSpace}\nVessel/Flight: ${shipment.vesselOrFlight}\n\nWe will send the ${shipment.mode === 'air' ? 'AWB' : 'B/L'} shortly.\n\nFreightFlow Operations.`,
          });
          alert('Confirmation email queued to customer.');
        }}>
          <Send className="w-4 h-4" /> Email confirmation
        </Button>
      </div>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{value}</div>
    </div>
  );
}
