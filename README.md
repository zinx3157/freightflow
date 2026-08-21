<div align="center">

# 🚢 FreightFlow — The Modern Logistics OS

**Air & Sea freight forwarding · Customs clearance · Trucking & dispatch · WMS · Yard · Customer portal**

*The CargoWise alternative — orders of magnitude cheaper, faster, and more modern.*

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Status: Beta](https://img.shields.io/badge/status-BETA%207-orange)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## ✨ What is FreightFlow?

FreightFlow is a full operations platform for **freight forwarders and logistics operators** — designed specifically for Indian Ocean / African hubs (Madagascar, Mauritius, Reunion, East Africa) but usable anywhere. It covers the complete workflow a forwarder needs on day one:

| Workflow | Features |
|---|---|
| ✈️ **Air Freight** | MAWB/HAWB management, airline e-bookings, IATA-compliant AWB PDF generation |
| 🚢 **Sea Freight** | FCL/LCL, Bills of Lading, container manifests, multi-leg routing timeline |
| 🛃 **Customs** | HS code classifier, ASYCUDA SAD (UNeDocs XML export), 7-stage clearance stepper |
| 🚛 **Trucking** | Inland dispatch, live GPS tracking (animated map), driver POD mobile app |
| 📦 **Warehouse (WMS)** | Warehouse receipts, zone/stage flows, piece-level cargo tracking |
| 🧱 **Container Yard** | Visual yard grid (rows × slots), dwell-time alerts (>72h = red), move log |
| 📧 **Communications** | Two-way email inbox, automated document emails, customer↔agent chat |
| 🧾 **Finance** | Quotes, invoices, general ledger, revenue/cost per shipment |
| 👥 **CRM 360°** | Customer directory, activity timeline, portal access tokens |
| 📊 **Reports & BI** | Operational + financial dashboards, CO₂ (GLEC) emissions |
| 🌐 **Customer Portal** | Public tracking, document upload, chat, CO₂, EN/FR/MG languages |
| 🤖 **AI** | Rule-based copilot, AI spot-rate shopper across 15+ carriers |
| 🌓 **UX** | Dark mode, ⌘K command palette, keyboard shortcuts, Zen fullscreen, PWA manifest |
| 🌍 **i18n** | English / Français / Malagasy built-in |

Public pages:
- **`/get-quote`** — public quote-request form (no login)
- **`/tracking`** — public track & trace (no login)
- **`/portal`** — logged-in customer portal (token via `?t=`)
- **`/driver`** — mobile driver POD app (login as `driver`)

---

## 🆚 Why not CargoWise?

| | FreightFlow (Beta) | CargoWise |
|---|---|---|
| **Deployment** | Instant — open a browser, log in | 6–12 month implementation, $200K–$2M |
| **Pricing** | Free self-host / SaaS TBA (target <$50/user) | $9.95–$19.95/transaction + 25–40%/yr hikes |
| **UI** | Modern React + Tailwind, dark mode, ⌘K palette | Win32-style, no dark mode, no palette |
| **Portal** | Built-in, chat + docs + real-time tracking | Poor, requires custom modules |
| **Maps** | Native live shipment map | No native map (third-party integrations only) |
| **Documents** | One-click jsPDF generation | Crystal Reports (25-yr-old tech) |
| **i18n** | EN / FR / MG (more coming) | 30 languages (mature) |
| **Lock-in** | Open source, export your data anytime | Heavy lock-in, proprietary data formats |
| **AI** | Included (copilot, rate shopper) | Premium add-on |

See **`/benchmark`** in the app for the full side-by-side.

---

## 🚀 Quick start (local)

### Prerequisites
- **Node.js 20+**
- **npm 10+**

### One command
```bash
bash start.sh
```
This script will `npm install` if needed, kill any stale process on port 3000, then start Next.js on `http://0.0.0.0:3000`.

### Manual start
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export → /out (deploy to Vercel/Netlify/Cloudflare Pages/nginx)
```

### Logging in (demo accounts, localStorage auth)
| Role | Username | Password | Home page |
|---|---|---|---|
| Admin (full access) | `admin` | `admin` | Dashboard |
| Operations | `ops` | `ops` | Shipments |
| Sales | `sales` | `sales` | Quotes |
| Customs broker | `customs` | `customs` | Customs |
| Driver | `driver` | `driver` | Driver POD app |

> ⚠️ **Beta disclaimer:** Auth is **client-side only** (localStorage) for demo purposes. Do not deploy to production with real data without adding a real backend/auth (NextAuth/Auth.js, Supabase, etc.).

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette / universal search |
| `/` | Open AI Copilot |
| `⌘J` / `Ctrl+J` | Toggle dark / light mode |
| `⌘.` / `Ctrl+.` | Toggle Zen mode (hide chrome, full-screen content) |
| `⌘⇧F` / `Ctrl+Shift+F` | Browser full screen |
| `G` then `D` / `S` / `C` / `T` / `Q` / `I` / `B` | Quick navigation to Dashboard/Shipments/Customs/Trucking/Quotes/Invoices/Benchmark |
| `N` then `S` / `Q` / `I` / `T` | New Shipment / Quote / Invoice / Truck dispatch |
| `?` | Show shortcut help |

---

## 🏗️ Tech stack

- **Next.js 16** (App Router, Turbopack, static export `output: "export"`)
- **React 19**, **TypeScript 5**
- **Tailwind CSS v4** (custom brand color `#0f4c81`)
- **lucide-react** icons
- **jsPDF** for AWB/B/L/invoice/quote PDFs
- **localStorage** as the demo database (no backend — fully offline-capable static SPA)

> The static export means you can host FreightFlow on **any static hosting** (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3+CloudFront, nginx). No server required.

---

## 📁 Project structure

```
freight-saas/
├── public/manifest.json          # PWA manifest
├── src/
│   ├── app/                      # Next.js App Router pages (all static)
│   │   ├── page.tsx              # Dashboard
│   │   ├── shipments/            # Air + sea shipments (?id= for detail)
│   │   ├── trucking/             # Inland dispatch + GPS tracker
│   │   ├── customs/              # ASYCUDA SAD
│   │   ├── warehouse/            # WMS
│   │   ├── yard/                 # Container yard grid
│   │   ├── driver/               # Mobile driver POD app
│   │   ├── emails/               # Two-way inbox
│   │   ├── rates/                # Rate cards + AI rate shopper
│   │   ├── quotes/ invoices/ customers/ reports/
│   │   ├── portal/               # Customer portal (EN/FR/MG)
│   │   ├── tracking/ get-quote/ map/ benchmark/
│   │   ├── layout.tsx globals.css
│   ├── components/               # Reusable UI
│   │   ├── Sidebar.tsx Topbar.tsx CommandCenter.tsx AICopilot.tsx
│   │   ├── ShipmentDetail.tsx RoutingTimeline.tsx CustomsDeclaration.tsx
│   │   ├── GpsTracker.tsx CustomerCRM.tsx EmailCenter.tsx
│   │   ├── HSClassifier.tsx CarrierBooking.tsx ContainerManifest.tsx
│   │   ├── DangerousGoodsPanel.tsx DocumentsManager.tsx RateCalculator.tsx
│   │   ├── RateShopper.tsx Toast.tsx I18nProvider.tsx BetaBanner.tsx
│   │   ├── ThemeProvider.tsx AuthProvider.tsx LoginScreen.tsx
│   │   └── ui.tsx                # Button/Card/Modal/Table primitives
│   └── lib/
│       ├── store.ts              # LocalStorage DB (v7) — seed + CRUD
│       ├── auth.ts               # Role-based auth + permissions matrix
│       ├── i18n.ts               # EN/FR/MG dictionaries
│       ├── types.ts utils.ts documents.ts dgr.ts hsCodes.ts
│       ├── useQueryParams.ts useRealtimeData.ts
├── start.sh                      # One-command dev launcher
├── next.config.ts package.json tsconfig.json tailwind.config.*
└── README.md
```

---

## 🧭 Roadmap (next batches)

- [ ] Real backend (Postgres / Supabase or similar)
- [ ] NextAuth / SSO (Microsoft, Google)
- [ ] Service worker + true PWA offline support
- [ ] OOBO / Madagascar **fiscal e-invoicing** integration
- [ ] CSV / Excel / PDF export across all reports
- [ ] Drag-and-drop yard slot reassignments
- [ ] Real carrier APIs (INTTRA/CargoX/Descartes), real GPS telematics
- [ ] Real ASYCUDA EDI endpoint
- [ ] S3 / object storage for documents DMS
- [ ] Document approval chains + expiry alerts
- [ ] Quote → Shipment conversion wizard
- [ ] Mapbox/Leaflet live map (real roads/ports/airports)
- [ ] LLM-powered copilot (currently rule-based)

---

## 🤝 Contributing

Beta feedback welcome. Open issues for bugs / feature requests. PRs welcome once we add a contributing guide.

---

## 📜 License

MIT — use it, fork it, build your business on it. Just don't sue us.

---

<div align="center">

**Built in Antananarivo 🇲🇬 for Indian Ocean & African freight forwarders.**

*FreightFlow BETA 7 — July 2026*

</div>
