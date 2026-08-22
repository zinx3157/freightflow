'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { db } from '@/lib/store';
import type { DB } from '@/lib/store';
import type { Shipment, Invoice, DocApproval } from '@/lib/types';
import { formatDate, formatMoney, daysFromNow, daysBetween } from '@/lib/utils';
import {
  AlertTriangle,
  Clock,
  FileX,
  DollarSign,
  ShieldAlert,
  Plane,
  Ship,
  CheckCircle2,
  XCircle,
  FileCheck,
  ChevronRight,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Severity = 'critical' | 'warning' | 'info';
interface Exception {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  href?: string;
  icon: any;
  relatedId?: string;
  actionLabel?: string;
}

export function ExceptionsCenter({ maxItems = 8 }: { maxItems?: number }) {
  const [data, setData] = useState<DB | null>(null);
  const [filter, setFilter] = useState<'all' | Severity>('all');
  const router = useRouter();

  useEffect(() => {
    setData(db.getAll());
    const refresh = () => setData(db.getAll());
    window.addEventListener('ff:data-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('ff:data-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const exceptions = useMemo<Exception[]>(() => {
    if (!data) return [];
    const list: Exception[] = [];
    const now = new Date();

    // 1. Overdue shipments (past ETA, not delivered/cancelled)
    data.shipments.forEach((s) => {
      if (s.status !== 'delivered' && s.status !== 'cancelled' && new Date(s.eta) < now) {
        const days = Math.floor((now.getTime() - new Date(s.eta).getTime()) / 86400000);
        list.push({
          id: `overdue-${s.id}`,
          severity: days > 3 ? 'critical' : 'warning',
          category: 'Shipment',
          title: `${s.reference} is ${days} day${days !== 1 ? 's' : ''} past ETA`,
          detail: `${s.portOfLoading} → ${s.portOfDischarge} · ${s.customerName}`,
          href: `/shipments/?id=${s.id}`,
          icon: s.mode === 'air' ? Plane : Ship,
          relatedId: s.id,
        });
      }
    });

    // 2. Shipments stuck in one stage >5 days
    data.shipments.forEach((s) => {
      if (s.status !== 'delivered' && s.status !== 'cancelled') {
        const days = daysBetween(s.createdAt, now.toISOString());
        const inStage = days;
        if (inStage > 7 && s.status !== 'in_transit') {
          list.push({
            id: `stuck-${s.id}`,
            severity: inStage > 14 ? 'critical' : 'warning',
            category: 'Workflow',
            title: `${s.reference} stuck in "${s.status.replace('_', ' ')}" for ${inStage} days`,
            detail: `${s.customerName} · Last activity ${formatDate(s.createdAt)}`,
            href: `/shipments/?id=${s.id}`,
            icon: Clock,
          });
        }
      }
    });

    // 3. Customs rejections / inspections
    data.shipments.forEach((s) => {
      if (s.customsStatus === 'rejected') {
        list.push({
          id: `customs-rej-${s.id}`,
          severity: 'critical',
          category: 'Customs',
          title: `${s.reference} customs REJECTED`,
          detail: `Immediate action required — ${s.customerName}`,
          href: `/customs/?shipment=${s.id}`,
          icon: ShieldAlert,
        });
      } else if (s.customsStatus === 'inspection') {
        list.push({
          id: `customs-insp-${s.id}`,
          severity: 'warning',
          category: 'Customs',
          title: `${s.reference} held for inspection`,
          detail: `Physical/customs inspection — monitor closely`,
          href: `/customs/?shipment=${s.id}`,
          icon: ShieldAlert,
        });
      }
    });

    // 4. Overdue invoices (due date passed, status sent)
    data.invoices.forEach((inv) => {
      if (inv.status === 'sent' && new Date(inv.dueDate) < now) {
        const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
        list.push({
          id: `inv-overdue-${inv.id}`,
          severity: days > 14 ? 'critical' : 'warning',
          category: 'AR',
          title: `Invoice ${inv.number} overdue by ${days} day${days !== 1 ? 's' : ''}`,
          detail: `${inv.customerName} · ${formatMoney(inv.total)} ${inv.currency}`,
          href: `/invoices/?id=${inv.id}`,
          icon: DollarSign,
          actionLabel: 'Send reminder',
        });
      }
    });

    // 5. Missing required documents (booked/in-transit shipments)
    data.shipments.forEach((s) => {
      if (s.status === 'booked' || s.status === 'in_transit' || s.status === 'customs') {
        const required = s.mode === 'air'
          ? ['commercial_invoice', 'packing_list', 'airway_bill']
          : ['commercial_invoice', 'packing_list', 'bill_of_lading'];
        const present = new Set(data.docs.filter((d) => d.relatedId === s.id).map((d) => d.category));
        const missing = required.filter((c) => !present.has(c as any));
        if (missing.length > 0) {
          list.push({
            id: `docs-${s.id}`,
            severity: s.status === 'in_transit' ? 'warning' : 'info',
            category: 'Documents',
            title: `${s.reference}: ${missing.length} required doc${missing.length !== 1 ? 's' : ''} missing`,
            detail: `Missing: ${missing.map(m => m.replace('_', ' ')).join(', ')}`,
            href: `/shipments/?id=${s.id}`,
            icon: FileX,
          });
        }
      }
    });

    // 6. Pending doc approvals older than 2 days
    (data.docApprovals || []).forEach((a) => {
      if (a.status === 'pending') {
        const days = daysBetween(a.requestedAt, now.toISOString());
        if (days > 2) {
          list.push({
            id: `approval-${a.id}`,
            severity: days > 5 ? 'critical' : 'warning',
            category: 'Approvals',
            title: `Approval pending: ${a.docName} (${days}d)`,
            detail: `Requested by ${a.requestedBy} · ${a.category}`,
            href: `/approvals/`,
            icon: FileCheck,
          });
        }
      }
    });

    // 7. Expiring permits/licenses (expiryDate within 30 days)
    (data.docApprovals || []).forEach((a) => {
      if (a.expiryDate && a.status !== 'rejected') {
        const days = daysBetween(now.toISOString(), a.expiryDate);
        if (days >= 0 && days <= 30) {
          list.push({
            id: `expiry-${a.id}`,
            severity: days <= 7 ? 'critical' : 'warning',
            category: 'Compliance',
            title: `${a.docName} expires in ${days} day${days !== 1 ? 's' : ''}`,
            detail: a.category,
            href: `/approvals/`,
            icon: Clock,
          });
        }
      }
    });

    // Sort: critical first, then warning, then info
    const weight: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    list.sort((a, b) => weight[a.severity] - weight[b.severity]);
    return list;
  }, [data]);

  const counts = useMemo(() => ({
    critical: exceptions.filter((e) => e.severity === 'critical').length,
    warning: exceptions.filter((e) => e.severity === 'warning').length,
    info: exceptions.filter((e) => e.severity === 'info').length,
  }), [exceptions]);

  const visible = useMemo(() => {
    const filtered = filter === 'all' ? exceptions : exceptions.filter((e) => e.severity === filter);
    return filtered.slice(0, maxItems);
  }, [exceptions, filter, maxItems]);

  if (!data) return null;

  const sevStyle = (sev: Severity) => {
    switch (sev) {
      case 'critical':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/30',
          border: 'border-rose-200 dark:border-rose-900',
          icon: 'bg-rose-500 text-white',
          badge: 'rose',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-900',
          icon: 'bg-amber-500 text-white',
          badge: 'amber',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-900',
          icon: 'bg-blue-500 text-white',
          badge: 'blue',
        };
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900 dark:text-white">Exceptions & Alerts</h2>
          {exceptions.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
              {exceptions.length}
            </span>
          )}
        </div>
        <Link href="/reports" className="text-xs text-brand hover:underline font-medium">
          View all →
        </Link>
      </div>

      {/* Severity filter chips */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1 flex-wrap">
        {([
          { id: 'all', label: `All (${exceptions.length})`, color: 'slate' },
          { id: 'critical', label: `🔴 Critical (${counts.critical})`, color: 'rose' },
          { id: 'warning', label: `🟡 Warning (${counts.warning})`, color: 'amber' },
          { id: 'info', label: `🔵 Info (${counts.info})`, color: 'blue' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors min-h-[28px] ${
              filter === f.id
                ? f.color === 'rose'
                  ? 'bg-rose-500 text-white border-rose-500'
                  : f.color === 'amber'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : f.color === 'blue'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2">
        {visible.length === 0 && (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All clear — no exceptions! 🎉</p>
            <p className="text-xs text-slate-500 mt-1">Your operations are running smoothly.</p>
          </div>
        )}
        {visible.map((ex) => {
          const s = sevStyle(ex.severity);
          const Icon = ex.icon;
          return (
            <div
              key={ex.id}
              className={`${s.bg} ${s.border} border rounded-lg p-3 flex items-start gap-3 hover:shadow-sm transition-shadow cursor-pointer group`}
              onClick={() => ex.href && router.push(ex.href)}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.icon}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {ex.category}
                  </span>
                  <Badge color={s.badge as any}>{ex.severity}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{ex.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">{ex.detail}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
