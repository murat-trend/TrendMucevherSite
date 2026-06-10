import { NextRequest, NextResponse } from "next/server";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 90;

// ─── Types ────────────────────────────────────────────────────────────────────
interface FingerData {
  mcp: { x: number; y: number };
  pip: { x: number; y: number };
  widthRatio: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function bufToBlob(buf: Buffer, mime = "image/png"): Blob {
  return new Blob([new Uint8Array(buf)], { type: mime });
}

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

/**
 * Stability AI remove-background — şeffaf PNG döndürür.
 */
async function removeBackground(ringBuf: Buffer, apiKey: string): Promise<Buffer> {
  const form = new FormData();
  form.append("image", bufToBlob(ringBuf, "image/png"), "ring.png");
  form.append("output_format", "png");

  const res = await fetch("https://api.stability.ai/v2beta/stable-image/edit/remove-background", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });
  if (!res.ok) throw new Error(`remove-bg failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Remaura'da üretilen ürün fotoğrafını try-on için optimize eder.
 *
 * Problem: Remaura'nın ürettiği görseller dramatik açılı, perspektifli
 * katalog render'ları. Bunlar parmak üstüne overlay edilince "sticker gibi
 * yapışmış" görünür çünkü perspektif eşleşmiyor.
 *
 * Çözüm: Stability AI stable-image/edit/remove-background sonrası,
 * görsel üstten/ortografik görünüme dönüştürülür.
 * "TRYON_RING_SPEC": üstten bakış, tam band görünür, merkez hizalı,
 * perspektif distorsiyon yok.
 *
 * ÖNEMLİ: Mevcut üretim promptları hiç değiştirilmez.
 * Bu dönüşüm SADECE try-on pipeline'ında çalışır.
 */
async function normalizeTryOnAsset(ringNoBgBuf: Buffer, apiKey: string): Promise<Buffer> {
  // Önce 1024x1024 canvas'a yerleştir, yüzük %70 kaplar (sabit referans boyutu)
  const meta = await sharp(ringNoBgBuf).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;
  const canvasSize = 1024;
  const targetSize = Math.round(canvasSize * 0.70);
  const scale = targetSize / Math.max(w, h);
  const scaledW = Math.round(w * scale);
  const scaledH = Math.round(h * scale);
  const left = Math.round((canvasSize - scaledW) / 2);
  const top  = Math.round((canvasSize - scaledH) / 2);

  const paddedBuf = await sharp({
    create: { width: canvasSize, height: canvasSize, channels: 4,
               background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: await sharp(ringNoBgBuf).resize(scaledW, scaledH).toBuffer(),
      left, top,
    }])
    .png()
    .toBuffer();

  // Stability AI ile top-down projection'a dönüştür
  const form = new FormData();
  form.append("image", bufToBlob(paddedBuf, "image/png"), "ring.png");
  form.append("prompt",
    "top-down orthographic view of the exact same jewelry ring, " +
    "full ring band visible, centered, flat perspective, even studio lighting, " +
    "transparent background, no shadow, finger overlay optimized, " +
    "exactly the same design and details",
  );
  form.append("negative_prompt",
    "perspective distortion, dramatic angle, tilted, side view, shadow, " +
    "background, different design, cropped band",
  );
  form.append("output_format", "png");
  form.append("strength", "0.45");   // tasarımı koru, açıyı düzelt
  form.append("seed", "0");

  const res = await fetch(
    "https://api.stability.ai/v2beta/stable-image/generate/sd3",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
      body: form,
    },
  );

  if (!res.ok) {
    // Dönüşüm başarısız olursa orijinal arka planı kaldırılmış görsel kullan
    console.warn("[try-on] normalize failed, using original:", res.status);
    return ringNoBgBuf;
  }

  const normalizedBuf = Buffer.from(await res.arrayBuffer());

  // Normalize sonrası tekrar arka plan temizle (AI kırıntı bırakabilir)
  const cleanForm = new FormData();
  cleanForm.append("image", bufToBlob(normalizedBuf, "image/png"), "ring.png");
  cleanForm.append("output_format", "png");
  const cleanRes = await fetch(
    "https://api.stability.ai/v2beta/stable-image/edit/remove-background",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
      body: cleanForm,
    },
  );
  if (!cleanRes.ok) return normalizedBuf;
  return Buffer.from(await cleanRes.arrayBuffer());
}

/**
 * El fotoğrafı üzerine yüzüğü Sharp ile composite eder.
 * fingerData varsa MediaPipe koordinatlarını kullanır (hassas yerleşim).
 * Yoksa sabit fallback kullanır.
 */
async function compositeRingOnHand(
  handBuf: Buffer,
  ringNoBgBuf: Buffer,
  fingerData: FingerData | null,
): Promise<Buffer> {
  const handMeta = await sharp(handBuf).metadata();
  const handW = handMeta.width ?? 800;
  const handH = handMeta.height ?? 600;

  let centerX: number;
  let centerY: number;
  let ringTargetW: number;
  let angleDeg = 0;

  if (fingerData) {
    const mcpX = fingerData.mcp.x * handW;
    const mcpY = fingerData.mcp.y * handH;
    const pipX = fingerData.pip.x * handW;
    const pipY = fingerData.pip.y * handH;

    // Yüzüğü MCP ile PIP arasının 1/4'üne koy (boğum üstü)
    centerX = mcpX + (pipX - mcpX) * 0.25;
    centerY = mcpY + (pipY - mcpY) * 0.25;

    // Parmak açısı:
    // atan2(dy, dx) = parmağın yataydan açısı
    // Dikey parmak (pip yukarda) → atan2(-1, 0) = -90°
    // -90 + 90 = 0° → yüzük dönmez (doğru: dikey parmakta yüzük düz durur)
    angleDeg = Math.atan2(pipY - mcpY, pipX - mcpX) * (180 / Math.PI) + 90;

    // Parmak genişliğine göre boyutlandır (widthRatio kamera-bağımsız)
    ringTargetW = Math.round(handW * fingerData.widthRatio);
    ringTargetW = Math.max(Math.round(handW * 0.15), Math.min(Math.round(handW * 0.40), ringTargetW));
  } else {
    // Fallback
    centerX = handW * 0.47;
    centerY = handH * 0.52;
    ringTargetW = Math.round(handW * 0.24);
  }

  const ringResized = await sharp(ringNoBgBuf)
    .resize(ringTargetW, undefined, { fit: "inside" })
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const ringMeta = await sharp(ringResized).metadata();
  const ringW = ringMeta.width ?? ringTargetW;
  const ringH = ringMeta.height ?? ringTargetW;

  const left = Math.max(0, Math.min(handW - ringW, Math.round(centerX - ringW / 2)));
  const top  = Math.max(0, Math.min(handH - ringH, Math.round(centerY - ringH / 2)));

  return sharp(handBuf)
    .composite([{ input: ringResized, left, top, blend: "over" }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const billing = await requireRemauraUserAndCredits(
      String(formData.get("userId") ?? ""),
      { minCredits: 2 },
    );
    if (!billing.ok) return billing.response;

    const handFile = formData.get("handImage") as File | null;
    const ringFile = formData.get("ringImage") as File | null;

    if (!handFile || !ringFile) {
      return NextResponse.json({ error: "El ve yüzük görseli gerekli" }, { status: 400 });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "STABILITY_API_KEY yapılandırılmamış" }, { status: 500 });
    }

    // fingerData (MediaPipe'dan gelir, opsiyonel)
    let fingerData: FingerData | null = null;
    const fingerDataRaw = formData.get("fingerData");
    if (typeof fingerDataRaw === "string" && fingerDataRaw) {
      try { fingerData = JSON.parse(fingerDataRaw) as FingerData; } catch { /* ignore */ }
    }

    const [handBuf, ringBuf] = await Promise.all([
      fileToBuffer(handFile),
      fileToBuffer(ringFile),
    ]);

    // 1. Yüzük arka planını kaldır
    console.log("[try-on] 1/3 removing ring background…");
    const ringNoBgBuf = await removeBackground(ringBuf, apiKey);

    // 2. Remaura katalog görselini try-on formatına dönüştür
    //    (üstten bakış, tam band, perspektif düzeltme)
    //    Başarısız olursa orijinal görsel kullanılır — pipeline kesilmez.
    console.log("[try-on] 2/3 normalizing to top-down try-on asset…");
    const ringTryOnBuf = await normalizeTryOnAsset(ringNoBgBuf, apiKey);

    // 3. El fotoğrafına composite et
    console.log("[try-on] 3/3 compositing… fingerData:", fingerData ? "yes" : "fallback");
    const resultBuf = await compositeRingOnHand(handBuf, ringTryOnBuf, fingerData);

    return new NextResponse(new Uint8Array(resultBuf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'inline; filename="try-on-result.jpg"',
      },
    });
  } catch (err) {
    console.error("[try-on] error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sunucu hatası" }, { status: 500 });
  }
}
