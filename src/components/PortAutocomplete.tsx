'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Ship, Plane, Check, X } from 'lucide-react';
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
  /** Allow free-text (e.g. inland addresses, unknown ports). Default true. */
  allowFreeText?: boolean;
  /** Show a small "required" asterisk */
  required?: boolean;
  /** Compact variant (used inside dense forms) */
  compact?: boolean;
};

/**
 * Port/POL/POD autocomplete — used across the ENTIRE platform (shipments,
 * quotes, rates, bookings, rate calculator, rate shopper, trucking, get-quote).
 *
 * UX:
 *  - Matches IATA/LOCODE codes, city, port, country.
 *  - 🇲🇬 Madagascar ports always ranked first, then Indian Ocean / Africa / Europe / ME / Asia.
 *  - When a field already has a selection, focusing the field SELECTS ALL text so
 *    typing a new letter starts a fresh search (standard airline/hotel booking UX).
 *  - A clear (×) button lets the user wipe the field and start over.
 *  - Keyboard: ↑/↓ navigate, Enter picks, Escape closes, Tab advances to next field.
 */
export default function PortAutocomplete({
  value,
  onChange,
  mode,
  placeholder = 'Search city, airport or seaport…',
  label,
  id,
  className,
  autoFocus,
  allowFreeText = true,
  required,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [highlighted, setHighlighted] = useState<Port | undefined>(undefined);
  // Track whether user is actively typing (vs field has a confirmed selection)
  const [typing, setTyping] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const justPickedRef = useRef(false);
  // Keep open/typing/allowFreeText in refs so the keydown handler reads fresh values
  // without needing them in deps (which would cause keydown listener churn).
  const openRef = useRef(open);
  const typingRef = useRef(typing);
  const allowFreeTextRef = useRef(allowFreeText);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { typingRef.current = typing; }, [typing]);
  useEffect(() => { allowFreeTextRef.current = allowFreeText; }, [allowFreeText]);

  // When the value looks like a fully-resolved "City (CODE)" entry, treat as highlighted.
  useEffect(() => {
    if (!value) { setHighlighted(undefined); return; }
    const m = value.match(/\(([A-Z0-9]{2,})\)\s*$/);
    if (m) {
      const code = m[1];
      const found = searchPorts(code, undefined, 1)[0];
      if (found && found.code.toUpperCase() === code.toUpperCase()) {
        setHighlighted(found);
        return;
      }
    }
    setHighlighted(undefined);
  }, [value]);

  // The search query we feed to searchPorts: while typing use the raw value;
  // after a confirmed pick with no typing, query is empty → show regional defaults.
  const searchQuery = open ? (typing || !highlighted ? (value || '') : '') : '';

  const results = useMemo(
    () => (open ? searchPorts(searchQuery, mode, 8) : []),
    [open, searchQuery, mode],
  );

  // When results change, reset active index.
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    setActive(0);
  }, [results]);

  const pick = useCallback((p: Port) => {
    justPickedRef.current = true;
    const v = `${p.city} (${p.code})`;
    onChange(v, p);
    setHighlighted(p);
    setOpen(false);
    setTyping(false);
    // Blur on next frame so the dropdown doesn't immediately reopen.
    requestAnimationFrame(() => {
      try { inputRef.current?.blur(); } catch { /* noop */ }
    });
  }, [onChange]);

  // Keep a stable ref to `pick` so the keydown effect doesn't churn.
  const pickRef = useRef(pick);
  useEffect(() => { pickRef.current = pick; }, [pick]);
  // Stable ref to results too.
  const resultsRef = useRef(results);
  useEffect(() => { resultsRef.current = results; }, [results]);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTyping(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Global keyboard navigation (only when dropdown open).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!openRef.current) return;
      const res = resultsRef.current;
      const cur = activeRef.current;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(0, res.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        if (res[cur]) {
          e.preventDefault();
          pickRef.current(res[cur]);
        } else if (allowFreeTextRef.current && (valueRef.current || '').trim()) {
          e.preventDefault();
          setOpen(false);
          setTyping(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        setTyping(false);
        try { inputRef.current?.blur(); } catch { /* noop */ }
      } else if (e.key === 'Tab') {
        // On Tab: if something is highlighted via arrow keys, pick it; otherwise close.
        if (res[cur]) pickRef.current(res[cur]);
        setOpen(false);
        setTyping(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function handleFocus() {
    setOpen(true);
    // If there's already a resolved value, select all text so a new keystroke replaces it cleanly.
    if (highlighted && inputRef.current && !typingRef.current) {
      requestAnimationFrame(() => {
        try { inputRef.current?.select(); } catch { /* noop */ }
      });
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    setHighlighted(undefined);
    setTyping(true);
    setOpen(true);
  }

  function clearField() {
    onChange('', undefined);
    setHighlighted(undefined);
    setTyping(false);
    inputRef.current?.focus();
    setOpen(true);
  }

  return (
    <div className={cn('relative', className)} ref={wrapRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
          {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative group">
        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onClick={handleFocus}
          className={cn(
            'w-full pl-9 pr-20 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg',
            'bg-white dark:bg-slate-900 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:text-white outline-none',
            'min-h-[40px] transition',
            compact && 'py-1.5 text-sm min-h-[36px]',
          )}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {highlighted && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <Check className="w-3 h-3" />
              {highlighted.code}
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearField(); }}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
              tabIndex={-1}
              aria-label="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute z-[100] mt-1 w-full max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
          role="listbox"
        >
          {results.map((p, i) => (
            <button
              type="button"
              key={p.code}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              className={cn(
                'w-full text-left px-3 py-2 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors',
                i === active ? 'bg-brand/10 text-brand dark:bg-brand/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                p.countryCode === 'MG' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : p.type === 'air' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : p.type === 'sea' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
              {i === active && (
                <span className="text-[10px] text-slate-400 font-mono shrink-0">↵</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
