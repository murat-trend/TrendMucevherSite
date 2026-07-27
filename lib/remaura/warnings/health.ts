/**
 * Aktif sağlık kontrolü — sağlayıcı başına anlık durum yoklaması.
 *
 * Dürüst sınır:
 *  - Stability → GERÇEK kredi bakiyesi okunur (en güçlü sinyal).
 *  - OpenAI / Gemini / Anthropic → anahtar geçerli mi + kota (401/403/429) yakalanır.
 *  - fal.ai / Tripo / Meshy → herkese açık bakiye endpoint'i yok → yalnız
 *    "anahtar var mı" bakılır; gerçek kredi durumu canlı hata anında yakalanır.
 */

import { classifyError } from "./classify";
import { PROVIDER_IDS, readProviderKey } from "./registry";
import type { HealthResult, ProviderId } from "./types";

/** Düşük kredi eşiği — altındaysa "warn". */
const LOW_CREDIT = 20;

async function fetchTimeout(url: string, init: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

function keyMissing(provider: ProviderId): HealthResult {
  return {
    provider,
    state: "down",
    kind: "config",
    detail: "Anahtar yapılandırılmamış (env eksik)",
    balance: null,
  };
}

/** Stability — gerçek bakiye. */
async function checkStability(key: string): Promise<HealthResult> {
  try {
    const res = await fetchTimeout("https://api.stability.ai/v1/user/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const raw = await safeText(res);
      const { kind } = classifyError(res.status, raw);
      return { provider: "stability", state: "down", kind, detail: `Erişilemedi (${res.status})`, balance: null };
    }
    const data = (await res.json()) as { credits?: number };
    const credits = typeof data.credits === "number" ? data.credits : null;
    if (credits != null && credits <= 0)
      return { provider: "stability", state: "down", kind: "payment", detail: "Kredi bitti (0)", balance: 0 };
    if (credits != null && credits < LOW_CREDIT)
      return { provider: "stability", state: "warn", kind: "payment", detail: `Kredi azaldı: ${credits}`, balance: credits };
    return { provider: "stability", state: "ok", kind: null, detail: credits != null ? `Bakiye: ${credits} kredi` : "Erişilebilir", balance: credits };
  } catch {
    return { provider: "stability", state: "unknown", kind: null, detail: "Yoklama başarısız (ağ)", balance: null };
  }
}

/** OpenAI — anahtar geçerliliği + kota. */
async function checkOpenAI(key: string): Promise<HealthResult> {
  try {
    const res = await fetchTimeout("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { provider: "openai", state: "ok", kind: null, detail: "Anahtar geçerli", balance: null };
    const raw = await safeText(res);
    const { kind, reason } = classifyError(res.status, raw);
    const state = kind === "rate_limit" || kind === "payment" ? "warn" : "down";
    return { provider: "openai", state, kind, detail: `${reason} (${res.status})`, balance: null };
  } catch {
    return { provider: "openai", state: "unknown", kind: null, detail: "Yoklama başarısız (ağ)", balance: null };
  }
}

/** Anthropic — anahtar geçerliliği. */
async function checkAnthropic(key: string): Promise<HealthResult> {
  try {
    const res = await fetchTimeout("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (res.ok) return { provider: "anthropic", state: "ok", kind: null, detail: "Anahtar geçerli", balance: null };
    const raw = await safeText(res);
    const { kind, reason } = classifyError(res.status, raw);
    const state = kind === "rate_limit" || kind === "payment" ? "warn" : "down";
    return { provider: "anthropic", state, kind, detail: `${reason} (${res.status})`, balance: null };
  } catch {
    return { provider: "anthropic", state: "unknown", kind: null, detail: "Yoklama başarısız (ağ)", balance: null };
  }
}

/** Gemini — anahtar geçerliliği. */
async function checkGemini(key: string): Promise<HealthResult> {
  try {
    const res = await fetchTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1`,
      {},
    );
    if (res.ok) return { provider: "gemini", state: "ok", kind: null, detail: "Anahtar geçerli", balance: null };
    const raw = await safeText(res);
    const { kind, reason } = classifyError(res.status, raw);
    const state = kind === "rate_limit" ? "warn" : "down";
    return { provider: "gemini", state, kind, detail: `${reason} (${res.status})`, balance: null };
  } catch {
    return { provider: "gemini", state: "unknown", kind: null, detail: "Yoklama başarısız (ağ)", balance: null };
  }
}

/** fal / tripo / meshy — bakiye endpoint'i yok; sadece anahtar varlığı. */
function checkKeyPresenceOnly(provider: ProviderId, key: string): HealthResult {
  void key;
  return {
    provider,
    state: "unknown",
    kind: null,
    detail: "Anahtar mevcut — kredi durumu yalnız canlı hatada görünür",
    balance: null,
  };
}

async function checkProvider(provider: ProviderId): Promise<HealthResult> {
  const key = readProviderKey(provider);
  if (!key) return keyMissing(provider);

  switch (provider) {
    case "stability":
      return checkStability(key);
    case "openai":
      return checkOpenAI(key);
    case "anthropic":
      return checkAnthropic(key);
    case "gemini":
      return checkGemini(key);
    case "fal":
    case "tripo":
    case "meshy":
      return checkKeyPresenceOnly(provider, key);
    default:
      return { provider, state: "unknown", kind: null, detail: "-", balance: null };
  }
}

/** Tüm sağlayıcıları paralel yokla. */
export async function runHealthChecks(): Promise<HealthResult[]> {
  return Promise.all(PROVIDER_IDS.map((p) => checkProvider(p)));
}
