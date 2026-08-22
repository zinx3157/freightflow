'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from './ui';
import { db } from '@/lib/store';
import type { Shipment, ShipmentStatus } from '@/lib/types';
import { formatDate, formatMoney, statusColor, titleCase } from '@/lib/utils';
import { Plane, Ship, Clock, AlertTriangle, DollarSign, MapPin, GripVertical, Package } from 'lucide-react';

/**
 * CargoWise / Magaya-style Kanban board for shipments.
 * Desktop: horizontal columns with drag & drop.
 * Mobile: vertical stack with tap-to-move buttons.
 */
const COLUMNS: { id: ShipmentStatus; label: string; color: string; icon: any }[] = [
  { id: 'quoted', label: 'Quoted', color: 'slate', icon: Package },
  { id: 'booked', label: 'Booked', color: 'indigo', icon: Package },
  { id: 'picked_up', label: 'Pickup', color: 'violet', icon: Package },
  { id: 'in_transit', label: 'In Transit', color: 'blue', icon: Ship },
  { id: 'customs', label: 'Customs', color: 'amber', icon: Package },
  { id: 'delivered', label: 'Delivered', color: 'emerald', icon: Package },
];

export function ShipmentKanban({ onOpen }: { onOpen?: (id: string) => void }) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ShipmentStatus | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'air' | 'sea'>('all');

  useEffect(() => {
    setShipments(db.getAll().shipments);
    const refresh = () => setShipments(db.getAll().shipments);
    window.addEventListener('ff:data-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('ff:data-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const moveShipment = (id: string, newStatus: ShipmentStatus) => {
    db.updateShipment(id, { status: newStatus });
    window.dispatchEvent(new Event('ff:data-changed'));
    setShipments(db.getAll().shipments);
  };

  const filtered = shipments.filter((s) => modeFilter === 'all' || s.mode === modeFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['all', 'air', 'sea'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors min-h-[32px] ${
                modeFilter === m
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m === 'all' ? 'All modes' : m === 'air' ? '✈️ Air' : '🚢 Sea'}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">💡 Tip: </span>Drag cards (desktop) or tap ⋯ to move status
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const colShipments = filtered.filter((s) => s.status === col.id);
          const totalValue = colShipments.reduce((sum, s) => sum + s.totalAmount, 0);
          return (
            <div
              key={col.id}
              className={`rounded-xl border-2 transition-colors min-h-[120px] ${
                overCol === col.id
                  ? 'border-brand bg-brand/5'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveShipment(dragId, col.id);
                setDragId(null);
                setOverCol(null);
              }}
            >
              <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full`}
                    style={{
                      background:
                        col.color === 'emerald'
                          ? '#10b981'
                          : col.color === 'amber'
                          ? '#f59e0b'
                          : col.color === 'blue'
                          ? '#3b82f6'
                          : col.color === 'violet'
                          ? '#8b5cf6'
                          : col.color === 'indigo'
                          ? '#6366f1'
                          : '#64748b',
                    }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                    {col.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                    {colShipments.length}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                  {formatMoney(totalValue)}
                </span>
              </div>
              <div className="p-2 space-y-2 max-h-[520px] overflow-y-auto">
                {colShipments.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 italic">Drop shipments here</div>
                )}
                {colShipments.map((s) => {
                  const overdue = s.status !== 'delivered' && new Date(s.eta) < new Date();
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={() => setDragId(s.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onClick={() => onOpen?.(s.id)}
                      className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md hover:border-brand cursor-pointer transition-all active:scale-95"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {s.reference}
                          </span>
                        </div>
                        {s.mode === 'air' ? (
                          <Plane className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <Ship className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate mb-1">
                        {s.customerName}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {s.portOfLoading.slice(0, 14)} → {s.portOfDischarge.slice(0, 14)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {(s.totalAmount / 1000).toFixed(0)}k
                        </span>
                        <span className={`flex items-center gap-0.5 ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                          {overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {formatDate(s.eta)}
                        </span>
                      </div>
                      {/* Quick move buttons on mobile / always visible */}
                      <div className="hidden group-hover:flex sm:flex mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 gap-1 flex-wrap">
                        {COLUMNS.filter((c) => c.id !== s.status).slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveShipment(s.id, c.id);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-brand hover:text-white text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            →{c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
