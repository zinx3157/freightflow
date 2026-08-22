'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * CargoWise / GoFreight-style mini sparkline chart for stat cards.
 * Pure SVG — no external dependencies.
 */
export function Sparkline({
  data,
  color = '#0f4c81',
  width = 120,
  height = 36,
  fill = true,
  strokeWidth = 2,
  className = '',
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;
  const gid = `sp-${Math.random().toString(36).slice(2, 9)}`;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaD} fill={`url(#${gid})`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={5} fill={color} fillOpacity={0.25} />
    </svg>
  );
}

/** Horizontal progress bar — Magaya-style KPI progress vs target */
export function ProgressBar({
  value,
  max = 100,
  color = '#0f4c81',
  label,
  showValue = true,
  size = 'md',
  className = '',
}: {
  value: number;
  max?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-baseline mb-1 text-xs">
          {label && <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>}
          {showValue && (
            <span className="text-slate-800 dark:text-slate-200 font-semibold tabular-nums">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** Donut / ring progress — CargoWise widget style */
export function ProgressRing({
  value,
  max = 100,
  size = 80,
  stroke = 8,
  color = '#0f4c81',
  trackColor = '#e2e8f0',
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}) {
  const pct = Math.min(1, Math.max(0, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{label}</div>}
        {sublabel && <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

/** Mini horizontal bar used in ranking lists (GoFreight BI) */
export function RankBar({
  rank,
  label,
  value,
  max,
  color,
  formatter = (v) => v.toLocaleString(),
}: {
  rank: number;
  label: string;
  value: number;
  max: number;
  color: string;
  formatter?: (v: number) => string;
}) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: rank <= 3 ? color : '#e2e8f0', color: rank <= 3 ? 'white' : '#64748b' }}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{label}</span>
          <span className="text-slate-900 dark:text-white font-semibold tabular-nums ml-2 shrink-0">{formatter(value)}</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}
