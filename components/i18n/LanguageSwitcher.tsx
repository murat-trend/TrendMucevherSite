"use client";

import type { Locale } from "@/lib/i18n/translations";
import { useLanguage } from "./LanguageProvider";

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: "tr", flag: "🇹🇷", label: "Türkçe" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border/60 bg-background/50 p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLocale(lang.code)}
          aria-label={lang.label}
          title={lang.label}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-2.5 sm:text-[12px] ${
            locale === lang.code
              ? "bg-foreground/10 text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          <span className="text-base leading-none">{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}
