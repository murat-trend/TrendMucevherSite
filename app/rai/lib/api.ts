/*
 * Ada, motorlarla YALNIZCA HTTP üzerinden konuşur — fonksiyon import'u yok.
 * Taban adres env'den gelir: bugün boş (aynı origin, trendmucevher deploy'u),
 * ayrılma günü NEXT_PUBLIC_RAI_API_BASE=https://api.remauraai.com yapılır,
 * kodda tek satır değişmez.
 */
const API_BASE = process.env.NEXT_PUBLIC_RAI_API_BASE ?? "";

export async function raiPost<TRes>(path: string, body: unknown): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as (TRes & { error?: string }) | null;
  if (!res.ok || !data) {
    throw new Error(data?.error ?? "İşlem başarısız oldu, tekrar deneyin.");
  }
  return data;
}
