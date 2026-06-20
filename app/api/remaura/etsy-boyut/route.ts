import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIZE = 2000; // Etsy standart kare kenar (px)

function clampHex(input: string | null): { r: number; g: number; b: number } {
  const fallback = { r: 255, g: 255, b: 255 };
  if (!input) return fallback;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(input.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * JPEG'i hedef bayt aralığına en yakın olacak şekilde kodlar.
 * Strateji: maxBytes'i aşmayan en yüksek kaliteyi ikili aramayla bulur.
 * En yüksek kalitede bile minBytes'in altında kalıyorsa (içerik sade), o sonucu
 * kabul eder — boyutu yapay olarak şişirmeyiz, netlik her zaman korunur.
 */
async function encodeToTargetJpeg(
  baseBuf: Buffer,
  minBytes: number,
  maxBytes: number
): Promise<{ buffer: Buffer; quality: number }> {
  const encode = (quality: number) =>
    sharp(baseBuf)
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();

  let lo = 50;
  let hi = 100;
  let best: { buffer: Buffer; quality: number } | null = null;

  // maxBytes'i aşmayan en büyük (en yüksek kaliteli) çıktıyı bul
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const buffer = await encode(mid);
    if (buffer.length <= maxBytes) {
      best = { buffer, quality: mid };
      lo = mid + 1; // daha yüksek kalite / daha büyük dosya dene
    } else {
      hi = mid - 1;
    }
  }

  // Hiçbir kalite sığmadıysa (çok detaylı görsel) en düşük kaliteyi kullan
  if (!best) {
    best = { buffer: await encode(50), quality: 50 };
  }

  // Hedef bandın altındaysak ve daha yükseğe çıkacak yer varsa zaten yukarıda
  // yakalanırdı; minBytes yalnızca bilgilendirme amaçlı, alt sınır zorlanmaz.
  void minBytes;
  return best;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const billing = await requireRemauraUserAndCredits(
      String(formData.get("userId") ?? "")
    );
    if (!billing.ok) return billing.response;

    const image = formData.get("image") as File | null;
    if (!image) {
      return NextResponse.json({ error: "Görsel eksik" }, { status: 400 });
    }

    const mode = String(formData.get("mode") ?? "contain"); // contain | cover
    const bg = clampHex(formData.get("bg") as string | null);
    const minKB = Math.max(100, Number(formData.get("minKB") ?? 750));
    const maxKB = Math.max(minKB, Number(formData.get("maxKB") ?? 800));

    const input = Buffer.from(await image.arrayBuffer());

    // 1) Yüksek kalite yeniden boyutlandırma (Lanczos3) → 2000x2000 kare
    let pipeline = sharp(input, { failOn: "none" }).rotate(); // EXIF yönünü uygula

    if (mode === "cover") {
      pipeline = pipeline.resize(SIZE, SIZE, {
        fit: "cover",
        position: "centre",
        kernel: "lanczos3",
      });
    } else {
      pipeline = pipeline.resize(SIZE, SIZE, {
        fit: "contain",
        background: bg,
        kernel: "lanczos3",
      });
    }

    // 2) JPEG'in alfası olmadığından zemini düz renge bas + hafif netlik koru
    const baseBuf = await pipeline
      .flatten({ background: bg })
      .sharpen({ sigma: 0.6 }) // downscale sonrası kenar netliğini koru
      .png({ compressionLevel: 0 }) // ara kayıpsız tampon
      .toBuffer();

    // 3) Hedef boyut bandına (750–800 KB) sıkıştır
    const { buffer, quality } = await encodeToTargetJpeg(
      baseBuf,
      minKB * 1024,
      maxKB * 1024
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'inline; filename="standart.jpg"',
        "X-Final-Bytes": String(buffer.length),
        "X-Final-Quality": String(quality),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("etsy-boyut error:", err);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
