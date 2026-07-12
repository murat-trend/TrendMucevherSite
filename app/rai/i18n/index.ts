import { en, type RaiDict } from "./en";
import { tr } from "./tr";
import { ru } from "./ru";
import { ar } from "./ar";

export type RaiLocale = "en" | "tr" | "ru" | "ar";

// Varsayılan dil: İngilizce. Sıra, dil değiştiricideki görünüm sırasıdır.
export const RAI_LOCALES: RaiLocale[] = ["en", "tr", "ru", "ar"];
export const RAI_DEFAULT_LOCALE: RaiLocale = "en";

export const RAI_LOCALE_NAMES: Record<RaiLocale, string> = {
  en: "English",
  tr: "Türkçe",
  ru: "Русский",
  ar: "العربية",
};

const DICTS: Record<RaiLocale, RaiDict> = { en, tr, ru, ar };

export function isRaiLocale(value: string): value is RaiLocale {
  return (RAI_LOCALES as string[]).includes(value);
}

export function getRaiDict(locale: RaiLocale): RaiDict {
  return DICTS[locale];
}

export function isRtl(locale: RaiLocale): boolean {
  return locale === "ar";
}

export type { RaiDict };
