'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import { Bot, User, Send, Sparkles, X, TrendingUp, Package, DollarSign, AlertTriangle, Truck, Plane, Ship, Calendar, Warehouse, Inbox as InboxIcon, FileCheck, Smartphone } from 'lucide-react';
import { formatMoney, formatDate, titleCase } from '@/lib/utils';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  cards?: React.ReactNode;
}

const INTRO: Msg = {
  role: 'ai',
  text: "Hi! I'm FreightFlow AI Copilot. I can answer questions about your shipments, customers, invoices, trucking, and quotes. Try asking:",
};

const SUGGESTIONS = [
  "What shipments are arriving this week?",
  "Which customers owe us money?",
  "Show carrier bookings and eBL status",
  "How many air vs sea shipments do we have?",
  "What's our email open rate?",
  "Which shipments are stuck in customs?",
  "Where are our trucks right now?",
  "What's our gross margin this period?",
  "Summarize customs SAD declarations",
  "Who is our top customer?",
  "What's in the warehouse right now?",
  "Any unread emails from carriers?",
  "How many PODs do we have today?",
];

function analyze(query: string, data: DB): { text: string; cards?: React.ReactNode } {
  const q = query.toLowerCase();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  // Revenue questions
  if (/revenue|sales|income|money made|paid/.test(q)) {
    const paid = data.invoices.filter((i) => i.status === 'paid');
    const paidTotal = paid.reduce((s, i) => s + i.total, 0);
    const outstanding = data.invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.total, 0);
    const overdue = data.invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    return {
      text: `💰 **Revenue summary:**\n• Paid invoices: **${formatMoney(paidTotal)}** (${paid.length} invoices)\n• Outstanding (sent, not yet due): ${formatMoney(outstanding)}\n• Overdue: ${formatMoney(overdue)}\n\nTotal invoiced across all statuses: ${formatMoney(data.invoices.reduce((s, i) => s + i.total, 0))}.`,
    };
  }

  // Air vs sea
  if (/air.*sea|sea.*air|mode split|how many air|how many sea|split/.test(q)) {
    const air = data.shipments.filter((s) => s.mode === 'air').length;
    const sea = data.shipments.filter((s) => s.mode === 'sea').length;
    const airImp = data.shipments.filter((s) => s.mode === 'air' && s.direction === 'import').length;
    const airExp = data.shipments.filter((s) => s.mode === 'air' && s.direction === 'export').length;
    const seaImp = data.shipments.filter((s) => s.mode === 'sea' && s.direction === 'import').length;
    const seaExp = data.shipments.filter((s) => s.mode === 'sea' && s.direction === 'export').length;
    return {
      text: `✈️ **Air vs Sea breakdown:**\n\n**Air freight:** ${air} shipments (${airExp} export / ${airImp} import)\n**Sea freight:** ${sea} shipments (${seaExp} export / ${seaImp} import)\n\nSea is ${Math.round((sea / (air + sea)) * 100)}% of your book — that's typical for a Madagascar-based forwarder handling both vanilla/spice exports and consumer goods imports.`,
    };
  }

  // Arriving this week
  if (/arriv|eta|this week|coming|next week|upcoming|due/.test(q)) {
    const arriving = data.shipments
      .filter((s) => s.status !== 'delivered' && s.status !== 'cancelled')
      .filter((s) => {
        const d = new Date(s.eta);
        return d >= now && d <= weekEnd;
      })
      .sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());
    const departures = data.shipments
      .filter((s) => s.status !== 'delivered' && s.status !== 'cancelled')
      .filter((s) => {
        const d = new Date(s.etd);
        return d >= now && d <= weekEnd;
      });
    let text = `📅 **This week:**\n• ${arriving.length} shipments arriving (ETA in next 7 days)\n• ${departures.length} shipments departing\n\n`;
    if (arriving.length > 0) {
      text += `**Arrivals:**\n${arriving.map((s) => `• ${s.reference} — ${s.portOfDischarge}, ETA ${formatDate(s.eta)} (${s.customerName})`).join('\n')}`;
    } else {
      text += `No arrivals scheduled this week. Use the time to clear outstanding customs docs!`;
    }
    return { text };
  }

  // Customs
  if (/customs|clearance|stuck|inspection|reject|duty|duties/.test(q)) {
    const inspection = data.shipments.filter((s) => s.customsStatus === 'inspection' || s.customsStatus === 'rejected');
    const pending = data.shipments.filter((s) => ['pending', 'docs_received', 'declared'].includes(s.customsStatus || ''));
    const cleared = data.shipments.filter((s) => s.customsStatus === 'cleared');
    const totalDuties = data.shipments.reduce((s, x) => s + (x.duties || 0), 0);
    return {
      text: `🛃 **Customs status:**\n• 🚨 Attention required: **${inspection.length}** in inspection/rejected\n• ⏳ Pending/declared: ${pending.length}\n• ✅ Cleared: ${cleared.length}\n• Estimated duties owed: ${formatMoney(totalDuties)}\n\n${inspection.length > 0 ? 'Shipments needing attention:\n' + inspection.map((s) => `• ${s.reference} — ${s.customsStatus} (${s.customerName})`).join('\n') : 'No critical issues — good job!'}`
    };
  }

  // Customers owing money
  if (/owe|outstanding|unpaid|debt|receivable|aged|collections/.test(q)) {
    const debtors = data.invoices
      .filter((i) => i.status === 'sent' || i.status === 'overdue')
      .sort((a, b) => b.total - a.total);
    const total = debtors.reduce((s, i) => s + i.total, 0);
    return {
      text: `💸 **Outstanding receivables:** ${formatMoney(total)} across ${debtors.length} invoice(s).\n\n${debtors.map((i) => `• **${i.customerName}** — ${formatMoney(i.total)} (${i.number}, due ${formatDate(i.dueDate)})${i.status === 'overdue' ? ' ⚠ OVERDUE' : ''}`).join('\n')}\n\n${debtors.some((i) => i.status === 'overdue') ? 'Consider sending payment reminders to overdue accounts.' : 'All outstanding invoices are within their payment terms.'}`
    };
  }

  // Quotes
  if (/quote|quotation|estimate|pending deal|pipeline/.test(q)) {
    const pending = data.quotes.filter((q) => q.status === 'pending');
    const accepted = data.quotes.filter((q) => q.status === 'accepted');
    const value = pending.reduce((s, q) => s + q.total, 0);
    return {
      text: `📄 **Quotes:**\n• Pending: **${pending.length}** (${formatMoney(value)} pipeline)\n• Accepted: ${accepted.length}\n• Converted/Won: ${data.quotes.filter((q) => q.status === 'converted').length}\n• Rejected: ${data.quotes.filter((q) => q.status === 'rejected').length}\n\n**Pending quotes:**\n${pending.map((q) => `• ${q.number} — ${q.customerName}: ${formatMoney(q.total)} (${q.mode} ${q.origin}→${q.destination}, valid until ${formatDate(q.validUntil)})`).join('\n') || 'None.'}`
    };
  }

  // Trucking / GPS live location
  if (/truck|driver|dispatch|land|inland|vehicle|where are.*truck|gps|live location|position|en route/.test(q)) {
    const active = data.trucking.filter((t) => t.status !== 'completed');
    const completed = data.trucking.filter((t) => t.status === 'completed');
    const enRoute = data.trucking.filter((t) => t.status === 'en_route');
    // get last GPS ping per active trucking
    const gps = data.gpsPings || [];
    const lines = active.map((t) => {
      const pings = gps.filter((p) => p.truckingId === t.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const last = pings[0];
      const loc = last ? ` — ${last.locationLabel || `${last.lat.toFixed(3)},${last.lng.toFixed(3)}`} @ ${last.speedKmh || 0}km/h` : '';
      return `• ${t.reference} — ${titleCase(t.status)} (${t.driverName}, ${t.vehiclePlate})${loc}`;
    });
    return {
      text: `🚛 **Trucking & Live GPS:**\n• Active dispatches: **${active.length}** (${enRoute.length} en route right now)\n• Completed: ${completed.length}\n• Total fleet cost YTD: ${formatMoney(data.trucking.reduce((s, t) => s + t.cost, 0))}\n\n${lines.join('\n')}\n\nOpen any dispatch from the Trucking page for the live GPS map with route replay.`
    };
  }

  // Top customers / lanes / profitability
  if (/top customer|best customer|most profitable|lane|profit/.test(q)) {
    const revenue = new Map<string, { name: string; total: number; count: number }>();
    data.shipments.forEach((s) => {
      const cur = revenue.get(s.customerId) || { name: s.customerName, total: 0, count: 0 };
      cur.total += s.totalAmount;
      cur.count += 1;
      revenue.set(s.customerId, cur);
    });
    const top = Array.from(revenue.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    return {
      text: `🏆 **Top customers by shipment value:**\n${top.map((c, i) => `${i + 1}. **${c.name}** — ${formatMoney(c.total)} (${c.count} shipments)`).join('\n')}\n\n💡 Tip: Nurture these accounts with priority service and proactive tracking updates.`
    };
  }

  // Overview
  if (/overview|summary|status|how many|count|stats|dashboard|tldr|everything/.test(q)) {
    const active = data.shipments.filter((s) => s.status !== 'delivered' && s.status !== 'cancelled').length;
    const inTransit = data.shipments.filter((s) => s.status === 'in_transit').length;
    const paid = data.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    return {
      text: `👋 **Operations Snapshot:**\n• 📦 Total shipments: ${data.shipments.length} (${active} active, ${inTransit} in transit)\n• 🚛 Active trucking jobs: ${data.trucking.filter((t) => t.status !== 'completed').length}\n• 👥 Customers: ${data.customers.length}\n• 📝 Open quotes: ${data.quotes.filter((q) => q.status === 'pending').length}\n• 💰 Paid revenue: ${formatMoney(paid)}\n\nAsk me anything specific — e.g. "which shipments arrive this week" or "who owes us money".`
    };
  }

  // Carrier bookings
  if (/booking|carrier|ebl|e-bl|electronic bl|confirmed|allotment|sob|vgm/i.test(q)) {
    const confirmed = data.bookings.filter((b) => b.status === 'confirmed');
    const pending = data.bookings.filter((b) => b.status === 'requested');
    const issued = data.bookings.filter((b) => b.eblIssued);
    return {
      text: `⚡ **Carrier e-Bookings:**\n• Confirmed allotments: **${confirmed.length}**\n• Awaiting carrier response: ${pending.length}\n• eBL/e-AWB issued: ${issued.length}\n\n${confirmed.map((b) => `• ${b.carrier} **${b.bookingReference}** — ${b.allocatedSpace} on ${(data.shipments.find((s) => s.id === b.shipmentId)?.reference) || 'shipment'}`).slice(0, 6).join('\n')}${pending.length > 0 ? '\n\n⏳ Pending confirmations appear in real-time in each shipment’s Carrier Booking panel.' : ''}`
    };
  }

  // Emails / opens / clicks
  if (/email|open rate|click|sent messages|notification/i.test(q)) {
    const sent = data.emails.length;
    const opened = data.emails.filter((e) => e.status === 'opened' || e.status === 'clicked').length;
    const clicked = data.emails.filter((e) => e.status === 'clicked').length;
    const bounced = data.emails.filter((e) => e.status === 'bounced').length;
    return {
      text: `✉️ **Email automation:**\n• Messages sent: **${sent}**\n• Opens: ${opened} (${sent ? Math.round(opened / sent * 100) : 0}% open rate)\n• Link clicks: ${clicked} (${opened ? Math.round(clicked / opened * 100) : 0}% CTR)\n• Bounces: ${bounced}\n\nCustomer emails are auto-logged per shipment. Open/click tracking is native — no extra tools needed.`
    };
  }

  // HS classification
  if (/hs code|hs6|tariff|classif|commodity code|duty rate/i.test(q)) {
    const classified = data.shipments.filter((s) => s.hsCode);
    return {
      text: `📋 **HS Classification:**\n${classified.length} of ${data.shipments.length} shipments classified.\n\n${classified.slice(0, 6).map((s) => `• ${s.reference} (${s.commodity.slice(0, 28)}): **${s.hsCode}** — duty est. ${s.dutyRate ?? '?'}%`).join('\n')}\n\nRun the AI classifier on any shipment to auto-suggest HS-6 codes and duty estimates for the destination country.`
    };
  }

  // Containers / manifest
  if (/container|uld|seal|manifest|vgm|reefer|package/i.test(q)) {
    const totalContainers = data.containers.length;
    const reefers = data.containers.filter((c) => c.containerType?.startsWith('REEFER')).length;
    const dg = data.containers.filter((c) => c.dangerous).length;
    return {
      text: `📦 **Container/ULD manifest:**\n• Total units: **${totalContainers}**\n• Reefers (temp-controlled): ${reefers}\n• Dangerous goods: ${dg}\n\nUse the Container Manifest panel on any shipment to manage container numbers, seals, VGM, temperatures, and UN numbers.`
    };
  }

  // Dangerous goods
  if (/dangerous|dg|dgr|hazmat|hazardous|un number|un3|imo|iata dgr/i.test(q)) {
    const dgShipments = new Set(data.dg.map((d) => d.shipmentId));
    return {
      text: `☢️ **Dangerous Goods:**\n• DG lines declared: **${data.dg.length}**\n• Shipments with DG: ${dgShipments.size}\n\n${data.dg.slice(0, 5).map((d) => {
      const sh = data.shipments.find((s) => s.id === d.shipmentId);
      return `• **${d.unNumber}** ${d.properShippingName} (Class ${d.dgClass}${d.packingGroup ? ', PG ' + d.packingGroup : ''}) — ${sh ? sh.reference : 'shipment'}`;
    }).join('\n')}\n\nDG declarations can be added/approved from the Dangerous Goods panel on each shipment detail page.`
    };
  }

  // Customs SAD / ASYCUDA declarations
  if (/sad|asycuda|declaration|mrn|lodged|duty payment|broker/i.test(q)) {
    const decs = data.customsDeclarations || [];
    const released = decs.filter((d) => d.status === 'released');
    const assessed = decs.filter((d) => d.status === 'assessed');
    const submitted = decs.filter((d) => d.status === 'submitted' || d.status === 'accepted');
    const totalDuty = decs.reduce((s, d) => s + d.totalDuties + d.totalVAT + d.totalOtherTaxes, 0);
    return {
      text: `🛃 **ASYCUDA SAD Declarations:**\n• Total declarations: **${decs.length}**\n• Released: ${released.length}\n• Assessed (awaiting payment): ${assessed.length}\n• Submitted/accepted: ${submitted.length}\n• Total duty & VAT assessed: ${formatMoney(totalDuty)}\n\n${decs.slice(0,5).map((d) => `• ${d.number} (${d.type}) — ${titleCase(d.status)}${d.mrns ? ' · MRN ' + d.mrns.slice(-8) : ''} · ${d.importerExporter}`).join('\n')}\n\nUse the Customs Declaration panel on any shipment to lodge a SAD and simulate the ASYCUDA workflow.`
    };
  }

  // General Ledger / Journal / margin / P&L
  if (/ledger|journal|general ledger|gl|cogs|gross profit|margin|profit.*loss|p&l|co2|carbon|emission/i.test(q)) {
    const je = data.journal || [];
    let revenue = 0, cogs = 0, duties = 0;
    je.forEach((e) => {
      if (e.type === 'invoice_receivable') revenue += e.amount;
      if (e.type === 'freight_cost' || e.type === 'trucking_cost') cogs += e.amount;
      if (e.type === 'customs_duty') duties += e.amount;
    });
    const gp = revenue - cogs - duties;
    const margin = revenue ? (gp / revenue) * 100 : 0;
    const ar = je.filter((e) => e.type === 'invoice_receivable').reduce((s, e) => s + e.amount, 0)
             - je.filter((e) => e.type === 'bank_deposit').reduce((s, e) => s + e.amount, 0);
    return {
      text: `📊 **Financials (from General Ledger):**\n• Revenue booked: **${formatMoney(revenue)}**\n• COGS (freight + trucking): ${formatMoney(cogs)}\n• Customs/Duties: ${formatMoney(duties)}\n• Gross profit: **${formatMoney(gp)}** (${margin.toFixed(1)}% margin)\n• A/R outstanding: ${formatMoney(Math.max(ar, 0))}\n• Journal entries YTD: ${je.length}\n\nOpen Reports → General Ledger tab for the full double-entry journal.`
    };
  }

  // Rate cards
  if (/rate card|rates|buy rate|sell rate|pricing|tariff/i.test(q)) {
    const active = data.rates.filter((r) => r.active);
    const air = active.filter((r) => r.mode === 'air').length;
    const sea = active.filter((r) => r.mode === 'sea').length;
    const road = active.filter((r) => r.mode === 'road').length;
    const avgMargin = active.length ? Math.round(active.reduce((s, r) => s + (r.sellRate - r.buyRate) / r.sellRate * 100, 0) / active.length) : 0;
    return {
      text: `💲 **Rate Cards:**\n• Active rates: **${active.length}** (${air} air, ${sea} sea, ${road} road)\n• Average sell/buy margin: **${avgMargin}%**\n\nVisit the Rate Cards page (left sidebar) to manage rates per carrier/lane and use the built-in calculator for instant quoting.`
    };
  }

  // Incoming quote requests
  if (/incoming.*quote|quote.*request|lead|public.*quote|quote.*lead/i.test(q)) {
    const pending = (data.quoteRequests || []).filter((q) => q.status === 'new').length;
    return {
      text: `📬 **Incoming quote requests:**\n• New (unreplied): **${pending}**\n• Total: ${(data.quoteRequests || []).length}\n\nOpen the Quotes page and click the "Inbox Requests" card to review and reply. Customers submit via the public /get-quote page.`
    };
  }

  // Warehouse / WMS
  if (/warehouse|wms|cfs|whr|stuff|strip|receipt|bay|on hand|in stock|reefer/i.test(q)) {
    const whr = (data as any).warehouseReceipts || [];
    const expected = whr.filter((w:any) => w.status === 'expected').length;
    const onHand = whr.filter((w:any) => ['received','putaway','picked','stuffed','stripped'].includes(w.status)).length;
    const reefers = whr.filter((w:any) => w.temperature !== undefined || w.zone === 'REEFER').length;
    const dg = whr.filter((w:any) => w.dangerous).length;
    const pieces = whr.reduce((s:number,w:any) => s+(w.pieces||0), 0);
    const weight = whr.reduce((s:number,w:any) => s+(w.weightKg||0), 0);
    return {
      text: `🏭 **Warehouse (WMS):**\n• Total receipts: **${whr.length}**\n• Expected arrivals: ${expected}\n• Cargo on hand: ${onHand}\n• Reefer units: ${reefers}\n• DG stored: ${dg}\n• Total pieces: ${pieces.toLocaleString()}\n• Total weight: ${Math.round(weight).toLocaleString()} kg (${(weight/1000).toFixed(1)} t)\n\n${whr.slice(0,5).map((w:any) => `• ${w.number} — ${w.commodity} (${w.zone}, ${titleCase(w.status)})`).join('\n')}\n\nOpen the Warehouse page to manage receipts, cargo items, and CFS operations.`
    };
  }

  // Inbound inbox / email
  if (/unread|inbox|incoming email|carrier email|new email|mail/i.test(q) && !/open rate|click/i.test(q)) {
    const inb = (data as any).inboundEmails || [];
    const unread = inb.filter((e:any) => !e.read).length;
    const byFolder: Record<string, number> = {};
    inb.forEach((e:any) => { byFolder[e.folder] = (byFolder[e.folder]||0)+1; });
    return {
      text: `📥 **Two-Way Inbox:**\n• Total messages: **${inb.length}**\n• Unread: **${unread}**\n• Carriers: ${byFolder.carrier||0} · Customs: ${byFolder.customs||0} · Customers: ${byFolder.customer||0} · Archived: ${byFolder.archived||0}\n\n${inb.filter((e:any)=>!e.read).slice(0,5).map((e:any) => `• ${e.fromName||e.from}: "${e.subject.slice(0,60)}"`).join('\n') || 'Inbox zero! 🎉'}\n\nOpen the Email Center → Inbox tab to read & reply. Incoming carrier notices, customs assessments, and customer inquiries are auto-classified.`
    };
  }

  // POD / Proof of delivery
  if (/pod|proof of delivery|signed|deliveries completed|pods/i.test(q)) {
    const pods = (data as any).pods || [];
    const goodCond = pods.filter((p:any) => p.condition === 'good').length;
    const damaged = pods.filter((p:any) => p.condition === 'damaged').length;
    const short = pods.filter((p:any) => p.condition === 'short').length;
    return {
      text: `✅ **Proof of Delivery (POD):**\n• Total PODs captured: **${pods.length}**\n• Good condition: ${goodCond}\n• Damaged: ${damaged}\n• Short-shipped: ${short}\n\n${pods.slice(0,5).map((p:any) => `• ${p.receiverName} signed ${p.piecesSigned} pcs — ${titleCase(p.condition)}`).join('\n')}\n\nDrivers capture PODs (signature, photo, condition) directly from the Driver Mobile App. Each POD auto-closes the linked trucking dispatch.`
    };
  }

  // Multi-leg routing
  if (/leg|routing|door.to.door|journey|multileg|multi-leg/i.test(q)) {
    const legs = (data as any).shipmentLegs || [];
    const inTransit = legs.filter((l:any) => l.status === 'in_transit').length;
    const completed = legs.filter((l:any) => l.status === 'completed').length;
    const byMode: Record<string, number> = {};
    legs.forEach((l:any) => { byMode[l.mode] = (byMode[l.mode]||0)+1; });
    return {
      text: `🛤️ **Multi-leg door-to-door routing:**\n• Total legs: **${legs.length}** across ${new Set(legs.map((l:any)=>l.shipmentId)).size} shipments\n• Legs in transit: ${inTransit}\n• Completed legs: ${completed}\n• By mode: ${Object.entries(byMode).map(([m,c]) => `${titleCase(m)}: ${c}`).join(', ')}\n\nOpen any shipment to see the full leg timeline, auto-built in one click (truck → sea/air → truck). Each leg has its own status, ETD/ETA, and carrier.`
    };
  }

  // Documents
  if (/document|dms|upload|attachment|paperwork/i.test(q)) {
    return {
      text: `📁 **Documents:** ${data.docs.length} files in DMS.\n\nCategories include Commercial Invoices, Packing Lists, B/L, AWB, CoO, Phytosanitary, Fumigation, Insurance, Customs Declarations, DGD, SDS, POD. Upload files from any shipment's Documents panel — or generate AWB/B/L/invoices/quotes as PDF with one click.`
    };
  }

  // Help
  if (/help|what can you|capabilities|features|how do i/.test(q)) {
    return {
      text: `I can answer questions about your freight operations. Try asking things like:\n\n• "What shipments are arriving this week?"\n• "Which customers owe us money?"\n• "Air vs sea breakdown?"\n• "What's stuck in customs?"\n• "Show pending quotes"\n• "Show carrier bookings / eBL status"\n• "Email open rate?"\n• "Container manifest summary?"\n• "HS code classification?"\n• "What's our gross margin / P&L?"\n• "Where are our trucks right now?"\n• "Show SAD / ASYCUDA declarations"\n• "Active trucking jobs?"\n• "Who is our top customer?"\n• "What's in the warehouse?"\n• "Any unread emails?"\n• "How many PODs today?"\n\nI can also help you navigate — just tell me where to go!`
    };
  }

  // Fallback
  return {
    text: `I'm not 100% sure how to answer that yet, but I can see ${data.shipments.length} shipments, ${data.customers.length} customers, and ${data.invoices.length} invoices in your database.\n\nTry asking about arrivals, revenue, customs status, trucking, quotes, or top customers. Or type **help** for a full list.`
  };
}

export default function AICopilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([INTRO]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    const userMsg: Msg = { role: 'user', text: q };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const data = db.getAll();
      const { text: resp } = analyze(q, data);
      setMessages((m) => [...m, { role: 'ai', text: resp }]);
      setTyping(false);
    }, 400 + Math.random() * 400);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/20 dark:bg-black/50" onClick={onClose} />
      <div className="fixed right-4 bottom-4 z-[95] w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-[kbdIn_0.2s_ease-out]">
        <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1">
                FreightFlow AI <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-bold uppercase tracking-wider ml-1">Beta</span>
              </div>
              <div className="text-[11px] text-white/70">Ask anything about your operations</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/40">
          {messages.length === 1 && (
            <div className="grid grid-cols-1 gap-2 mb-2">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-sm transition-all text-slate-700 dark:text-slate-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-sm'
                }`}
              >
                {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={idx}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={idx}>{part}</span>
                  )
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about shipments, revenue, customers…"
              className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <button type="submit" disabled={!input.trim()} className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-400 mt-1.5 text-center">AI responses are generated from your live FreightFlow data</div>
        </div>
      </div>
    </>
  );
}

export function CopilotFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ff-fab fixed bottom-20 md:bottom-6 right-4 md:right-[4.5rem] z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group ff-pop"
      title="FreightFlow AI (press /)"
      style={{ marginBottom: 'var(--safe-bottom)' }}
    >
      <Sparkles className="w-6 h-6 group-hover:scale-110 transition" />
      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 text-[10px] font-bold flex items-center justify-center text-emerald-900">AI</span>
    </button>
  );
}
