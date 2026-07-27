/**
 * Uyarı kaydı — sunucu tarafı.
 *
 * Bir route bir sağlayıcı hatasıyla karşılaştığında bunu çağırır. FIRE-AND-FORGET:
 * asla throw etmez, route akışını bozmaz. Tablo yoksa / DB hatası olursa sessizce
 * geçer (yalnızca console'a düşer).
 *
 * Kullanım (route catch bloğunda):
 *   logWarning({ tool: "koleksiyon-edit", action: "Koleksiyon Üret",
 *                provider: "gemini", status: res.status, raw: errText });
 */

import { classifyError } from "./classify";
import type { ProviderId } from "./types";

type LogInput = {
  tool: string;
  action?: string | null;
  provider: ProviderId;
  status?: number | null;
  /** Ham hata metni — süper-admin görür. */
  raw?: string | null;
};

let warnedNoTable = false;

export function logWarning(input: LogInput): void {
  // Beklemeden ateşle — route yanıtını geciktirme.
  void (async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return;

      const { kind, reason } = classifyError(input.status ?? null, input.raw ?? null);

      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(url, key, { auth: { persistSession: false } });

      const { error } = await admin.from("remaura_warnings").insert({
        tool: input.tool,
        action: input.action ?? null,
        provider: input.provider,
        kind,
        status: input.status ?? null,
        reason: reason.slice(0, 500),
        source: "live",
        resolved: false,
      });

      if (error && !warnedNoTable) {
        warnedNoTable = true;
        console.warn("[warnings] kayıt başarısız (tablo eksik olabilir):", error.message);
      }
    } catch (e) {
      if (!warnedNoTable) {
        warnedNoTable = true;
        console.warn("[warnings] kayıt istisnası:", (e as Error)?.message);
      }
    }
  })();
}

/**
 * Bir Response nesnesinden ham hata metnini güvenle çıkar (klonlar, JSON/metin
 * dener). Route'larda logWarning'e ham sebep beslemek için pratik yardımcı.
 */
export async function extractErrorText(res: Response): Promise<string> {
  try {
    const clone = res.clone();
    const txt = await clone.text();
    return txt.slice(0, 1000);
  } catch {
    return `HTTP ${res.status}`;
  }
}

// re-export — çağıranların tek yerden alması için
export type { ProviderId };
