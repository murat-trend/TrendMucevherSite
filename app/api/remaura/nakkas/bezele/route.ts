import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { falUpscaleToDataUri } from "@/lib/remaura/aci-lab-upscale";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * NAKKAŞ — FORM BEZEME (izole deney).
 * Deseni (bizim/müşterinin) yüzük kasası formunun üstüne DERİN RÖLYEF olarak
 * oturtur. Desen ARKA PLANDA MUTLAKA clarity'den geçer (zorunlu). Çift-görsel
 * Gemini koşullama: [yüzük formu, netleştirilmiş desen] → süslenmiş yüzük.
 */

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

function sanitizeGoogleKey(): string | undefined {
  const raw = process.env.GOOGLE_API_KEY ?? "";
  return (
    raw
      .split("")
      .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
      .join("")
      .trim() || undefined
  );
}

/**
 * data-URI/URL → Gemini inlineData (jpeg, makul boyut).
 * `squarePad`: yüzük formu için — EXIF döndürme normalize + DİSTORSİYONSUZ kareye
 * letterbox (contain, beyaz pad). Böylece yuvarlak tabla YUVARLAK kalır ve giriş
 * en-boyu kare olur → model çıktıyı ezip oval yapamaz. Desen için kapalı.
 */
async function toInlinePart(
  src: string,
  maxPx: number,
  opts?: { squarePad?: boolean },
): Promise<{ inlineData: { mimeType: string; data: string } }> {
  let buf: Buffer;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const b64 = src.includes(",") ? src.split(",")[1]! : src;
    buf = Buffer.from(b64, "base64");
  }
  const sharp = (await import("sharp")).default;
  const pipeline = sharp(buf).rotate(); // .rotate() = EXIF'e göre otomatik düzelt (eğiklik önler)
  const out = opts?.squarePad
    ? await pipeline
        .resize(maxPx, maxPx, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 92 })
        .toBuffer()
    : await pipeline
        .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toBuffer();
  return { inlineData: { mimeType: "image/jpeg", data: out.toString("base64") } };
}

function buildBezelePrompt(note?: string): string {
  const noteLine = note?.trim()
    ? `DESIGNER'S GEOMETRY NOTE — AUTHORITATIVE (the designer knows the true CAD geometry; obey exactly): ${note.trim()}. Treat this as ground truth for the ring's shape; any apparent distortion in the input is perspective, not the real shape — keep the stated geometry exactly.`
    : "";
  return [
    "CRITICAL — GEOMETRY LOCK: IMAGE 1 is the EXACT base for the RING. Preserve the ring's silhouette, outline, proportions, tilt/viewing angle and camera 100%. The round top face (tabla) MUST stay a PERFECT CIRCLE — never an oval. Do NOT rotate, tilt, scale, re-pose or re-photograph the ring. This is an in-place SURFACE edit of the ring, NOT a new render. The ring's outline must land on the SAME pixels as IMAGE 1.",
    noteLine,
    "You are given TWO images. IMAGE 1 = a plain, undecorated jewelry RING form (blank signet/ring). IMAGE 2 = an ornamental metal PATTERN (relief ornament — a TEXTURE SOURCE ONLY, sampled to carve onto the ring).",
    "TASK: Add the ornament from IMAGE 2 onto the ring in IMAGE 1 as DEEP CARVED metal RELIEF, on the surfaces already visible (top face/signet, shoulders, band). The relief conforms to the ring's EXISTING curvature as seen in IMAGE 1 — it does NOT reshape, re-round or re-project the geometry. IMAGE 2 contributes ORNAMENT MOTIF ONLY — never its shape, framing, lighting, aspect ratio, and NEVER its background field.",
    "BACKGROUND — CRITICAL: the ornament appears ONLY carved into the ring's own metal surfaces. The area AROUND the ring must be a PLAIN, EMPTY, uniform seamless studio background (solid neutral dark or light). NEVER tile, repeat, paint or bleed the IMAGE 2 pattern into the background or behind/around the ring. NO wallpaper, NO pattern field, NO scene behind the ring — just a clean empty backdrop with a single isolated ring on it.",
    "RELIEF: deep, multi-layered high relief with strong ambient-occlusion shadows in the recesses so it reads as TRUE 3D sculpted metal; fine filigree + granulation, crisp cleanly-separated detail, razor-sharp edges.",
    "NO STONES: pure metal only — no gemstones, no set stones (empty settings if any).",
    "FINISH & PATINA: antique silver — single-tone SILVER only (no gold/color), a spectrum of close GRAYSCALE tones. BRIGHT silver highlights on raised relief (#E0E0E0–#FFFFFF), recesses in DARK ANTHRACITE/smoke — NOT pure black (#2A2A2A–#4A4A4A ~#333333) for aged patina depth; SOFT gradients (not sharp), strong ambient-occlusion contrast. Cold matte metal, master jeweler craftsmanship, relief deep and crisp enough to survive casting and polishing.",
    "OUTPUT: a single isolated ornamented ring on a CLEAN, PLAIN, EMPTY background — the ring's shape, tilt and round tabla exactly as in IMAGE 1, only its surfaces now carry the carved relief. Do NOT re-pose the ring, do NOT put any pattern in the background.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const googleKey = sanitizeGoogleKey();
  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  try {
    const body = (await req.json()) as { desenImage?: string; ringImage?: string; note?: string };
    if (!body.desenImage || !body.ringImage) {
      return NextResponse.json({ error: "Desen ve yüzük görseli gerekli." }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note : undefined;

    // ZORUNLU: desen arka planda clarity'den geçer (netleştir). Hata olursa orijinalle devam.
    let desenSrc = body.desenImage;
    try {
      desenSrc = await falUpscaleToDataUri(body.desenImage, 2, "clarity");
    } catch (e) {
      console.error("[nakkas/bezele] clarity atlandı:", e instanceof Error ? e.message : e);
    }

    // Yüzük = kareye letterbox (yuvarlak yuvarlak kalır, en-boy 1:1). Desen serbest.
    const ringPart = await toInlinePart(body.ringImage, 1024, { squarePad: true });
    const desenPart = await toInlinePart(desenSrc, 1280);

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user" as const, parts: [ringPart, desenPart, { text: buildBezelePrompt(note) }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
        // Çıktı en-boyu = giriş yüzük en-boyu (kare) → yuvarlak tabla ezilip oval olmaz.
        imageConfig: { aspectRatio: "1:1" },
      } as never,
    });

    const parts =
      (result as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
        .candidates?.[0]?.content?.parts ?? [];
    const imgPart = (parts as Array<{ inlineData?: { mimeType: string; data: string } }>).find(
      (p) => p.inlineData?.mimeType?.startsWith("image/"),
    );
    if (!imgPart?.inlineData) {
      return NextResponse.json({ error: "Bezeme üretilemedi, tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({ image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[nakkas/bezele] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
