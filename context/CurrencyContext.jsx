"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "trendmucevher-currency";

export const CURRENCIES = [
  { code: "TRY", symbol: "₺", label: "Türk Lirası", locale: "tr-TR" },
  { code: "USD", symbol: "$", label: "US Dollar",    locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro",         locale: "de-DE" },
  { code: "GBP", symbol: "£", label: "Pound Sterling", locale: "en-GB" },
];

// Conversion rates from TRY: 1 TRY = X foreign unit
const RATES = {
  TRY: 1,
  USD: 0.022,
  EUR: 0.019,
  GBP: 1 / 48,
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState("TRY");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && CURRENCIES.some((c) => c.code === stored)) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (code) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const formatPrice = (tryAmount) => {
    if (tryAmount == null) return "—";
    const rate = RATES[currency] ?? 1;
    const converted = tryAmount * rate;
    const curr = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
    return new Intl.NumberFormat(curr.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "TRY" ? 0 : 2,
    }).format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
