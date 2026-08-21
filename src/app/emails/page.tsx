'use client';

import PageShell from '@/components/PageShell';
import EmailCenter from '@/components/EmailCenter';
import { Card } from '@/components/ui';
import { useAuth } from '@/components/AuthProvider';
import { Mail, TrendingUp, Eye, MousePointerClick } from 'lucide-react';

export default function EmailsPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Email Center" subtitle="Automated customer communications with open & click tracking">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center"><Mail className="w-6 h-6" /></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Emails sent</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                <EmailStat type="total" />
              </div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-brand text-white flex items-center justify-center"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Open rate</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white"><EmailStat type="openRate" /></div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center"><Eye className="w-6 h-6" /></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Opened</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white"><EmailStat type="opened" /></div>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center"><MousePointerClick className="w-6 h-6" /></div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">CTR (clicked)</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white"><EmailStat type="clickRate" /></div>
            </div>
          </Card>
        </div>

        <EmailCenter scope="all" />
      </div>
    </PageShell>
  );
}

function EmailStat({ type }: { type: 'total' | 'openRate' | 'opened' | 'clickRate' }) {
  // client-side stat
  if (typeof window === 'undefined') return '—';
  const { db } = require('@/lib/store');
  const all = db.getAll().emails;
  const opened = all.filter((e: any) => e.status === 'opened' || e.status === 'clicked').length;
  const clicked = all.filter((e: any) => e.status === 'clicked').length;
  if (type === 'total') return <>{all.length}</>;
  if (type === 'opened') return <>{opened}</>;
  if (type === 'openRate') return <>{all.length ? Math.round(opened / all.length * 100) : 0}%</>;
  if (type === 'clickRate') return <>{opened ? Math.round(clicked / opened * 100) : 0}%</>;
  return null;
}
