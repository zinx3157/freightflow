'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Ship, Plane, Check } from 'lucide-react';
import { searchPorts, type Port } from '@/lib/ports';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (val: string, port?: Port) => void;
  mode?: 'air' | 'sea';
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
  autoFocus?: boolean;
};

/**
 * Port/POL/POD autocomplete.
 * - Matches IATA/LOCODE codes, city names, port names, countries
 * - Shows 🇲🇬 Madagascar ports first, then Indian Ocean, Africa, etc.
 * - Dropdown closes on blur/escape/select.
 */
export default function PortAutocomplete({
  value,
  onChange,
  mode,
  placeholder = 'Search city, code, port name…',
  label,
  id,
  className,
  autoFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [highlighted, setHighlighted] = useState<Port | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (open ? searchPorts(value || '', mode, 8) : []), [open, value, mode]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
      else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, results, active]);

  function pick(p: Port) {
    const v = `${p.city} (${p.code})`;
    onChange(v, p);
    setHighlighted(p);
    setOpen(false);
  }

  return (
    <div className={cn('relative', className)} ref={wrapRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlighted(undefined);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={cn(
            'w-full pl-9 pr-8 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-900 focus:border-brand dark:text-white outline-none',
            'min-h-[40px]',
          )}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {highlighted && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Check className="w-3 h-3" />
            {highlighted.code}
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
        >
          {results.map((p, i) => (
            <button
              type="button"
              key={p.code}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(p)}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition',
                i === active ? 'bg-brand/10 text-brand' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                p.countryCode === 'MG' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : p.type === 'air' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
              )}>
                {p.type === 'air' ? <Plane className="w-4 h-4" /> : p.type === 'sea' ? <Ship className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm truncate">{p.city}</span>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">{p.code}</span>
                  {p.countryCode === 'MG' && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">🇲🇬</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {p.name} · {p.country}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
