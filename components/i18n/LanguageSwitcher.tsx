"use client";

import { useLanguage } from "./LanguageProvider";

const LANGUAGES = [
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "en" as const, flag: "🇬🇧", label: "English" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/50 p-0.5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLocale(lang.code)}
          aria-label={lang.label}
          title={lang.label}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
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
