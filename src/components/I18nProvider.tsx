'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { Lang, getLang, setLang, t } from '@/lib/i18n';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: (p) => t(p) });

export function useI18n() { return useContext(Ctx); }

// Shorthand hook - returns t() bound to current lang
export function useT() {
  const ctx = useContext(Ctx);
  return ctx.t;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(getLang());
    function onLang() { setLangState(getLang()); }
    window.addEventListener('ff:lang-changed', onLang);
    return () => window.removeEventListener('ff:lang-changed', onLang);
  }, []);

  const change = useCallback((l: Lang) => { setLang(l); setLangState(l); }, []);

  const translate = useCallback((path: string) => t(path, lang), [lang]);

  return <Ctx.Provider value={{ lang, setLang: change, t: translate }}>{children}</Ctx.Provider>;
}
