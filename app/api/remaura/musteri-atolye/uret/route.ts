import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { logWarning } from "@/lib/remaura/warnings/log";
import { HEDEF_BOYLAR, type HedefBoy } from "@/lib/remaura/musteri-atolye/pipeline";
import { uret, type TasarimModu } from "@/lib/remaura/musteri-atolye/uret";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * MÜŞTERİ ATÖLYESİ — seri üretimi.
 *
 * mod="tur"     → baz modelin duruşunu koruyarak türü değiştirir
 * mod="tasarim" → yeni tasarım (yeni-poz | poz-varyanti | serbest)
 *
 * TEK ÜRETİM döner. Çoklu tür seçiminde istemci sırayla çağırır — 14 türü tek
 * istekte üretmek 300 sn sınırını aşar ve ilk hatada hepsi çöper.
 */

const TASARIM_MODLARI: TasarimModu[] = ["yeni-poz", "poz-varyanti", "serbest"];

function normalizeBoy(v: unknown): HedefBoy {
  const n = Number(v);
  return (HEDEF_BOYLAR as readonly number[]).includes(n) ? (n as HedefBoy) : 2048;
}

function hataMesaji(status: number | null, raw: string): string {
  if (raw.startsWith("no_image")) {
    return "Model görsel üretmedi — tarifi sadeleştirip tekrar deneyin.";
  }
  if (raw.startsWith("timeout")) return "İşlem çok uzun sürdü, lütfen tekrar deneyin.";
  if (status === 401 || status === 403) return "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
  if (status === 429) return "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
  if (status === 503 || status === 504) return "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
  return "Üretim başarısız oldu, lütfen tekrar deneyin.";
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    mod?: "tur" | "tasarim";
    bazGorsel?: string;
    tur?: string;
    tasarimModu?: TasarimModu;
    tarif?: string;
    hedefBoy?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const mod = body.mod === "tasarim" ? "tasarim" : "tur";
  const tasarimModu: TasarimModu = TASARIM_MODLARI.includes(body.tasarimModu as TasarimModu)
    ? (body.tasarimModu as TasarimModu)
    : "yeni-poz";

  // Girdi doğrulama — hangi mod neyi zorunlu kılıyor
  if (mod === "tur") {
    if (!body.bazGorsel) {
      return NextResponse.json({ error: "Önce bir baz model seçin." }, { status: 400 });
    }
    if (!body.tur?.trim()) {
      return NextResponse.json({ error: "Tür seçin ya da yazın." }, { status: 400 });
    }
  } else if (tasarimModu === "serbest") {
    if (!body.tarif?.trim()) {
      return NextResponse.json({ error: "Serbest tasarımda ne istediğinizi yazın." }, { status: 400 });
    }
  } else if (!body.bazGorsel) {
    return NextResponse.json({ error: "Önce bir baz model seçin." }, { status: 400 });
  }

  const googleKey = (process.env.GOOGLE_API_KEY ?? "")
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim();
  const stabilityKey = process.env.STABILITY_API_KEY ?? "";

  if (!googleKey || !stabilityKey) {
    logWarning({
      tool: "musteri-atolye",
      action: mod === "tur" ? "Tür Değiştir" : "Yeni Tasarım",
      provider: !googleKey ? "gemini" : "stability",
      status: 500,
      raw: !googleKey ? "GOOGLE_API_KEY yapılandırılmamış" : "STABILITY_API_KEY yapılandırılmamış",
    });
    return NextResponse.json(
      { error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." },
      { status: 500 }
    );
  }

  try {
    const sonuc = await uret(
      {
        mod,
        bazGorsel: body.bazGorsel,
        tur: body.tur,
        tasarimModu,
        tarif: body.tarif,
        hedefBoy: normalizeBoy(body.hedefBoy),
      },
      { google: googleKey, stability: stabilityKey }
    );
    return NextResponse.json(sonuc);
  } catch (err: unknown) {
    console.error("[musteri-atolye/uret] error:", err);
    const e = err as { status?: number; message?: string };
    const raw = e?.message ?? String(err);
    logWarning({
      tool: "musteri-atolye",
      action: mod === "tur" ? "Tür Değiştir" : "Yeni Tasarım",
      provider: raw.startsWith("remove_bg") ? "stability" : "gemini",
      status: e?.status ?? null,
      raw: raw.slice(0, 300),
    });
    return NextResponse.json({ error: hataMesaji(e?.status ?? null, raw) }, { status: 500 });
  }
}
