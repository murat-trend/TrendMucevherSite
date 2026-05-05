"use client";

import { useState, useEffect, useRef } from "react";
import type { JSX } from "react";
import type { Locale } from "@/lib/i18n/translations";
import { useLanguage } from "./LanguageProvider";

const FlagTR = () => (
  <svg viewBox="0 0 300 200" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="300" height="200" fill="#E30A17" />
    <circle cx="100" cy="100" r="60" fill="white" />
    <circle cx="120" cy="100" r="47" fill="#E30A17" />
    <polygon fill="white" points="175,100 155,114 162,91 143,76 167,76 175,53 183,76 207,76 188,91 195,114" />
  </svg>
);

const FlagGB = () => (
  <svg viewBox="0 0 60 30" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30M60,0 L0,30" stroke="white" strokeWidth="6" />
    <path d="M31.5,0 L60,14.5M60,15.5 L31.5,30M28.5,0 L0,14.5M0,15.5 L28.5,30" stroke="#C8102E" strokeWidth="4" />
    <path d="M30,0 V30M0,15 H60" stroke="white" strokeWidth="10" />
    <path d="M30,0 V30M0,15 H60" stroke="#C8102E" strokeWidth="6" />
  </svg>
);

const FlagDE = () => (
  <svg viewBox="0 0 9 6" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="9" height="2" fill="#000" />
    <rect y="2" width="9" height="2" fill="#DD0000" />
    <rect y="4" width="9" height="2" fill="#FFCE00" />
  </svg>
);

const FlagRU = () => (
  <svg viewBox="0 0 9 6" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="9" height="2" fill="#fff" />
    <rect y="2" width="9" height="2" fill="#0039A6" />
    <rect y="4" width="9" height="2" fill="#D52B1E" />
  </svg>
);

const FLAG_COMPONENTS: Record<string, () => JSX.Element> = {
  tr: FlagTR,
  en: FlagGB,
  de: FlagDE,
  ru: FlagRU,
};

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ru", label: "Русский" },
];

type LanguageMenuProps = {
  variant?: "default" | "glass";
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
  const CurrentFlag = FLAG_COMPONENTS[current.code] ?? FlagTR;

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
            ? "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-white transition-colors hover:bg-white/15 active:bg-white/20"
            : "flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2 text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
        }
      >
        <CurrentFlag />
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
          className={`absolute ${panelAlign} top-full z-[100] mt-1 w-max min-w-[max(100%,10rem)] rounded-lg border border-border bg-card py-1 shadow-lg`}
        >
          {LANGUAGES.map((lang) => {
            const Flag = FLAG_COMPONENTS[lang.code] ?? FlagTR;
            return (
              <li key={lang.code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors ${
                    locale === lang.code
                      ? "bg-foreground/10 font-medium text-foreground"
                      : "text-foreground/85 hover:bg-foreground/5"
                  }`}
                >
                  <Flag />
                  <span>{lang.label}</span>
                  {locale === lang.code && <span className="ml-auto text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
