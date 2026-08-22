'use client';
import { useEffect, useState } from 'react';
import { X, Building2, Bell, Wifi, WifiOff, Cloud, Save, Plus, Trash2, Check } from 'lucide-react';
import { Button, Input, Select, Field } from './ui';
import { getSyncConfig, saveSyncConfig, subscribePush, unsubscribePush, connectRealtime, type SyncConfig } from '@/lib/realtime';
import type { Company, Branch } from '@/lib/types';

const COMPANY_KEY = 'ff_companies_v1';
const ACTIVE_COMPANY_KEY = 'ff_active_company';
const ACTIVE_BRANCH_KEY = 'ff_active_branch';

export function loadCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed default company (FreightFlow HQ Madagascar)
  const defaultCo: Company = {
    id: 'co_default',
    legalName: 'FreightFlow Logistics SARL',
    shortName: 'FreightFlow',
    nif: '2001234567',
    stat: '85240/11101/000123',
    iataCode: 'TNR-024-9',
    fiataMemberId: 'MG-FL-0017',
    logoColor: '#0f4c81',
    branches: [
      { id: 'br_tnr', companyId: 'co_default', name: 'Antananarivo HQ', city: 'Antananarivo', country: 'Madagascar', address: 'Lot II M 86 Bis, Antananarivo 101', phone: '+261 20 22 123 45', nif: '2001234567', stat: '85240/11101/000123', iataCode: 'TNR-024-9' },
      { id: 'br_toa', companyId: 'co_default', name: 'Toamasina Port Office', city: 'Toamasina', country: 'Madagascar', address: 'Boulevard Joffre, Toamasina 501', phone: '+261 20 53 321 00', nif: '2001234567', stat: '85240/11101/000124' },
    ],
  };
  localStorage.setItem(COMPANY_KEY, JSON.stringify([defaultCo]));
  if (!localStorage.getItem(ACTIVE_COMPANY_KEY)) localStorage.setItem(ACTIVE_COMPANY_KEY, defaultCo.id);
  if (!localStorage.getItem(ACTIVE_BRANCH_KEY)) localStorage.setItem(ACTIVE_BRANCH_KEY, defaultCo.branches[0].id);
  return [defaultCo];
}

export function getActiveCompany(): Company | null {
  const cos = loadCompanies();
  const id = localStorage.getItem(ACTIVE_COMPANY_KEY);
  return cos.find(c => c.id === id) || cos[0] || null;
}
export function getActiveBranch(): Branch | null {
  const co = getActiveCompany();
  if (!co) return null;
  const id = localStorage.getItem(ACTIVE_BRANCH_KEY);
  return co.branches.find(b => b.id === id) || co.branches[0] || null;
}

interface Props { open: boolean; onClose: () => void; }

type Tab = 'company' | 'sync' | 'push' | 'about';

