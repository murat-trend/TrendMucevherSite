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
function buildAciPrompt(look: "natural" | "prep3d", shapeNote?: string, hasPoseRef?: boolean): string {
  const noteLine = shapeNote?.trim()
    ? `DESIGNER'S GEOMETRY NOTE — AUTHORITATIVE (the designer knows the true CAD geometry; obey exactly): ${shapeNote.trim()}. Any apparent distortion in the reference is PERSPECTIVE from the viewing angle, NOT the real shape — render the stated geometry precisely.`
    : "";

  const identityLine =
    look === "natural"
      ? "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — metal color and polished finish, ALL gemstones exactly as they are (same stones, same colors, same count, same positions), enamel/color fills, motifs, engraving and any lettering or inscriptions, silhouette, band/shoulder shape and proportions. Change NOTHING about the piece itself; only change the camera pose."
      : "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — motifs, ornament, engraving and any lettering or inscriptions, silhouette, band/shoulder shape and proportions. Do NOT invent, restyle or simplify anything; only change the camera pose and the surface treatment rules below.";

  const cameraBlock = [
    "CAMERA — RAISED SIDE VIEW (CRITICAL, OVERRIDES YOUR DEFAULT PRODUCT-SHOT HABITS): start from a PURE SIDE PROFILE of the ring — camera at the ring's own height, looking at its side — then raise the camera by only 15–20 degrees. The result is a side view seen slightly from above. It is NOT a product hero shot lowered down; it is a side profile raised up.",
    "WHAT THIS MEANS VISUALLY: the flat top plate (tabla) appears as a SHALLOW but READABLE ellipse — squashed to roughly one-third of its full height. The face design is partially readable at a glancing angle; the side profile (band, shoulder ornament, head thickness) still dominates the frame.",
    "LEVELNESS TEST — THE IMAGE MUST PASS THIS: the flat top plate behaves like a WATER LEVEL. Its NEAR edge and FAR edge are both HORIZONTAL, PARALLEL straight lines in the image. The plate must NOT slant left-to-right, must NOT tip toward the camera, must NOT tip away. If the plate's plane looks slanted in ANY direction, the image is WRONG — regenerate it level.",
    "WRONG (do NOT produce): any camera elevated 30 degrees or more; any 'hero' three-quarter shot looking down where the face reads almost like a top view; any image where the top plate is slanted or tipped. ALSO WRONG: a pure edge-on side view where the top face is completely invisible.",
    "HORIZONTAL ORBIT: camera orbits about 30 degrees to the right of front-center, so front and right side both read and the piece's depth is visible.",
    "LENS: long telephoto, MINIMAL perspective (near-orthographic) — parallel edges stay parallel; no wide-angle foreshortening.",
    "RING POSE: standing upright on its shank, band vertical, head on top. The tabla plane stays PERFECTLY LEVEL and HORIZONTAL — perpendicular to the finger axis. Do NOT tip the face toward the camera. The finger opening is clearly OPEN and visible.",
    "IF THE PIECE IS NOT A RING (pendant, medallion, earring, bracelet): same spirit — low-elevation near-side view, main face level and undistorted, depth visible.",
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

  // Poz referansı varsa metin kamerası TAMAMEN devre dışı — referans tek otorite.
  // (Ders: metin kamera bloğu referansla çatışınca model metni dinliyor.)
  const poseRefBlock = [
    "You are given two images. The FIRST image is the jewelry piece to re-photograph. The SECOND image is ONLY a camera-pose reference.",
    "CAMERA = THE REFERENCE IMAGE. The second image defines the camera completely: copy its elevation, its orbit/rotation, its distance, its framing and its perspective EXACTLY. Render the FIRST image's piece at precisely that camera pose. IGNORE the reference's design, materials and colors — only its camera pose matters.",
    "The top plate's plane must sit exactly as it sits in the reference pose — no extra tilt in any direction beyond what the reference shows.",
  ].join("\n");

  return [
    identityLine,
    noteLine,
    hasPoseRef
      ? "TASK: Re-photograph this exact piece at the camera pose of the reference image."
      : "TASK: Re-photograph this exact piece at the 3D-safe camera pose described below.",
    hasPoseRef ? poseRefBlock : cameraBlock,
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
      /** İsteğe bağlı poz referansı: kamera açısı bu görselden birebir kopyalanır */
      poseImage?: string;
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
    const poseJpeg = body.poseImage ? await prepareImage(body.poseImage) : null;
    const promptUsed = buildAciPrompt(look, body.shapeNote, Boolean(poseJpeg));

    const ai = new GoogleGenAI({ apiKey: googleKey });
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user" as const,
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } },
            ...(poseJpeg
              ? [{ inlineData: { mimeType: "image/jpeg", data: poseJpeg.toString("base64") } }]
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
