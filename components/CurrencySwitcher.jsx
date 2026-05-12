"use client";

import { useState, useEffect, useRef } from "react";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";

export function CurrencySwitcher({ align = "end" }) {
  const { currency, setCurrency } = useCurrency();
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
  const panelAlign = align === "end" ? "right-0 left-auto" : "left-0";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Para birimi"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-2.5 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-foreground/5 active:bg-foreground/10"
      >
        <span>{current.symbol}</span>
        <span className="text-[12px] opacity-70">{current.code}</span>
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
          {CURRENCIES.map((c) => (
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
                <span className="w-5 shrink-0 text-center font-medium">{c.symbol}</span>
                <span>{c.label}</span>
                <span className="ml-1 text-[11px] text-muted">{c.code}</span>
                {currency === c.code && (
                  <span className="ml-auto text-accent">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
