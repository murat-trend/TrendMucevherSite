import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { logWarning } from "@/lib/remaura/warnings/log";
import {
  hazirla,
  buyut,
  HEDEF_BOYLAR,
  type HedefBoy,
  type TasKapsami,
} from "@/lib/remaura/musteri-atolye/pipeline";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * MÜŞTERİ ATÖLYESİ — hazırlama komutu.
 *
 * islem="hazirla" → taş kaldır + altındaki gövdeyi tamamla + izole et +
 *                   arka planı kaldır + hedef boya büyüt
 * islem="buyut"   → hazır bir şeffaf görseli daha büyük boya çıkar (4K düğmesi)
 *
 * Yanıt her zaman R2 URL'i döner; büyük PNG gövdeye sığmaz.
 */

const TAS_KAPSAMLARI: TasKapsami[] = ["buyuk", "hepsi", "tarif"];

function normalizeBoy(v: unknown): HedefBoy {
  const n = Number(v);
  return (HEDEF_BOYLAR as readonly number[]).includes(n) ? (n as HedefBoy) : 2048;
}

function hataMesaji(status: number | null, raw: string): string {
  if (raw.startsWith("no_image")) {
    return "Model görsel üretmedi — başka bir fotoğrafla veya daha sade bir tarifle deneyin.";
  }
  if (raw.startsWith("timeout")) return "İşlem çok uzun sürdü, lütfen tekrar deneyin.";
  if (status === 401 || status === 403) return "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
  if (status === 429) return "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
  if (status === 503 || status === 504) return "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
  return "Hazırlama başarısız oldu, lütfen tekrar deneyin.";
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    islem?: "hazirla" | "buyut";
    image?: string;
    tasKapsami?: TasKapsami;
    tasTarif?: string;
    bailKaldir?: boolean;
    hedefBoy?: number;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!body.image) return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });

  const islem = body.islem === "buyut" ? "buyut" : "hazirla";
  const hedefBoy = normalizeBoy(body.hedefBoy);
  const aksiyon = islem === "buyut" ? "Büyüt" : "Taş Kaldır & Hazırla";

  // Anahtarlar — CLAUDE.md: servis adı kullanıcıya sızmaz.
  const googleKey = (process.env.GOOGLE_API_KEY ?? "")
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim();
  const stabilityKey = process.env.STABILITY_API_KEY ?? "";

  if (islem === "hazirla" && (!googleKey || !stabilityKey)) {
    logWarning({
      tool: "musteri-atolye",
      action: aksiyon,
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
    if (islem === "buyut") {
      const sonuc = await buyut(body.image, hedefBoy);
      return NextResponse.json(sonuc);
    }

    const tasKapsami: TasKapsami = TAS_KAPSAMLARI.includes(body.tasKapsami as TasKapsami)
      ? (body.tasKapsami as TasKapsami)
      : "buyuk";

    if (tasKapsami === "tarif" && !body.tasTarif?.trim()) {
      return NextResponse.json(
        { error: "Hangi taşın kaldırılacağını yazın." },
        { status: 400 }
      );
    }

    const sonuc = await hazirla(
      {
        image: body.image,
        tasKapsami,
        tasTarif: body.tasTarif,
        bailKaldir: body.bailKaldir !== false,
        hedefBoy,
      },
      { google: googleKey, stability: stabilityKey }
    );

    return NextResponse.json(sonuc);
  } catch (err: unknown) {
    console.error("[musteri-atolye/hazirla] error:", err);
    const e = err as { status?: number; message?: string };
    const raw = e?.message ?? String(err);
    const provider = raw.startsWith("remove_bg") ? "stability" : "gemini";
    logWarning({
      tool: "musteri-atolye",
      action: aksiyon,
      provider,
      status: e?.status ?? null,
      raw: raw.slice(0, 300),
    });
    return NextResponse.json({ error: hataMesaji(e?.status ?? null, raw) }, { status: 500 });
  }
}
