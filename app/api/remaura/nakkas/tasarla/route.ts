import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { falUpscaleToDataUri } from "@/lib/remaura/aci-lab-upscale";
import { buildRingThreeQuarterBlock, RING_VIEW_SENTINEL } from "@/lib/remaura/internal-visual-rules";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * NAKKAŞ — DESENDEN YÜZÜK TASARLA (izole deney).
 * Yüklenen kasa YOK. Desen + kullanıcı brief'i → Gemini SIFIRDAN yeni bir yüzük
 * tasarlar, deseni üstüne DERİN RÖLYEF sarar, BİZİM SABİT 3/4 açımızla render eder.
 * Desen arka planda MUTLAKA clarity'den geçer.
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

/** data-URI/URL → Gemini inlineData (jpeg). */
async function toInlinePart(src: string, maxPx: number): Promise<{ inlineData: { mimeType: string; data: string } }> {
  let buf: Buffer;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const b64 = src.includes(",") ? src.split(",")[1]! : src;
    buf = Buffer.from(b64, "base64");
  }
  const sharp = (await import("sharp")).default;
  const out = await sharp(buf)
    .rotate()
    .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();
  return { inlineData: { mimeType: "image/jpeg", data: out.toString("base64") } };
}

function buildTasarlaPrompt(brief: string): string {
  // Bizim sabit yüzük 3/4 kamerası (aydınlatma satırı atılır — 3D için specular yasak).
  const ringCamera = buildRingThreeQuarterBlock("oxidized silver ring")
    .replace(RING_VIEW_SENTINEL, "")
    .replace(/LIGHTING:[\s\S]*$/i, "")
    .trim();

  return [
    "You are given ONE image: an ornamental metal PATTERN (relief ornament) — a TEXTURE / MOTIF SOURCE ONLY, never a shape or background source.",
    "TASK: DESIGN A BRAND-NEW luxury jewelry RING as briefed below, then cover its visible surfaces — the top face/tabla, the shoulders AND the band — with the ornamental pattern from the image as DEEP CARVED metal RELIEF that wraps naturally around the ring's 3D form.",
    `RING DESIGN BRIEF (what to design): ${brief.trim()}`,
    ringCamera,
    "FLAT TABLA / SIGNET TOP: if the design has a flat top plate (tabla), that top face must sit perfectly LEVEL and HORIZONTAL — a flat table-top plane perpendicular to the vertical finger axis, NOT tilted or sloped.",
    "RELIEF: deep, multi-layered high relief with strong ambient-occlusion shadows in the recesses so it reads as TRUE 3D sculpted metal; fine filigree + granulation, crisp cleanly-separated detail, razor-sharp edges.",
    "NO STONES: pure metal only — no gemstones, no set stones (empty settings if any).",
    "SURFACE — NO REFLECTIONS: uniform MATTE metal, NO specular highlights, NO glare, NO mirror reflections (they corrupt image-to-3D).",
    "FINISH & PATINA: antique / oxidized single-tone SILVER only (no gold, no color, no two-tone), close grayscale tones — bright silver highlights on raised relief, dark anthracite (~#333333, NOT pure black) in the recesses, soft gradients, aged patina depth.",
    "OUTPUT: a single newly-designed ring on a pure seamless white background, no hands, no model, no text, no cast shadow — the pattern now real 3D metal relief on the ring, crisp hard silhouette, 3D-reconstruction friendly.",
  ].join("\n");
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const googleKey = sanitizeGoogleKey();
  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
  }

  try {
    const body = (await req.json()) as { desenImage?: string; prompt?: string };
    if (!body.desenImage) {
      return NextResponse.json({ error: "Desen gerekli." }, { status: 400 });
    }
    const brief = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!brief) {
      return NextResponse.json({ error: "Yüzük tasarım açıklaması yazın." }, { status: 400 });
    }

    // ZORUNLU: desen arka planda clarity'den geçer. Hata olursa orijinalle devam.
    let desenSrc = body.desenImage;
    try {
      desenSrc = await falUpscaleToDataUri(body.desenImage, 2, "clarity");
    } catch (e) {
      console.error("[nakkas/tasarla] clarity atlandı:", e instanceof Error ? e.message : e);
    }

    const desenPart = await toInlinePart(desenSrc, 1280);

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user" as const, parts: [desenPart, { text: buildTasarlaPrompt(brief) }] }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
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
      return NextResponse.json({ error: "Yüzük tasarlanamadı, tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({ image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[nakkas/tasarla] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
