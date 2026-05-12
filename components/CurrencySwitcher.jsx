"use client";

import { useState, useEffect, useRef } from "react";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";

const BadgeTRY = () => (
  <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="30" height="20" fill="#E30A17" />
    <text x="15" y="14.5" textAnchor="middle" fill="white" fontSize="11" fontFamily="serif" fontWeight="bold">₺</text>
  </svg>
);

const BadgeUSD = () => (
  <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="30" height="20" fill="#1a5c38" />
    <text x="15" y="14.5" textAnchor="middle" fill="white" fontSize="11" fontFamily="serif" fontWeight="bold">$</text>
  </svg>
);

const BadgeEUR = () => (
  <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="30" height="20" fill="#003399" />
    <text x="15" y="14.5" textAnchor="middle" fill="#FFCC00" fontSize="11" fontFamily="serif" fontWeight="bold">€</text>
  </svg>
);

const BadgeGBP = () => (
  <svg viewBox="0 0 30 20" className="h-4 w-6 rounded-[2px]" aria-hidden>
    <rect width="30" height="20" fill="#012169" />
    <text x="15" y="14.5" textAnchor="middle" fill="white" fontSize="11" fontFamily="serif" fontWeight="bold">£</text>
  </svg>
);

const BADGE_COMPONENTS = {
  TRY: BadgeTRY,
  USD: BadgeUSD,
  EUR: BadgeEUR,
  GBP: BadgeGBP,
};

export function CurrencySwitcher({ variant = "default", align = "end" }) {
  const { currency, setCurrency } = useCurrency();
  const isGlass = variant === "glass";
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const CurrentBadge = BADGE_COMPONENTS[current.code] ?? BadgeTRY;
  const panelAlign = align === "end" ? "right-0 left-auto" : "left-0";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Para birimi"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Para birimi"
        onClick={() => setOpen((o) => !o)}
        className={
          isGlass
            ? "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-white transition-colors hover:bg-white/15 active:bg-white/20"
            : "flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2 text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
        }
      >
        <CurrentBadge />
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
          aria-label="Para birimi seç"
          className={`absolute ${panelAlign} top-full z-[100] mt-1 w-max min-w-[max(100%,11rem)] rounded-lg border border-border bg-card py-1 shadow-lg`}
        >
          {CURRENCIES.map((c) => {
            const Badge = BADGE_COMPONENTS[c.code] ?? BadgeTRY;
            return (
              <li key={c.code} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={currency === c.code}
                  onClick={() => { setCurrency(c.code); setOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors ${
                    currency === c.code
                      ? "bg-foreground/10 font-medium text-foreground"
                      : "text-foreground/85 hover:bg-foreground/5"
                  }`}
                >
                  <Badge />
                  <span>{c.label}</span>
                  {currency === c.code && <span className="ml-auto text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
