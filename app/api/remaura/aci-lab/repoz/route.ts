import { loadEnvConfig } from "@next/env";
import OpenAI, { toFile } from "openai";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { getOpenAIApiKey } from "@/lib/api/openai";
import {
  buildRingThreeQuarterBlock,
  RING_VIEW_SENTINEL,
} from "@/lib/remaura/internal-visual-rules";
import { falUpscaleToDataUri, type UpscaleModel } from "@/lib/remaura/aci-lab-upscale";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * AÇI LAB — POZ NORMALİZE (izole deney).
 *
 * Müşterinin KÖTÜ AÇILI yüzük görselini alıp, ARKA PLANDA aynı tasarımı
 * bizim ideal ürün açısına (yüzük 3/4 45° / madalyon cephe) + BOŞ KASA
 * (3D için taşlar çıkarılır) olarak yeniden render eder. Müşteri bu adımı
 * hiç görmez (üretim sırrı). İki motor A/B: gpt-image-2 edit / Gemini.
 * Canlı akışa dokunmaz.
 */

const GEMINI_MODEL = "gemini-3.1-flash-image-preview";

const FRONT_MEDALLION_CAMERA = `CAMERA: strict frontal product shot — camera perpendicular and centered, 0-degree tilt. The flat medallion/face plate fully faces the camera and reads flat and readable, symmetric. The band is visible below with the finger opening clearly OPEN. NOT tilted, NOT angled, NOT bird's-eye, no perspective distortion.`;

