import { SUPPORTED_LOCALES } from "./translations";
import type { Locale } from "./translations";

/** API / optimizer için: yalnızca desteklenen locale, aksi halde `tr`. */
export function normalizePromptLocale(raw: unknown): Locale {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (SUPPORTED_LOCALES as readonly string[]).includes(v) ? (v as Locale) : "tr";
}
