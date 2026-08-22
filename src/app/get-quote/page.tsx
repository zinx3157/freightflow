'use client';

import { useState } from 'react';
import { db } from '@/lib/store';
import { Card, Button, Input, Select, Field, Badge } from '@/components/ui';
import { Ship, Plane, Truck, CheckCircle2, Quote, Shield, Clock, Award, Mail, Phone } from 'lucide-react';
import PortAutocomplete from '@/components/PortAutocomplete';

// Public quote request page — no auth, no sidebar. Linked from footer of tracking page.
export default function GetQuotePage() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    mode: 'sea' as 'air' | 'sea' | 'road',
    direction: 'import' as 'import' | 'export',
    origin: '',
    destination: '',
    weight: 0,
    volume: 0,
    pieces: 1,
    commodity: '',
    incoterm: 'CIF',
    readyDate: '',
    notes: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qr = db.addQuoteRequest(form);
    setSubmitted(qr.token);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand via-brand-dark to-indigo-900 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quote request received!</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">We've received your quote request. One of our freight specialists will respond within 4 business hours with a detailed offer.</p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300 mb-6">
            Reference: <span className="font-bold">{submitted.toUpperCase()}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setSubmitted(null)}>Submit another</Button>
            <a href="/tracking"><Button variant="outline">Track a shipment</Button></a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-indigo-600 text-white flex items-center justify-center">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-lg">FreightFlow</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">Logistics OS</div>
            </div>
          </div>
          <a href="/tracking" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-brand">Track shipment →</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Badge color="blue" className="mb-3">Get a quote in minutes</Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-3">
                Air, sea & road freight, priced in <span className="text-brand">real time</span>.
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Tell us about your cargo. Our team will reply with a competitive all-in rate within 4 business hours. No hidden fees.
              </p>
            </div>

            <div className="space-y-3">
              <Trust icon={<Plane className="w-5 h-5" />} title="Air freight" desc="Express & economy options with MAWB/HAWB" />
              <Trust icon={<Ship className="w-5 h-5" />} title="Sea freight FCL/LCL" desc="Maersk / MSC / CMA CGM with eBL capability" />
              <Trust icon={<Truck className="w-5 h-5" />} title="Inland & customs" desc="Door-to-door from Toamasina / Ivato to Africa, EU & Asia" />
              <Trust icon={<Shield className="w-5 h-5" />} title="Customs brokerage" desc="ASYCUDA clearance, HS classification & permits handled" />
              <Trust icon={<Clock className="w-5 h-5" />} title="Fast response" desc="Quotes within 4 business hours — CargoWise competitors take days" />
              <Trust icon={<Award className="w-5 h-5" />} title="98.7% cheaper TCO" desc="vs CargoWise-reliant forwarders, same enterprise capability" />
            </div>

            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Talk to a human</div>
              <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> quotes@freightflow.mg</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> +261 20 22 123 45</div>
                <div className="text-xs text-slate-500 mt-2">Antananarivo · Toamasina · Port Louis</div>
              </div>
            </div>
          </div>

          <Card className="lg:col-span-3 p-6 shadow-xl">
            <form onSubmit={submit} className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request your quote</h2>

              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">1. Contact info</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Full name *"><Input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="e.g. Rado Andriamihaja" /></Field>
                  <Field label="Company"><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company" /></Field>
                  <Field label="Email *"><Input required type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="you@company.com" /></Field>
                  <Field label="Phone"><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="+261 ..." /></Field>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">2. Shipment details</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <Field label="Mode">
                    <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as any })}>
                      <option value="sea">🚢 Sea</option>
                      <option value="air">✈️ Air</option>
                      <option value="road">🚛 Road</option>
                    </Select>
                  </Field>
                  <Field label="Direction">
                    <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as any })}>
                      <option value="export">Export ex MG</option>
                      <option value="import">Import to MG</option>
                    </Select>
                  </Field>
                  <Field label="Incoterm">
                    <Select value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value })}>
                      {['EXW','FOB','CFR','CIF','DAP','DDP'].map((i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Ready date">
                    <Input type="date" value={form.readyDate} onChange={(e) => setForm({ ...form, readyDate: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <PortAutocomplete label="Origin (city/port)" required value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} mode={form.mode === 'road' ? undefined : form.mode} placeholder="e.g. Toamasina" />
                  <PortAutocomplete label="Destination (city/port)" required value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} mode={form.mode === 'road' ? undefined : form.mode} placeholder="e.g. Hamburg" />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Field label="Weight (kg)"><Input type="number" value={form.weight || ''} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} placeholder="10000" /></Field>
                  <Field label="Volume (CBM)"><Input type="number" step="0.1" value={form.volume || ''} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} placeholder="25" /></Field>
                  <Field label="Pieces"><Input type="number" value={form.pieces || ''} onChange={(e) => setForm({ ...form, pieces: Number(e.target.value) })} placeholder="100" /></Field>
                </div>
                <Field label="Commodity *"><Input required value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder="e.g. Vanilla beans, electronics, textiles" /></Field>
              </div>

              <div>
                <Field label="Additional notes">
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Special handling, insurance, pickup address, DG status..." className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100" />
                </Field>
              </div>

              <Button size="lg" className="w-full" type="submit"><Quote className="w-4 h-4" /> Request my quote</Button>
              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                By submitting, you agree to be contacted by our sales team. No spam, ever.
              </p>
            </form>
          </Card>
        </div>

        <footer className="mt-10 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FreightFlow · Antananarivo, Madagascar · Built for Indian Ocean & African trade lanes
        </footer>
      </div>
    </div>
  );
}

function Trust({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
      <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{desc}</div>
      </div>
    </div>
  );
}