function buildRepozePrompt(type: "yuzuk" | "madalyon", shapeNote?: string): string {
  // Yüzük kamera bloğu — açı/poz/çerçeve alınır AMA aydınlatma satırı ATILIR
  // (o satır "specular highlights + deep shadows" istiyor; 3D için yasak).
  const ringCamera = buildRingThreeQuarterBlock("gold or silver ring")
    .replace(RING_VIEW_SENTINEL, "")
    .replace(/LIGHTING:[\s\S]*$/i, "")
    .trim();
  const camera = type === "madalyon" ? FRONT_MEDALLION_CAMERA : ringCamera;

  // Tasarımcının geometri notu — OTORİTE. Modele kasanın gerçek şeklini söyler
  // (tek görselden tahmin etmesin): girişteki elips perspektiftir, oval değil.
  const noteLine = shapeNote?.trim()
    ? `DESIGNER'S GEOMETRY NOTE — AUTHORITATIVE (the designer knows the true CAD geometry; obey exactly): ${shapeNote.trim()}. This is ground truth for the ring's shape. Any apparent ellipse/distortion in the reference is PERSPECTIVE from the viewing angle, NOT the real shape — render the stated geometry precisely (e.g. a round tabla must read as a true circle, never an oval).`
    : "";

  // Düz tablalı signet için KRİTİK: tabla dünyada YATAY/level olmalı (parmak eksenine
  // dik). image-to-3D perspektif kısalmasını fiziksel eğim sanıp mesh'i eğik kuruyor.
  const tablaLevelLine =
    type === "yuzuk"
      ? "FLAT TABLA / SIGNET TOP — CRITICAL FOR 3D: if the ring has a flat top plate (tabla / signet face), that top face must sit perfectly LEVEL and HORIZONTAL in world space — a flat table-top plane, PERPENDICULAR to the ring's vertical finger axis. It must NOT tilt, slope, lean or tip forward/back/sideways. The flat top and the finger opening must be parallel; the tabla reads as a level flat surface (so image-to-3D reconstructs a FLAT, non-tilted tabla, not a sloped one)."
      : "";

  return [
    "STRICT: This is the SAME piece of jewelry shown in the reference image. Preserve its EXACT design identity — metal color/finish, motifs, ornament, engraving, silhouette, band/shoulder shape, proportions and overall character. Do NOT invent, restyle or simplify anything; only change the camera pose.",
    noteLine,
    "TASK: Re-photograph this exact piece at a clean, production-ready angle optimized for image-to-3D mesh reconstruction.",
    camera,
    tablaLevelLine,
    "REMOVE STONES: render every gemstone setting as an EMPTY bezel / empty prongs — no diamonds, no gemstones, empty settings only. (Stones are stripped for 3D and casting.)",
    "SURFACE — NO REFLECTIONS: render the metal as a UNIFORM MATTE surface — NO specular highlights, NO glare, NO mirror reflections, NO shiny hotspots (they get misread by image-to-3D and corrupt the mesh).",
    "NO CAST SHADOW: no drop shadow, no ground/contact shadow, no shadow cast onto the background — the piece floats on pure flat white with nothing behind or beneath it.",
    "PRESERVE & EMPHASIZE RELIEF DEPTH — MOST CRITICAL: render every carved detail with CRISP, DEEP, PRONOUNCED relief — sharp, well-defined edges, clearly separated elements, open engraved channels and readable undercuts. Deep recesses must read dark and deep via soft self-shadowing / ambient occlusion, so the true depth is fully captured for accurate 3D reconstruction. Use even, soft, diffuse lighting but NEVER flatten, soften or wash out the relief. (The physical piece LOSES fine detail during casting, filing/finishing and polishing — so the model's relief must be deep and crisp enough to survive that loss.) IMPORTANT: do NOT add, remove or alter any detail — only render the piece's OWN existing ornament at full depth and maximum crispness.",
    "OUTPUT: pure seamless white background, single centered piece, no hands, no model, no text, no background shadow; crisp hard silhouette edges and clear relief separation for clean mesh reconstruction.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Byte + piksel küçültme (413'e karşı) → max 1024px jpeg. */
async function prepareImage(src: string): Promise<Buffer> {
  let raw: Buffer;
  if (/^https?:\/\//i.test(src)) {
    // Upscale çıktısı fal URL'i olabilir → sunucudan indir (CORS yok)
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

/**
 * Çerçeve normalize — çıktıyı standart üretim boyutuna getirir.
 * Letterbox/kenar bantlarını kırpar → parçayı beyaz 1024² kareye ortalar (~%82).
 * Böylece TÜM çıktılar aynı boyut/çerçeve (görsel disiplini) + 3D için iyi kadraj.
 * Başarısız olursa orijinali döndürür (asla sonucu bozma).
 */
async function normalizeFraming(dataUrl: string): Promise<string> {
  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
    const sharp = (await import("sharp")).default;
    let buf: Buffer = Buffer.from(base64, "base64");
    // İki geçiş trim: 1) dış bant (ör. siyah letterbox) 2) iç düz zemin (beyaz)
    for (let i = 0; i < 2; i++) {
      try {
        buf = await sharp(buf).trim({ threshold: 12 }).toBuffer();
      } catch {
        break;
      }
    }
    const S = 1024;
    const inner = Math.round(S * 0.82);
    const fitted = await sharp(buf)
      .resize(inner, inner, { fit: "inside", withoutEnlargement: false })
      .toBuffer();
    const out = await sharp({
      create: { width: S, height: S, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: fitted, gravity: "center" }])
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl;
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
      engine?: "openai" | "gemini";
      type?: "yuzuk" | "madalyon";
      upscaleFirst?: boolean;
      upscaleScale?: number;
      upscaleModel?: UpscaleModel;
      shapeNote?: string;
    };

    if (!body.image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }
    const engine = body.engine === "gemini" ? "gemini" : "openai";
    const type = body.type === "madalyon" ? "madalyon" : "yuzuk";
    const shapeNote = typeof body.shapeNote === "string" ? body.shapeNote : undefined;

    // Opsiyonel: Gemini'DEN ÖNCE Real-ESRGAN ile netleştir (bulanık girdi için).
    let sourceImage = body.image;
    let upscaled = false;
    if (body.upscaleFirst) {
      try {
        sourceImage = await falUpscaleToDataUri(
          body.image,
          body.upscaleScale ?? 2,
          body.upscaleModel ?? "clarity",
        );
        upscaled = true;
      } catch (e) {
        console.error("[aci-lab/repoz] upscale atlandı:", e instanceof Error ? e.message : e);
      }
    }

    const jpeg = await prepareImage(sourceImage);
    const promptUsed = buildRepozePrompt(type, shapeNote);

    let image: string | undefined;

    if (engine === "openai") {
      const apiKey = getOpenAIApiKey();
      if (!apiKey) {
        return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
      }
      const client = new OpenAI({ apiKey });
      const file = await toFile(jpeg, "source.jpg", { type: "image/jpeg" });
      const result = await client.images.edit({
        model: "gpt-image-2",
        image: file,
        prompt: promptUsed,
        size: "1024x1024",
        quality: "high",
      });
      const b64 = result.data?.[0]?.b64_json;
      if (b64) image = `data:image/png;base64,${b64}`;
    } else {
      const googleKey = sanitizeGoogleKey();
      if (!googleKey) {
        return NextResponse.json({ error: "Servis yapılandırılmamış." }, { status: 500 });
      }
      const ai = new GoogleGenAI({ apiKey: googleKey });
      // Yüzük kare tuvalde gelir → aspectRatio 1:1 pin (tuval-ezilmesi = oval sapmayı
      // önler). Madalyon serbest (cephe kadrajı kare olmayabilir).
      const geminiConfig: Record<string, unknown> = {
        responseModalities: ["IMAGE", "TEXT"],
        thinkingConfig: { thinkingBudget: 0 },
      };
      if (type === "yuzuk") geminiConfig.imageConfig = { aspectRatio: "1:1" };
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
        config: geminiConfig as never,
      });
      const parts =
        (result as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
          .candidates?.[0]?.content?.parts ?? [];
      const imgPart = (parts as Array<{ inlineData?: { mimeType: string; data: string } }>).find(
        (p) => p.inlineData?.mimeType?.startsWith("image/"),
      );
      if (imgPart?.inlineData) {
        image = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
      }
    }

    if (!image) {
      return NextResponse.json({ error: "Görsel üretilemedi, tekrar deneyin." }, { status: 500 });
    }

    // Tüm çıktıları aynı üretim boyutuna getir (letterbox kırp + kareye ortala).
    image = await normalizeFraming(image);

    return NextResponse.json({ image, promptUsed, meta: { engine, type, upscaled } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[aci-lab/repoz] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
