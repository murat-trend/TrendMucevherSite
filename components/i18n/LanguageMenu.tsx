"use client";

import { useState, useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n/translations";
import { useLanguage } from "./LanguageProvider";

const LANGUAGES: { code: Locale; flag: string; label: string; abbr: string }[] = [
  { code: "tr", flag: "🇹🇷", label: "Türkçe", abbr: "TR" },
  { code: "en", flag: "🌐", label: "English", abbr: "EN" },
  { code: "de", flag: "",   label: "Deutsch", abbr: "DE" },
  { code: "ru", flag: "🇷🇺", label: "Русский", abbr: "RU" },
];

type LanguageMenuProps = {
  variant?: "default" | "glass";
  /** Üst sağda küçük panel taşmasın diye */
  align?: "start" | "end";
};

export function LanguageMenu({ variant = "default", align = "start" }: LanguageMenuProps) {
  const { locale, setLocale, t } = useLanguage();
  const isGlass = variant === "glass";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panelAlign = align === "end" ? "right-0 left-auto" : "left-0";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t.header.language}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={t.header.language}
        onClick={() => setOpen((o) => !o)}
        className={
          isGlass
            ? "flex h-9 min-w-[2.75rem] items-center justify-center gap-1 rounded-lg px-2 text-[12px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-white/15 active:bg-white/20"
            : "flex h-9 min-w-[2.75rem] items-center justify-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 text-[12px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
        }
      >
        {current.flag && <span className="text-base leading-none">{current.flag}</span>}
        <span>{current.abbr}</span>
        <svg
          className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t.header.language}
          className={`absolute ${panelAlign} top-full z-[100] mt-1 w-max min-w-[max(100%,12rem)] rounded-lg border border-border bg-card py-1 shadow-lg`}
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={locale === lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] transition-colors ${
                  locale === lang.code
                    ? "bg-foreground/10 font-medium text-foreground"
                    : "text-foreground/85 hover:bg-foreground/5"
                }`}
              >
                {lang.flag && <span className="text-lg leading-none">{lang.flag}</span>}
                <span>{lang.label}</span>
                {locale === lang.code && <span className="ml-auto text-accent">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
