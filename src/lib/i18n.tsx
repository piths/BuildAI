'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Lang, translations, TranslationKey } from './translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const toggle = useCallback(() => setLang((l) => (l === 'en' ? 'sw' : 'en')), []);
  const t = useCallback((key: TranslationKey) => translations[lang][key] ?? translations.en[key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback so components work even outside the provider (e.g. isolated tests).
    return {
      lang: 'en',
      setLang: () => {},
      toggle: () => {},
      t: (key: TranslationKey) => translations.en[key] ?? key,
    };
  }
  return ctx;
}
