'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Input, Badge } from './ui';
import { ExternalLink, Globe2, Landmark, ShieldCheck, Search, Copy, FileSearch } from 'lucide-react';

const LINKS = {
  douanes: 'https://www.douanes.gov.mg/',
  tradenet: 'https://tradenet.gasynet.mg/tnmg-decimex/',
  tradenetEn: 'https://tradenet.gasynet.mg/tnmg-decimex/pfk/PfkMainServlet?pContents=/jsp/mainWalkIn.jsp&pAction=FIRST&pPortalId=TNMG&pLanguage=en&pCountry=US',
  midac: 'https://midac.gasynet.mg/mgmda/faces/common/trader_login.jsf',
  wco: 'https://www.wcotradetools.org/en/harmonized-system',
  macmap: 'https://www.macmap.org/',
  wtoTpr2025: 'https://www.wto.org/english/tratop_e/tpr_e/s466_e.pdf',
};

export default function HSOnlineAccess({ query = '', hsCode = '' }: { query?: string; hsCode?: string }) {
  const [term, setTerm] = useState(hsCode || query || 'vanilla beans');
  const cleanHs = (hsCode || term).replace(/[^0-9]/g, '').slice(0, 10);
  const googleMg = useMemo(() => `https://www.google.com/search?q=${encodeURIComponent(`site:douanes.gov.mg Madagascar tarif douanier ${term}`)}`, [term]);
  const googleMidac = useMemo(() => `https://www.google.com/search?q=${encodeURIComponent(`Madagascar MIDAC autorisation HS ${term}`)}`, [term]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(cleanHs || term); } catch {}
  };

  return (
    <Card className="p-4 border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/50 dark:bg-cyan-950/10">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileSearch className="w-4 h-4 text-cyan-700"/> Online HS / Madagascar Tariff Access</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Use FreightFlow suggestions, then verify the HS/tariff line and MIDAC permits in official portals.</p>
        </div>
        <Badge color="blue">MG HS 2022</Badge>
      </div>
      <div className="flex gap-2 mb-3">
        <Input value={term} onChange={e=>setTerm(e.target.value)} placeholder="HS code or commodity e.g. 090510 vanilla" />
        <Button variant="outline" onClick={copy}><Copy className="w-4 h-4"/> Copy</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Ext href={LINKS.douanes} icon={<Landmark className="w-4 h-4"/>} label="Madagascar Customs" sub="Douanes portal" />
        <Ext href={googleMg} icon={<Search className="w-4 h-4"/>} label="Search MG tariff" sub="Douanes/Madagascar web search" />
        <Ext href={LINKS.tradenet} icon={<Globe2 className="w-4 h-4"/>} label="TradeNet Madagascar" sub="GasyNet single window" />
        <Ext href={LINKS.tradenetEn} icon={<Globe2 className="w-4 h-4"/>} label="TradeNet English" sub="Login / declarations" />
        <Ext href={LINKS.midac} icon={<ShieldCheck className="w-4 h-4"/>} label="MIDAC" sub="Permits & agency approvals" />
        <Ext href={googleMidac} icon={<Search className="w-4 h-4"/>} label="Search MIDAC by HS" sub="Permit/control check" />
        <Ext href={LINKS.macmap} icon={<Globe2 className="w-4 h-4"/>} label="ITC Market Access Map" sub="Tariffs / market access" />
        <Ext href={LINKS.wco} icon={<Globe2 className="w-4 h-4"/>} label="WCO HS tools" sub="Global HS reference" />
        <Ext href={LINKS.wtoTpr2025} icon={<FileSearch className="w-4 h-4"/>} label="WTO Madagascar TPR 2025" sub="Tariff/MIDAC context" />
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
        Note: TradeNet and MIDAC are official GasyNet portals and typically require registered credentials. FreightFlow keeps the link-outs and copied HS references ready for brokers.
      </p>
    </Card>
  );
}

function Ext({ href, icon, label, sub }: { href: string; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 hover:shadow-sm transition">
      <span className="text-cyan-700 dark:text-cyan-300">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{label}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub}</span></span>
      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
    </a>
  );
}
