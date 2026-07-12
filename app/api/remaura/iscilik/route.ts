import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { falUpscaleToDataUri } from "@/lib/remaura/aci-lab-upscale";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * İŞÇİLİK (kişisel, süper-admin) — TEK KURAL: birinci görselin TASARIMI
 * korunur, ikinci görselin (işçilik referansı) USTA-KALİTE işçiliğine
 * çevrilir: derin heykelsi rölyef, mikro detay yoğunluğu, gerçek metal/
 * mine dokusu, kuyumcu çekimi gerçekçiliği.
 * Açı aracıyla aynı kalıp: referans görsel tek işçilik otoritesi;
 * kayıtlı varsayılan referans public/remaura-iscilik-ref.jpg'de yaşar.
 */

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

const DEFAULT_REF_FILE = path.join(process.cwd(), "public", "remaura-iscilik-ref.jpg");

async function resolveRefImage(refImage: string | undefined): Promise<string | null> {
  if (!refImage) return null;
  if (refImage !== "default") return refImage;
  try {
    const buf = await readFile(DEFAULT_REF_FILE);
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.warn("[iscilik] varsayılan referans okunamadı:", e instanceof Error ? e.message : e);
    return null;
  }
}

// İşçilik şiddeti: sayısal kaydırıcı → kademeli komut dili (modeller
// yüzdeden çok kademe tarifini dinler).
function strengthBlock(strength: number): string {
  if (strength <= 33) {
    return "CRAFT INTENSITY — LIGHT (do NOT overdo): apply the craftsmanship gently. Keep the source's overall rendering character largely intact; add moderate relief depth, light surface texture and gentle material realism. The result reads as a refined, physically plausible version of the source — NOT a dramatic transformation.";
  }
  if (strength <= 66) {
    return "CRAFT INTENSITY — MEDIUM: a clearly hand-crafted result. Pronounced relief depth, rich surface texture, believable real materials — a genuine crafted piece, while staying visually close to the source's character.";
  }
  return "CRAFT INTENSITY — MAXIMUM: push the workmanship to the highest master level — the deepest sculptural relief, the densest micro-detail, the richest hand-worked surfaces and finishing. The transformation from illustration to physical masterpiece is TOTAL.";
}

function buildIscilikPrompt(craftNote?: string, hasRef?: boolean, strength = 70): string {
  const noteLine = craftNote?.trim()
    ? `DESIGNER'S NOTE — AUTHORITATIVE (obey exactly): ${craftNote.trim()}.`
    : "";

  const refBlock = hasRef
    ? [
        "You are given two images. The FIRST image is the DESIGN SOURCE. The SECOND image is ONLY a CRAFTSMANSHIP reference.",
        "CRAFTSMANSHIP = THE SECOND IMAGE. Copy ONLY its level of workmanship: extreme micro-detail density, deep sculptural relief with true physical depth and undercuts, crisply separated elements, realistic hand-chased metal surface work, fine texture in every area, patina/darkening inside recesses, enamel executed as real vitreous enamel, master-jeweler finishing quality, and professional jewelry-photography realism.",
        "Do NOT copy the second image's subject, motifs, composition, frame style or colors — none of its design content. Only its QUALITY of execution.",
      ].join("\n")
    : "CRAFTSMANSHIP TARGET: master-jeweler execution — extreme micro-detail density, deep sculptural relief with true physical depth and undercuts, crisply separated elements, realistic hand-chased metal surfaces, patina in recesses, real vitreous enamel where the design has color fills, professional jewelry-photography realism.";

  return [
    refBlock,
    strengthBlock(strength),
    "TASK: Re-create the FIRST image's design as a REAL, PHYSICALLY CRAFTED piece of master-level jewelry, photographed professionally. The result must look like an actual handcrafted piece a master goldsmith spent weeks on — not a digital illustration.",
    "PRESERVE FROM THE FIRST IMAGE — STRICT: the entire design identity — composition, motifs, silhouette, proportions, layout, and the COLOR/MATERIAL SCHEME (its gold areas stay gold; its colored areas become real enamel or stone inlay of the SAME colors). Do NOT redesign, simplify, add or remove any element; do NOT change the color scheme.",
    noteLine,
    "TRANSFORM: flat or illustrated areas of the first image become genuinely three-dimensional — engraved lines become carved channels with depth, flat fills become sculpted relief or enamel pools with raised metal borders, outlines become real metal edges catching light.",
    "OUTPUT: clean seamless white studio background, single centered piece, soft professional jewelry lighting, no hands, no model, no text, no watermark.",
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
      /** "default" | dataURL — işçilik referansı */
      refImage?: string;
      upscaleFirst?: boolean;
      craftNote?: string;
      /** 0-100 — işçilik şiddeti */
      strength?: number;
    };

    if (!body.image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }

    let sourceImage = body.image;
    if (body.upscaleFirst) {
      try {
        sourceImage = await falUpscaleToDataUri(body.image, 2, "clarity");
      } catch (e) {
        console.error("[iscilik] upscale atlandı:", e instanceof Error ? e.message : e);
      }
    }

    const googleKey = sanitizeGoogleKey();
    if (!googleKey) {
      return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
    }

    const jpeg = await prepareImage(sourceImage);
    const resolvedRef = await resolveRefImage(body.refImage);
    const refJpeg = resolvedRef ? await prepareImage(resolvedRef) : null;
    const strength = Math.min(100, Math.max(0, Number(body.strength) || 70));
    const promptUsed = buildIscilikPrompt(body.craftNote, Boolean(refJpeg), strength);

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user" as const,
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
            ...(refJpeg
              ? [{ inlineData: { mimeType: "image/jpeg", data: refJpeg.toString("base64") } }]
              : []),
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
      return NextResponse.json({ error: "İşçilik dönüştürülemedi, tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`,
    });
  } catch (err) {
    console.error("[iscilik] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "İşçilik dönüştürme sırasında bir sorun oluştu, tekrar deneyin." },
      { status: 500 },
    );
  }
}
