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

/**
 * TEK KURAL — 3D-GÜVENLİ ALÇAK AÇI (saha bulgusu: 30-45° yukarıdan kamera,
 * image-to-3D motorunun perspektif kısalmasını fiziksel eğim sanmasına ve
 * tablanın EĞİK kurulmasına yol açıyor. Bu yüzden kamera alçak tutulur).
 *
 * look="natural": taş/mine/cila korunur (vitrin görseli).
 * look="prep3d": taşsız + mat + gölgesiz (image-to-3D girdisi — parlama ve
 * taşlar mesh'i bozduğu için repoz'daki kanıtlanmış yüzey kuralları).
 */
function buildAciPrompt(look: "natural" | "prep3d", shapeNote?: string): string {
  const noteLine = shapeNote?.trim()
    ? `DESIGNER'S GEOMETRY NOTE — AUTHORITATIVE (the designer knows the true CAD geometry; obey exactly): ${shapeNote.trim()}. Any apparent distortion in the reference is PERSPECTIVE from the viewing angle, NOT the real shape — render the stated geometry precisely.`
    : "";

  const identityLine =
    look === "natural"
      ? "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — metal color and polished finish, ALL gemstones exactly as they are (same stones, same colors, same count, same positions), enamel/color fills, motifs, engraving and any lettering or inscriptions, silhouette, band/shoulder shape and proportions. Change NOTHING about the piece itself; only change the camera pose."
      : "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — motifs, ornament, engraving and any lettering or inscriptions, silhouette, band/shoulder shape and proportions. Do NOT invent, restyle or simplify anything; only change the camera pose and the surface treatment rules below.";

  const cameraBlock = [
    "CAMERA — 3D-SAFE LOW ANGLE (CRITICAL): near eye-level product shot. The camera is elevated only 10–15 degrees above the piece — a LOW elevation. NOT a high angle, NOT 30–45 degrees, NOT looking down at the piece.",
    "HORIZONTAL ORBIT: camera orbits about 30 degrees to the right of front-center, so the front face and the right side band are both visible and the piece's depth reads clearly.",
    "LENS: long telephoto look with MINIMAL perspective distortion (near-orthographic) — parallel edges must stay parallel; no wide-angle foreshortening.",
    "RING POSE: standing upright on its shank, band vertical, decorative head on top. The flat top plate (tabla) must read PERFECTLY LEVEL and HORIZONTAL in world space — perpendicular to the finger axis, appearing as a very SHALLOW, SYMMETRIC ellipse. Do NOT tip or tilt the top face toward the camera. The finger opening is clearly OPEN and visible at the bottom.",
    "IF THE PIECE IS NOT A RING (pendant, medallion, earring, bracelet): same spirit — low-elevation three-quarter view, main face level and undistorted, depth visible.",
  ].join("\n");

  const surfaceLines =
    look === "natural"
      ? [
          "LIGHTING & LOOK: soft professional studio product lighting. KEEP the metal's natural polished shine and the gemstones' natural sparkle — realistic luxury product photography; do NOT flatten or matte the surfaces.",
          "OUTPUT: clean seamless white studio background, a very subtle soft shadow beneath the piece is allowed, no hands, no model, no props, no added text or watermark. Do not add, remove or alter any detail of the piece.",
        ]
      : [
          "REMOVE STONES: render every gemstone setting as an EMPTY bezel / empty prongs — no diamonds, no gemstones, empty settings only. (Stones are stripped for 3D and casting.)",
          "SURFACE — NO REFLECTIONS: render the metal as a UNIFORM MATTE surface — NO specular highlights, NO glare, NO mirror reflections, NO shiny hotspots (they get misread by image-to-3D and corrupt the mesh).",
          "PRESERVE & EMPHASIZE RELIEF DEPTH: render every carved detail with crisp, deep, pronounced relief — sharp edges, clearly separated elements, deep recesses reading dark via soft self-shadowing. Even diffuse lighting; never flatten the relief. Do NOT add, remove or alter any detail — only render the piece's OWN ornament at full depth.",
          "OUTPUT: pure seamless white background, NO shadow of any kind, single centered piece, no hands, no model, no text; crisp hard silhouette edges for clean mesh reconstruction.",
        ];

  return [
    identityLine,
    noteLine,
    "TASK: Re-photograph this exact piece at the 3D-safe camera pose described below.",
    cameraBlock,
    ...surfaceLines,
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
      look?: "natural" | "prep3d";
    };

    if (!body.image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }
    const look = body.look === "natural" ? "natural" : "prep3d";

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
    const promptUsed = buildAciPrompt(look, body.shapeNote);

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
