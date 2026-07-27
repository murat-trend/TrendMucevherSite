/**
 * Ham hata → uyarı türü sınıflandırıcı.
 *
 * Sağlayıcılar ödeme/anahtar/kota sorunlarını farklı biçimlerde döndürür; bu
 * yardımcı HTTP durum kodu + ham metinden ortak bir tür ("payment", "auth"…)
 * ve kısa, insan-okur bir sebep üretir.
 */

import type { WarningKind } from "./types";

const PAYMENT_HINTS = [
  "insufficient",
  "insufficient_quota",
  "insufficient credits",
  "no credits",
  "out of credits",
  "billing",
  "payment required",
  "balance",
  "add credits",
  "credit balance is too low",
  "exceeded your current quota",
  "past_due",
  "not enough balance",
];

const AUTH_HINTS = [
  "invalid api key",
  "invalid_api_key",
  "invalid authentication",
  "incorrect api key",
  "unauthorized",
  "authentication_error",
  "permission denied",
  "api key not valid",
  "forbidden",
];

const CONFIG_HINTS = [
  "yapılandırılmamış",
  "not configured",
  "missing api key",
  "no api key",
  "api key eksik",
];

const RATE_HINTS = [
  "rate limit",
  "rate_limit",
  "too many requests",
  "quota",
  "resource_exhausted",
  "overloaded",
];

const TIMEOUT_HINTS = ["timeout", "timed out", "zaman aşımı", "aborterror", "aborted", "etimedout"];

function hits(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

/**
 * Türü ve kısa sebebi çıkar.
 * @param status HTTP durum kodu (biliniyorsa)
 * @param raw Ham hata metni (sağlayıcıdan / exception mesajından)
 */
export function classifyError(
  status: number | null | undefined,
  raw: string | null | undefined,
): { kind: WarningKind; reason: string } {
  const text = (raw ?? "").toLowerCase();
  const code = status ?? null;

  // Metin ipuçları koddan önce gelir — 400 içinde "insufficient" gizlenebilir.
  if (hits(text, CONFIG_HINTS)) return { kind: "config", reason: "Anahtar yapılandırılmamış" };
  if (hits(text, PAYMENT_HINTS) || code === 402)
    return { kind: "payment", reason: "Kredi/bakiye yetersiz" };
  if (hits(text, TIMEOUT_HINTS)) return { kind: "timeout", reason: "İstek zaman aşımına uğradı" };
  if (hits(text, RATE_HINTS) || code === 429)
    return { kind: "rate_limit", reason: "Kota / oran limiti aşıldı" };
  if (hits(text, AUTH_HINTS) || code === 401 || code === 403)
    return { kind: "auth", reason: "API anahtarı geçersiz / yetkisiz" };
  if (code != null && code >= 500) return { kind: "server", reason: `Sağlayıcı hatası (${code})` };

  const short = (raw ?? "").trim().slice(0, 140);
  return { kind: "unknown", reason: short || (code ? `Hata ${code}` : "Bilinmeyen hata") };
}

/** Tür için kısa Türkçe etiket (şeritte rozet). */
export const KIND_LABEL: Record<WarningKind, string> = {
  payment: "ÖDEME GEREKLİ",
  auth: "ANAHTAR SORUNU",
  config: "YAPILANDIRMA",
  rate_limit: "KOTA LİMİTİ",
  timeout: "ZAMAN AŞIMI",
  server: "SERVİS HATASI",
  unknown: "HATA",
};
