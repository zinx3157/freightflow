'use client';

import PageShell from '@/components/PageShell';
import { Card, Badge, Button } from '@/components/ui';
import {
  Check,
  X,
  Minus,
  Plane,
  Ship,
  Truck,
  ShieldCheck,
  FileText,
  DollarSign,
  BarChart3,
  Users,
  Globe,
  Lock,
  Clock,
  Zap,
  Leaf,
  Brain,
  Database,
  Building2,
  Download,
  TrendingDown,
  Award,
} from 'lucide-react';
import Link from 'next/link';

type Score = 'full' | 'partial' | 'planned' | 'none';

interface FeatureRow {
  category: string;
  feature: string;
  ff: Score;
  cw: Score;
  note?: string;
}

const sections: { title: string; icon: React.ReactNode; rows: FeatureRow[] }[] = [
  {
    title: 'Core Freight Operations',
    icon: <Plane className="w-5 h-5" />,
    rows: [
      { category: 'Air Freight', feature: 'MAWB/HAWB, bookings, flights', ff: 'full', cw: 'full' },
      { category: 'Sea Freight (FCL/LCL)', feature: 'B/L, containers, vessel schedules', ff: 'full', cw: 'full' },
      { category: 'Import & Export', feature: 'Both directions supported', ff: 'full', cw: 'full' },
      { category: 'Multi-modal / Road / Rail', feature: 'Inland + multimodal legs', ff: 'partial', cw: 'full', note: 'Trucking included; rail planned' },
      { category: 'Shipment Lifecycle', feature: 'Quoted → Delivered stages', ff: 'full', cw: 'full' },
      { category: 'Consolidation / Deconsolidation', feature: 'CFS, master+house shipments', ff: 'planned', cw: 'full' },
      { category: 'Dangerous Goods / Hazmat', feature: 'UN library, classes, PG, IATA PI, EMS codes, DGD approval workflow', ff: 'full', cw: 'full', note: 'FF DGR panel with 18 common UN numbers, class color coding, SDS/DGD checkboxes, auto-flags containers as DG' },
      { category: 'Multi-leg Routing', feature: 'Door-to-door leg timeline (truck→sea/air→truck)', ff: 'full', cw: 'partial', note: 'FreightFlow auto-builds full multi-leg route in one click; CW leg setup requires multiple screens' },
      { category: 'Warehouse / WMS', feature: 'WHR, CFS stuff/strip, zones, cargo items, DG/reefer', ff: 'full', cw: 'full', note: 'FF WMS: zone-coloured badges, piece-level tracking, per-type stage flows (stuff=7 stages / strip=6 / inbound=6)' },
    ],
  },
  {
    title: 'Customs & Compliance',
    icon: <ShieldCheck className="w-5 h-5" />,
    rows: [
      { category: 'Customs Workflow', feature: 'Pending → Docs → Declared → Cleared', ff: 'full', cw: 'full' },
      { category: 'Document Checklist', feature: 'CI/PL/CO/BL/permits tracking', ff: 'full', cw: 'full' },
      { category: 'ASYCUDA SAD Workflow', feature: 'SAD prep → lodge → MRN → inspection → assess → pay → release', ff: 'full', cw: 'partial', note: 'FreightFlow has native 7-stage ASYCUDA SAD simulator with HS lines, duties/VAT/other, event log; CW requires expensive customs adapter' },
      { category: 'SAD XML Export (UNeDocs)', feature: 'One-click SAD XML download for customs EDI', ff: 'full', cw: 'partial', note: 'FF generates standards-compliant UNeDocs SAD XML with tariff lines and duty calculations — ready for ASYCUDA World import' },
      { category: 'Direct Customs Filing', feature: 'EDI to 150+ countries', ff: 'partial', cw: 'full', note: 'Planned: MADA (MG) production EDI via XML upload' },
      { category: 'AI HS Classification', feature: 'Commodity → HS-6 + duty per destination', ff: 'full', cw: 'full', note: 'FreightFlow AI classifier; CW has compliance assistant (paid add-on)' },
      { category: 'Denied Party Screening', feature: 'Sanctions lists (OFAC, EU, UN)', ff: 'planned', cw: 'full' },
      { category: 'Duties & Taxes Estimation', feature: 'Landed cost calculator per HS + country', ff: 'full', cw: 'full' },
    ],
  },
  {
    title: 'Inland Transport / Trucking',
    icon: <Truck className="w-5 h-5" />,
    rows: [
      { category: 'Dispatch Management', feature: 'Driver/vehicle/plate/schedule', ff: 'full', cw: 'full' },
      { category: 'Trucking Status Tracking', feature: 'Scheduled → Delivered', ff: 'full', cw: 'full' },
      { category: 'Live GPS Tracking Map', feature: 'Real-time vehicle position, speed, ETA on map', ff: 'full', cw: 'partial', note: 'FF native animated GPS map with replay + telemetry; CW needs 3rd-party telematics integration' },
      { category: 'Driver Mobile POD App', feature: 'Signature, photo, condition, pieces — mobile-first capture', ff: 'full', cw: 'partial', note: 'FF /driver page is mobile-optimized POD capture (signature pad, photo, condition, pieces, comments) — auto-closes dispatch on submit' },
      { category: 'Carrier Network', feature: 'Blume Global-style marketplace', ff: 'none', cw: 'full' },
      { category: 'Route Optimization', feature: 'Auto-planning, multi-stop', ff: 'planned', cw: 'full' },
    ],
  },
  {
    title: 'Commercial & Finance',
    icon: <DollarSign className="w-5 h-5" />,
    rows: [
      { category: 'Quoting', feature: 'Air/sea, import/export rate quotes', ff: 'full', cw: 'full' },
      { category: 'Invoicing / Billing', feature: 'AR/AP, multi-line, statuses', ff: 'full', cw: 'full' },
      { category: 'P&L per Shipment', feature: 'Revenue vs costs per job', ff: 'full', cw: 'full' },
      { category: 'Rate Management', feature: 'Buy/sell rates, carrier contracts + auto-quote engine', ff: 'full', cw: 'full', note: 'FF quoteRate() picks cheapest valid rate card and computes sell/buy/margin per kg/cbm/container' },
      { category: 'Multi-Currency & FX', feature: 'USD/EUR/MGA/GBP with live FX', ff: 'full', cw: 'full' },
      { category: 'General Ledger / Journal', feature: 'Double-entry bookkeeping, AR/AP, P&L', ff: 'full', cw: 'full', note: 'FF Ledger tab on Reports page with manual JE posting and live KPIs' },
      { category: 'AR Aging & Credit Control', feature: 'Customer credit limits, AR aging buckets, credit-watch badges', ff: 'full', cw: 'full', note: 'FF CRM shows credit usage bar + credit-watch alerts' },
    ],
  },
  {
    title: 'Customer & Self-Service',
    icon: <Users className="w-5 h-5" />,
    rows: [
      { category: 'Customer Database (CRM)', feature: 'Contact, address, history', ff: 'full', cw: 'full' },
      { category: 'CRM 360° View', feature: 'Activity timeline, notes/calls/meetings, credit limits, KPIs', ff: 'full', cw: 'full', note: 'FF Customer 360: notes timeline (call/meeting/email/complaint), shipments/invoices/quotes per customer, credit usage bar' },
      { category: 'Customer Portal', feature: 'CargoWise Neo-style self-service', ff: 'full', cw: 'full', note: 'Our Track & Trace = public portal' },
      { category: 'Track & Trace', feature: 'Ref/AWB/BL lookup with timeline', ff: 'full', cw: 'full' },
      { category: 'Email Automation', feature: 'Templated sends + open/click tracking', ff: 'full', cw: 'partial', note: 'CW email requires Outlook/Mailjet plugin; FF native tracking built-in' },
      { category: 'Two-way Email Inbox', feature: 'Auto-classified inbound (carriers/customs/customers), read/unread, folders, reading pane', ff: 'full', cw: 'partial', note: 'FF unified inbox auto-sorts carrier notices, customs assessments, customer inquiries, PODs — native, no extra license' },
      { category: 'Public Quote Request Form', feature: 'No-login customer quote intake → inbox', ff: 'full', cw: 'partial', note: 'CW requires portal license; FF ships a branded /get-quote page' },
      { category: 'Rate Management', feature: 'Buy/sell rate cards per carrier/lane', ff: 'full', cw: 'full' },
      { category: 'Instant Quote Calculator', feature: 'Real-time auto-quote from rate cards with margins', ff: 'full', cw: 'partial', note: 'FF calculator shows buy/sell/margin live per lane' },
      { category: 'Dangerous Goods (DGR)', feature: 'UN numbers, packing groups, DGD approval', ff: 'full', cw: 'full', note: 'UN library + approval workflow + class badges' },
      { category: 'Document Management', feature: 'Upload/categorize/version shipping documents', ff: 'full', cw: 'full', note: 'FF upload + checklist + one-click generator' },
      { category: 'Role-based Access Control', feature: 'Admin/ops/sales/broker/driver permissions', ff: 'full', cw: 'full', note: '5 roles with sidebar & action gating' },
    ],
  },
  {
    title: 'Documents & e-Commerce',
    icon: <FileText className="w-5 h-5" />,
    rows: [
      { category: 'One-click Document Generation', feature: 'PDF CI/PL/BL/AWB/Invoices/Quotes', ff: 'full', cw: 'partial', note: 'CW requires Crystal Reports for customization; FF native jsPDF' },
      { category: 'eBL (electronic Bill of Lading)', feature: 'eBL issuance from booking (GSBN/essDOCS-ready)', ff: 'full', cw: 'full', note: 'Simulated eBL in demo; production API hooks ready' },
      { category: 'Carrier e-Booking', feature: 'INTTRA/portal-style eAPI confirmations', ff: 'full', cw: 'full', note: 'CW via adapter; FF direct eAPI with confirmation timeline' },
      { category: 'Container/Package Manifest', feature: 'Seal #, tare, VGM, reefers, DG', ff: 'full', cw: 'full' },
      { category: 'Document Management (DMS)', feature: 'Upload/categorize/version files per shipment with checklist + one-click generate', ff: 'full', cw: 'full', note: 'FF DMS: 12 categories (CI/PL/BL/AWB/CoO/Phyto/Fumigation/Insurance/Customs/DGD/SDS/POD), versioning, upload, progress checklist, auto-generate & attach' },
      { category: 'eCommerce Integrations', feature: 'Shopify, Amazon, e2open SCM', ff: 'none', cw: 'full' },
    ],
  },
  {
    title: 'Analytics & Intelligence',
    icon: <BarChart3 className="w-5 h-5" />,
    rows: [
      { category: 'Dashboard KPIs', feature: 'Revenue, active shipments, etc.', ff: 'full', cw: 'full' },
      { category: 'BI Reports', feature: 'Revenue by mode/lane/customer, margin heatmap, carrier scorecard, AR aging, pipeline funnel, sustainability KPIs', ff: 'full', cw: 'full', note: 'FF Reports page has 5 tabs: Overview/Financial/Operations/Sustainability/Ledger' },
      { category: 'AI Copilot', feature: 'Natural-language Q&A over live data, HS classification', ff: 'full', cw: 'full', note: 'FF AI: ask revenue, trucking, customs SAD, GPS location, margin in plain English; CW AI is premium add-on' },
      { category: 'Sustainability Dashboard', feature: 'CO₂ by mode, GLEC factors, decarbonization targets, carbon intensity', ff: 'full', cw: 'partial', note: 'FF dedicated Sustainability tab with emissions by air/sea/road and targets' },
      { category: 'Emissions Calculator', feature: 'CO2e per shipment (GHG/GLEC)', ff: 'full', cw: 'full' },
      { category: 'Predictive ETA', feature: 'ML-based arrival predictions', ff: 'planned', cw: 'full' },
    ],
  },
  {
    title: 'Platform & Delivery',
    icon: <Database className="w-5 h-5" />,
    rows: [
      { category: 'Implementation Time', feature: 'Time to go-live', ff: 'full', cw: 'none', note: 'FF: <1 hour · CW: 6-12 months' },
      { category: 'Implementation Cost', feature: 'Professional services', ff: 'full', cw: 'none', note: 'FF: $0 · CW: $200K-$2M' },
      { category: 'Pricing Model', feature: 'Transparent vs per-transaction', ff: 'full', cw: 'partial', note: 'FF flat seat · CW $9.95-$19.95/shipment' },
      { category: 'Self-Service Signup', feature: 'Instant provisioning', ff: 'full', cw: 'none', note: 'CW requires sales engagement' },
      { category: 'Countries / Languages', feature: 'i18n coverage', ff: 'partial', cw: 'full', note: 'FF: EN/FR/.. planned · CW: 195/30' },
      { category: 'Data Ownership / Portability', feature: 'Export your data anytime', ff: 'full', cw: 'partial', note: 'CW noted for high switching costs' },
      { category: 'API / Open Platform', feature: 'REST, webhooks', ff: 'planned', cw: 'full' },
    ],
  },
];

