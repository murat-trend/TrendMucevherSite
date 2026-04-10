"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/translations";
import { SUPPORTED_LOCALES, translations } from "@/lib/i18n/translations";

const STORAGE_KEY = "trendmucevher-locale";

type Translations = (typeof translations)[Locale];

const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
} | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      document.documentElement.lang = stored;
      queueMicrotask(() => setLocaleState(stored as Locale));
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  };

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