export default function SettingsPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('company');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCoId, setActiveCoId] = useState<string>('');
  const [activeBrId, setActiveBrId] = useState<string>('');
  const [cfg, setCfg] = useState<SyncConfig>(getSyncConfig());
  const [pushStatus, setPushStatus] = useState<string>('idle');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const cos = loadCompanies();
    setCompanies(cos);
    setActiveCoId(localStorage.getItem(ACTIVE_COMPANY_KEY) || cos[0]?.id || '');
    setActiveBrId(localStorage.getItem(ACTIVE_BRANCH_KEY) || cos[0]?.branches[0]?.id || '');
    setCfg(getSyncConfig());
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async reg => {
        const sub = await reg.pushManager.getSubscription();
        setPushStatus(sub ? 'subscribed' : 'unsubscribed');
      }).catch(() => setPushStatus('unsupported'));
    } else {
      setPushStatus('unsupported');
    }
  }, [open]);

  const activeCo = companies.find(c => c.id === activeCoId);
  const activeBr = activeCo?.branches.find(b => b.id === activeBrId);

  function saveAll() {
    localStorage.setItem(COMPANY_KEY, JSON.stringify(companies));
    localStorage.setItem(ACTIVE_COMPANY_KEY, activeCoId);
    localStorage.setItem(ACTIVE_BRANCH_KEY, activeBrId);
    saveSyncConfig(cfg);
    connectRealtime(cfg);
    setSaved(true);
    window.dispatchEvent(new CustomEvent('ff:company-changed'));
    setTimeout(() => setSaved(false), 1500);
    setTimeout(onClose, 800);
  }

  function addCompany() {
    const n: Company = { id: 'co_' + Math.random().toString(36).slice(2, 8), legalName: 'New Company', shortName: 'NewCo', branches: [{ id: 'br_' + Math.random().toString(36).slice(2, 8), companyId: '', name: 'Main Branch', city: 'Antananarivo', country: 'Madagascar' }] };
    n.branches[0].companyId = n.id;
    setCompanies([...companies, n]);
    setActiveCoId(n.id); setActiveBrId(n.branches[0].id);
  }
  function addBranch() {
    if (!activeCo) return;
    const nb: Branch = { id: 'br_' + Math.random().toString(36).slice(2, 8), companyId: activeCo.id, name: 'New Branch', city: '', country: 'Madagascar' };
    setCompanies(companies.map(c => c.id === activeCo.id ? { ...c, branches: [...c.branches, nb] } : c));
    setActiveBrId(nb.id);
  }
  function updateCo(patch: Partial<Company>) {
    setCompanies(companies.map(c => c.id === activeCoId ? { ...c, ...patch } : c));
  }
  function updateBr(patch: Partial<Branch>) {
    if (!activeCo) return;
    setCompanies(companies.map(c => c.id === activeCo.id ? { ...c, branches: c.branches.map(b => b.id === activeBrId ? { ...b, ...patch } : b) } : c));
  }
  function delBranch() {
    if (!activeCo || activeCo.branches.length <= 1) return;
    if (!confirm('Delete this branch?')) return;
    const remaining = activeCo.branches.filter(b => b.id !== activeBrId);
    setCompanies(companies.map(c => c.id === activeCo.id ? { ...c, branches: remaining } : c));
    setActiveBrId(remaining[0].id);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-900 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ff-fade-up">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'company', label: 'Company', icon: Building2 },
            { id: 'sync', label: 'Realtime Sync', icon: Cloud },
            { id: 'push', label: 'Push Notifications', icon: Bell },
            { id: 'about', label: 'About', icon: Wifi },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)} className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-800 dark:text-slate-200">
          {tab === 'company' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-sm font-semibold">Company:</label>
                <Select value={activeCoId} onChange={(e) => { setActiveCoId(e.target.value); const c = companies.find(cc => cc.id === e.target.value); setActiveBrId(c?.branches[0]?.id || ''); }}>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.legalName}</option>)}
                </Select>
                <Button size="sm" variant="outline" onClick={addCompany}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </div>
              {activeCo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Legal Name"><Input value={activeCo.legalName} onChange={(e) => updateCo({ legalName: e.target.value })} /></Field>
                  <Field label="Short Name"><Input value={activeCo.shortName} onChange={(e) => updateCo({ shortName: e.target.value })} /></Field>
                  <Field label="NIF (Madagascar)"><Input value={activeCo.nif || ''} onChange={(e) => updateCo({ nif: e.target.value })} placeholder="200 123 456" /></Field>
                  <Field label="STAT"><Input value={activeCo.stat || ''} onChange={(e) => updateCo({ stat: e.target.value })} placeholder="85240/..." /></Field>
                  <Field label="IATA Code"><Input value={activeCo.iataCode || ''} onChange={(e) => updateCo({ iataCode: e.target.value })} placeholder="TNR-024-9" /></Field>
                  <Field label="FIATA Member ID"><Input value={activeCo.fiataMemberId || ''} onChange={(e) => updateCo({ fiataMemberId: e.target.value })} placeholder="MG-FL-0017" /></Field>
                </div>
              )}
              <hr className="border-slate-200 dark:border-slate-700" />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold">Branches</h3>
                <div className="flex gap-2 items-center">
                  <Select value={activeBrId} onChange={(e) => setActiveBrId(e.target.value)}>
                    {activeCo?.branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
                  </Select>
                  <Button size="sm" variant="outline" onClick={addBranch}><Plus className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={delBranch} disabled={!activeCo || activeCo.branches.length <= 1}><Trash2 className="w-4 h-4 text-rose-500" /></Button>
                </div>
              </div>
              {activeBr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Branch Name"><Input value={activeBr.name} onChange={(e) => updateBr({ name: e.target.value })} /></Field>
                  <Field label="City"><Input value={activeBr.city} onChange={(e) => updateBr({ city: e.target.value })} /></Field>
                  <Field label="Country"><Input value={activeBr.country} onChange={(e) => updateBr({ country: e.target.value })} /></Field>
                  <Field label="Phone"><Input value={activeBr.phone || ''} onChange={(e) => updateBr({ phone: e.target.value })} /></Field>
                  <div className="sm:col-span-2"><Field label="Address"><Input value={activeBr.address || ''} onChange={(e) => updateBr({ address: e.target.value })} /></Field></div>
                  <Field label="Branch NIF"><Input value={activeBr.nif || ''} onChange={(e) => updateBr({ nif: e.target.value })} /></Field>
                  <Field label="Branch STAT"><Input value={activeBr.stat || ''} onChange={(e) => updateBr({ stat: e.target.value })} /></Field>
                </div>
              )}
            </div>
          )}

          {tab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="flex items-start gap-3">
                  <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-semibold mb-1">Realtime Backend</p>
                    <p>On-device mode works 100% offline (great for UAT). Point it at your <strong>Hasura</strong> or <strong>Supabase</strong> project URL for multi-user live sync across phones & desktops.</p>
                  </div>
                </div>
              </div>
              <Field label="Backend">
                <Select value={cfg.backend} onChange={(e) => setCfg({ ...cfg, backend: e.target.value as any })}>
                  <option value="local">🖥 Local-only (cross-tab sync, zero setup)</option>
                  <option value="hasura">⚡ Hasura GraphQL (Postgres)</option>
                  <option value="supabase">🔷 Supabase Realtime (Postgres)</option>
                </Select>
              </Field>
              {cfg.backend !== 'local' && (
                <>
                  <Field label={`${cfg.backend === 'hasura' ? 'GraphQL' : 'Realtime'} endpoint URL`}>
                    <Input value={cfg.endpoint || ''} onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} placeholder={cfg.backend === 'hasura' ? 'https://your-hasura.hasura.app/v1/graphql' : 'https://xxx.supabase.co'} />
                  </Field>
                  <Field label="API Key (admin secret / anon key)">
                    <Input value={cfg.apiKey || ''} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} type="password" placeholder="••••••••" />
                  </Field>
                </>
              )}
              <Field label="VAPID Public Key (for web push, optional)">
                <Input value={cfg.pushPublicKey || ''} onChange={(e) => setCfg({ ...cfg, pushPublicKey: e.target.value })} placeholder="BN..." />
              </Field>
              <div className="text-xs text-slate-500">
                <Wifi className="w-3 h-3 inline mr-1" /> After saving, a status dot appears in the top bar. On Android Chrome, install the PWA to home screen for best results.
              </div>
            </div>
          )}

          {tab === 'push' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Web Push Notifications</p>
                    <p className="text-amber-800 dark:text-amber-300">Get alerts for shipment exceptions, new quote requests, POD deliveries, and approvals — even when the browser/PWA is in the background.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">Status</div>
                  <div className="text-sm text-slate-500">
                    {pushStatus === 'subscribed' ? '✅ Enabled' : pushStatus === 'unsupported' ? '❌ Not supported (needs HTTPS + PWA install on Android Chrome)' : '⭕ Not enabled'}
                  </div>
                </div>
                {pushStatus === 'subscribed' ? (
                  <Button variant="outline" onClick={async () => { await unsubscribePush(); setPushStatus('unsubscribed'); }}>Disable</Button>
                ) : (
                  <Button onClick={async () => { setPushStatus('enabling'); await subscribePush(); setPushStatus('subscribed'); }} disabled={pushStatus === 'unsupported' || pushStatus === 'enabling'}>Enable Push</Button>
                )}
              </div>
              <div className="text-xs text-slate-500">
                On Galaxy S20+, open the page in Chrome → tap ⋮ menu → <strong>Install app</strong> → then enable push here. Push requires HTTPS (GitHub Pages is HTTPS by default).
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-indigo-700 flex items-center justify-center text-white font-black text-xl">FF</div>
                <div>
                  <div className="font-bold text-lg">FreightFlow Logistics OS</div>
                  <div className="text-slate-500">Beta 9.4 "Mobile Pro" 🇲🇬</div>
                </div>
              </div>
              <p>Built for Malagasy freight forwarders as a CargoWise alternative at a fraction of the cost.</p>
              <p className="text-slate-500">HBL (FIATA FBL) · HAWB (IATA 600a) · OOBO/DGI e-invoices · Port Autocomplete · WMS · Yard · Live GPS · POD Camera · Realtime Sync · PWA offline-first.</p>
              <p className="text-xs text-slate-400">© 2026 FreightFlow · Antananarivo, Madagascar 🇲🇬</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={saveAll} className="min-w-[120px]">
            {saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
