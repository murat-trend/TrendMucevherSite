import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { falUpscaleToDataUri } from "@/lib/remaura/aci-lab-upscale";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * AÇI (kişisel) — TEK KURAL: yüklenen parça, imza "kahraman" ürün açısına
 * çevrilir. repoz'dan FARKI: 3D-hazırlık kuralları YOK — taşlar, mine,
 * cila, yazıt, her şey aynen korunur; yalnız kamera pozu değişir.
 * (nakkaş/açı-lab'ın repoz komutuna dokunulmaz — bu izole bir varyanttır.)
 */

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

function buildHeroAnglePrompt(shapeNote?: string): string {
  const noteLine = shapeNote?.trim()
    ? `DESIGNER'S GEOMETRY NOTE — AUTHORITATIVE (the designer knows the true CAD geometry; obey exactly): ${shapeNote.trim()}. Any apparent distortion in the reference is PERSPECTIVE from the viewing angle, NOT the real shape — render the stated geometry precisely.`
    : "";

  return [
    "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — metal color and polished finish, ALL gemstones exactly as they are (same stones, same colors, same count, same positions), enamel/color fills, motifs, engraving and any lettering or inscriptions, silhouette, band/shoulder shape and proportions. Change NOTHING about the piece itself; only change the camera pose.",
    noteLine,
    "TASK: Re-photograph this exact piece at the signature hero product angle described below.",
    "CAMERA — SIGNATURE HERO ANGLE: classic three-quarter elevated product shot. The camera is raised about 30–40 degrees above the piece and slightly to the front-left. The ring stands upright; its top face (tabla) tilts toward the camera so the ENTIRE face design is clearly visible and readable as a near-full ellipse in the upper part of the frame. The front-left shoulder/side ornament is visible; the finger opening is clearly OPEN and visible below, with the inner band surface sweeping to the lower right. Single centered piece filling about 80% of the frame.",
    "IF THE PIECE IS NOT A RING (pendant, medallion, earring, bracelet): apply the same spirit — an elevated three-quarter angle where the main face is fully readable and the piece's depth and side details are visible.",
    "LIGHTING & LOOK: soft professional studio product lighting. KEEP the metal's natural polished shine and the gemstones' natural sparkle — realistic luxury product photography; do NOT flatten or matte the surfaces.",
    "OUTPUT: clean seamless white studio background, a very subtle soft shadow beneath the piece is allowed, no hands, no model, no props, no added text or watermark. Do not add, remove or alter any detail of the piece.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Byte + piksel küçültme (413'e karşı) → max 1024px jpeg. */
async function prepareImage(src: string): Promise<Buffer> {
  let raw: Buffer;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Görsel indirilemedi (${res.status}).`);
    raw = Buffer.from(await res.arrayBuffer());
  } else {
    const base64 = src.includes(",") ? src.split(",")[1]! : src;
    raw = Buffer.from(base64, "base64");
  }
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(raw)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch {
    return raw;
  }
}

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

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as {
      image?: string;
      upscaleFirst?: boolean;
      shapeNote?: string;
    };

    if (!body.image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }

    // Opsiyonel: önce netleştir (bulanık girdi için).
    let sourceImage = body.image;
    if (body.upscaleFirst) {
      try {
        sourceImage = await falUpscaleToDataUri(body.image, 2, "clarity");
      } catch (e) {
        console.error("[aci] upscale atlandı:", e instanceof Error ? e.message : e);
      }
    }

    const googleKey = sanitizeGoogleKey();
    if (!googleKey) {
      return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
    }

    const jpeg = await prepareImage(sourceImage);
    const promptUsed = buildHeroAnglePrompt(body.shapeNote);

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user" as const,
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
            { text: promptUsed },
          ],
        },
      ],
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
      return NextResponse.json({ error: "Açı çevrilemedi, tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    });
  } catch (err) {
    console.error("[aci] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Açı çevirme sırasında bir sorun oluştu, tekrar deneyin." },
      { status: 500 },
    );
  }
}
