export type CurrencyCode = "TRY" | "USD" | "EUR" | "GBP";

export interface CurrencyItem {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

export interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (tryAmount: number | null | undefined) => string;
}

export declare const CURRENCIES: CurrencyItem[];

export declare function CurrencyProvider(props: { children: React.ReactNode }): JSX.Element;

export declare function useCurrency(): CurrencyContextValue;
