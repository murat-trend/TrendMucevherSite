"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "./LanguageProvider";

const LANGUAGES = [
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "en" as const, flag: "🇬🇧", label: "English" },
];

type LanguageMenuProps = {
  onOpen?: () => void;
};

export function LanguageMenu({ onOpen }: LanguageMenuProps) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    onOpen?.();
    setOpen(true);
  };

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSelect = (code: "tr" | "en") => {
    setLocale(code);
    setOpen(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === locale);

  return (
    <>
      {/* Trigger: Button with current flag */}
      <button
        type="button"
        aria-label="Dil seçenekleri"
        onClick={handleOpen}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-foreground/5 active:bg-foreground/10"
      >
        {currentLang?.flag ?? "🌐"}
      </button>

      {/* Language Sheet - slides from right */}
      <div
        className={`fixed inset-0 z-[70] ${
          open ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-foreground/25 backdrop-blur-md transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[18rem] border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground">
                Dil / Language
              </h3>
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-colors ${
                    locale === lang.code
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-[15px] font-medium">{lang.label}</span>
                  {locale === lang.code && (
                    <span className="ml-auto text-accent">✓</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