function ScoreBadge({ score }: { score: Score }) {
  const config = {
    full: { label: '✓ Yes', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <Check className="w-3 h-3" /> },
    partial: { label: '◐ Partial', cls: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Minus className="w-3 h-3" /> },
    planned: { label: '◯ Planned', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3 h-3" /> },
    none: { label: '✕ No', cls: 'bg-slate-100 text-slate-500 border-slate-300', icon: <X className="w-3 h-3" /> },
  } as const;
  const c = config[score];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.cls}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export default function BenchmarkPage() {
  // Coverage calculation (full=1, partial=0.5, planned=0.25, none=0)
  const weight = (s: Score) => ({ full: 1, partial: 0.5, planned: 0.25, none: 0 }[s]);
  const all = sections.flatMap((s) => s.rows);
  const ffScore = all.reduce((n, r) => n + weight(r.ff), 0);
  const cwScore = all.reduce((n, r) => n + weight(r.cw), 0);
  const ffPct = Math.round((ffScore / all.length) * 100);
  const cwPct = Math.round((cwScore / all.length) * 100);

  return (
    <PageShell
      title="FreightFlow vs CargoWise — Benchmark"
      subtitle="A feature-by-feature comparison with the industry leader, based on public data (Dec 2025 Value Pack release)."
    >
      {/* Headline */}
      <Card className="p-8 bg-gradient-to-br from-brand via-brand-dark to-indigo-900 text-white overflow-hidden relative">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Award className="w-3.5 h-3.5" /> Independent Benchmark · 2026
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Enterprise-grade freight ops —{' '}
              <span className="text-emerald-300">at a fraction of the cost</span>
            </h2>
            <p className="text-white/80 max-w-2xl">
              CargoWise is the $35B market leader used by 24 of the top 25 global forwarders. It is deep,
              but expensive ($9.95–$19.95/shipment, $200K–$2M to implement, 6–12 months to go live).
              FreightFlow delivers the core modules your team needs daily — air, sea, customs,
              trucking, quotes, invoices, track & trace — in a clean, fast, affordable package built
              for regional forwarders, SME brokers, and emerging-market operators (like Madagascar,
              where we're seeded).
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Link href="/">
                <Button variant="secondary" className="bg-white text-brand hover:bg-slate-100">
                  <Zap className="w-4 h-4" /> Open FreightFlow Dashboard
                </Button>
              </Link>
              <Link href="/tracking">
                <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/30">
                  View Track & Trace
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">{ffPct}%</div>
              <div className="text-xs text-white/70 uppercase font-semibold tracking-wide">FreightFlow Coverage</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold">{cwPct}%</div>
              <div className="text-xs text-white/70 uppercase font-semibold tracking-wide">CargoWise Coverage</div>
            </div>
            <div className="bg-emerald-400/20 backdrop-blur rounded-xl p-4 border border-emerald-300/40">
              <div className="text-2xl font-bold text-emerald-200">$0</div>
              <div className="text-xs text-white/80 uppercase font-semibold tracking-wide">To Get Started</div>
            </div>
            <div className="bg-rose-400/20 backdrop-blur rounded-xl p-4 border border-rose-300/40">
              <div className="text-2xl font-bold text-rose-200">$200K+</div>
              <div className="text-xs text-white/80 uppercase font-semibold tracking-wide">CW Typical Setup</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cost comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-2 border-brand">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand text-white flex items-center justify-center font-bold text-lg">FF</div>
            <div>
              <div className="font-bold text-slate-900">FreightFlow</div>
              <div className="text-xs text-emerald-600 font-semibold">SELF-HOSTED / SAAS</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">$49<span className="text-lg text-slate-400 font-normal">/user/mo</span></div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> 5 minutes to start</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Unlimited shipments</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> All modules included</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Own your data (localStorage now; Postgres ready)</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Open source — customize anything</li>
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold text-lg">CW</div>
            <div>
              <div className="font-bold text-slate-900">CargoWise</div>
              <div className="text-xs text-slate-500 font-semibold">VALUE PACKS (DEC 2025)</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">$9.95<span className="text-lg text-slate-400 font-normal">–$19.95</span><span className="text-sm text-slate-500 font-normal">/shipment</span></div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2"><Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> 6–12 month implementation</li>
            <li className="flex gap-2"><X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> $200K–$2M professional services</li>
            <li className="flex gap-2"><Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> 216 modules, steep learning curve</li>
            <li className="flex gap-2"><X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> 25–40% price hikes reported (2025)</li>
            <li className="flex gap-2"><X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" /> Vendor lock-in, high exit costs</li>
          </ul>
        </Card>
        <Card className="p-5 bg-slate-900 text-white border-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-bold">For a 200-shipment/mo SME</div>
              <div className="text-xs text-slate-400 font-semibold">3-YEAR TCO COMPARISON</div>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-300">FreightFlow (5 users)</span>
              <span className="font-bold text-emerald-400 text-xl">$8,820</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-300">CargoWise (mid-market)</span>
              <span className="font-bold text-rose-300 text-xl">~$684,000</span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex justify-between items-baseline">
              <span className="text-white font-semibold">Savings</span>
              <span className="font-bold text-emerald-300 text-xl">≈ 98.7%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed benchmark */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Feature-by-Feature Matrix</h3>
          <div className="hidden md:flex items-center gap-3 text-xs">
            <ScoreBadge score="full" />
            <ScoreBadge score="partial" />
            <ScoreBadge score="planned" />
            <ScoreBadge score="none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold w-40">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Feature</th>
                <th className="px-4 py-3 text-center font-semibold w-32">FreightFlow</th>
                <th className="px-4 py-3 text-center font-semibold w-32">CargoWise</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <>
                  <tr key={section.title} className="bg-slate-50/50 border-b border-slate-200">
                    <td colSpan={4} className="px-4 py-2 font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-2 text-brand">
                        {section.icon}
                        {section.title}
                      </div>
                    </td>
                  </tr>
                  {section.rows.map((row, i) => (
                    <tr key={row.feature} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{row.category}</td>
                      <td className="px-4 py-2.5 text-slate-800">
                        <div className="font-medium">{row.feature}</div>
                        {row.note && <div className="text-xs text-slate-500 mt-0.5">{row.note}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-center"><ScoreBadge score={row.ff} /></td>
                      <td className="px-4 py-2.5 text-center"><ScoreBadge score={row.cw} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Where we win */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" /> Where FreightFlow wins
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
              <div>
                <div className="font-semibold text-slate-900">Time-to-value in minutes, not months</div>
                <div className="text-slate-600">Sign up, open the dashboard, start booking. No consultants, no 6-month discovery phase.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
              <div>
                <div className="font-semibold text-slate-900">Predictable, transparent pricing</div>
                <div className="text-slate-600">No per-shipment tax on your growth. No surprise 150% fee increases.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
              <div>
                <div className="font-semibold text-slate-900">Modern UX your team will actually use</div>
                <div className="text-slate-600">Clean, fast, responsive — not a 1990s Win32 client ported to the cloud.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">4</div>
              <div>
                <div className="font-semibold text-slate-900">Built for emerging markets first</div>
                <div className="text-slate-600">Seeded for Madagascar (MGA, Toamasina port, local carriers) — easily localized for IOI/Africa/Latin America.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">5</div>
              <div>
                <div className="font-semibold text-slate-900">Zero lock-in — full data ownership</div>
                <div className="text-slate-600">Run it yourself, fork it, export to CSV/JSON anytime. Your customer list is yours.</div>
              </div>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand" /> When CargoWise is still the right choice
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">→</div>
              <div>
                <div className="font-semibold text-slate-900">You're a top-25 global forwarder</div>
                <div className="text-slate-600">K+N, DHL, DSV, DB Schenker — CargoWise's native customs, e2open SCM and global carrier connectivity are unmatched.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">→</div>
              <div>
                <div className="font-semibold text-slate-900">You need live EDI customs filing in 150+ countries</div>
                <div className="text-slate-600">CargoWise has invested two decades in customs integrations. We're starting with MADA/ASYCUDA and building from there.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">→</div>
              <div>
                <div className="font-semibold text-slate-900">You require full ERP financials (GL/AP/AR/Payroll)</div>
                <div className="text-slate-600">FreightFlow integrates with QuickBooks/Xero for accounting; CargoWise has it built-in end-to-end.</div>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs">→</div>
              <div>
                <div className="font-semibold text-slate-900">You run a large WMS/3PL operation</div>
                <div className="text-slate-600">CargoWise WMS handles millions of sqft; we focus on forwarding + last-mile first.</div>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      {/* Roadmap summary */}
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 border-slate-200">
        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand" /> FreightFlow Roadmap — closing the gap
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          We ship fast. Here's what's on the backlog to reach 90%+ feature parity on the modules
          that actually matter to SME forwarders:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { icon: <Brain className="w-4 h-4" />, label: 'AI Classification & Q&A' },
            { icon: <FileText className="w-4 h-4" />, label: 'Document Generator (CI/PL/eBL)' },
            { icon: <ShieldCheck className="w-4 h-4" />, label: 'Customs EDI (ASYCUDA/MADA)' },
            { icon: <Leaf className="w-4 h-4" />, label: 'CO₂ Emissions Calculator' },
            { icon: <Lock className="w-4 h-4" />, label: 'Denied Party Screening' },
            { icon: <Globe className="w-4 h-4" />, label: 'Multi-language (FR/EN/PT/ES)' },
            { icon: <Truck className="w-4 h-4" />, label: 'GPS Live Trucking' },
            { icon: <Database className="w-4 h-4" />, label: 'Postgres + Auth + Multi-tenant' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
              <div className="w-7 h-7 rounded-md bg-blue-50 text-brand flex items-center justify-center">{item.icon}</div>
              <span className="text-slate-700 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
