import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import type { AnalizSonucu } from "../analiz/route";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Watermark ────────────────────────────────────────────────────────────────

async function cropGeminiWatermark(base64: string): Promise<string> {
  try {
    const sharp = (await import("sharp")).default;
    const buf = Buffer.from(base64, "base64");
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 1024;
    const h = meta.height ?? 1024;
    const cropH = Math.floor(h * 0.94); // son %6 kırp
    const result = await sharp(buf)
      .extract({ left: 0, top: 0, width: w, height: cropH })
      .jpeg({ quality: 92 })
      .toBuffer();
    return result.toString("base64");
  } catch {
    return base64;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

const TAKI_EN: Record<string, string> = {
  "Yüzük":     "ring",
  "Kolye Ucu": "pendant",
  "Kolye":     "necklace",
  "Küpe":      "earring",
  "Bilezik":   "bracelet",
  "Broş":      "brooch",
};

const METAL_EN: Record<string, string> = {
  "Sarı Altın":        "18k yellow gold",
  "Rose Gold":         "18k rose gold",
  "Beyaz Altın":       "18k white gold",
  "Gümüş":             "sterling silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const KAMERA: Record<string, string> = {
  "Yüzük":     "three-quarter elevated angle, ring tilted 45 degrees showing both the band and top face, pure white background",
  "Kolye Ucu": "front-facing view, pendant perfectly centered, upper chain visible, pure white background",
  "Kolye":     "front-facing view, pendant centered, chain visible on both sides, slight downward angle, pure white background",
  "Küpe":      "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle, pure white background",
  "Bilezik":   "three-quarter elevated 3/4 angle, camera at 45 degrees above, bracelet on slight diagonal tilt showing depth and curvature, pure white background",
  "Broş":      "perfectly flat front-facing view, entire brooch visible, no perspective distortion, pure white background",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin and delicate",
  "Geometrik":    "geometric",
  "Organik":      "organic",
  "Filigran":     "filigree",
  "Kabartmalı":   "embossed",
  "Asimetrik":    "asymmetric",
};

const MODEL = "gemini-3.1-flash-image-preview";

// ─── Gemini multimodal result extractor ──────────────────────────────────────

type GeminiResult = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: unknown[] } | null;
  }> | null;
};

function extractImageFromResult(result: GeminiResult): string {
  const candidate = result.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts ?? [];

  const textParts = (parts as Array<{ text?: string; inlineData?: unknown; thought?: boolean }>)
    .filter(p => !p.thought && p.text).map(p => p.text).join(" ");
  if (textParts) console.log("[gemini-uret] text:", textParts.slice(0, 150));

  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));

  if (!imgPart?.inlineData) {
    throw new Error(`no_image | finishReason=${finishReason} | parts=${parts.length} | text=${textParts.slice(0, 80)}`);
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const rawKey = process.env.GOOGLE_API_KEY ?? "";
  const googleKey = rawKey
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim() || undefined;

  if (!googleKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  try {
    const body = await req.json() as {
      // Eski format (geriye dönük uyumluluk)
      styleLock?: AnalizSonucu["styleLock"];
      new_design_concept?: string;
      // Yeni format
      takiTipi?: string;
      tema?: string;
      metalRengi?: string;
      formKarakterleri?: string[];
      referansGorsel?: string;
      numImages?: number;
      stilPrompt?: string;
    };

    const {
      styleLock, new_design_concept,
      takiTipi, tema, metalRengi, formKarakterleri, referansGorsel,
      numImages = 1, stilPrompt,
    } = body;

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000)
    );

    // ── Yeni format: referansGorsel + takiTipi → Gemini multi-turn ────────────
    if (referansGorsel && takiTipi) {
      const mimeMatch = referansGorsel.match(/^data:([^;]+);base64,/);
      const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
        "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      const base64Data = referansGorsel.includes(",")
        ? referansGorsel.split(",")[1]
        : referansGorsel;

      // Görseli küçült — büyük görseller Gemini API'yi yavaşlatıyor
      let processedBase64 = base64Data;
      try {
        const sharp = (await import("sharp")).default;
        const buf = Buffer.from(base64Data, "base64");
        const resized = await sharp(buf)
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        processedBase64 = resized.toString("base64");
      } catch {
        processedBase64 = base64Data;
      }

      const takiEn  = TAKI_EN[takiTipi]        ?? takiTipi.toLowerCase();
      const metalEn = METAL_EN[metalRengi ?? ""] ?? "gold";
      const kamera  = KAMERA[takiTipi]           ?? "professional e-commerce jewelry photography, pure white background";
      const temaEn  = tema?.trim() ?? "";
      const formEn  = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
        ? formKarakterleri.map(f => FORM_EN[f] ?? f).join(", ")
        : "";

      const styleAnalysis = stilPrompt ?? "elegant metalwork style";

      const generatePrompt = [
        `Using the exact style described, create a new ${metalEn} ${takiEn}.`,
        `The jewelry type must be: ${takiEn}. Do not generate any other jewelry type.`,
        `Apply the same metal finish, technique, motifs and stones to the ${takiEn} form.`,
        temaEn ? `Theme: ${temaEn}.` : "",
        formEn ? `Form: ${formEn}.` : "",
        `Camera: ${kamera}.`,
        `White studio background. No hands, no model. Single centered piece. Professional jewelry photography.`,
      ].filter(Boolean).join(" ");

      // TURN 3 — Görsel üretim (IMAGE) — numImages kadar paralel
      const tasks = Array.from({ length: Math.min(numImages, 4) }, () =>
        Promise.race([
          ai.models.generateContent({
            model: MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType, data: processedBase64 } },
                  { text: "Analyze ONLY the decorative style. Describe metal, technique, motifs, stones, mood. Do NOT mention jewelry type." },
                ],
              },
              {
                role: "model",
                parts: [{ text: styleAnalysis }],
              },
              {
                role: "user",
                parts: [{ text: generatePrompt }],
              },
            ],
            config: { responseModalities: ["IMAGE", "TEXT"] } as never,
          }),
          timeoutPromise,
        ]).then(async (result) => {
          const dataUrl = extractImageFromResult(result as GeminiResult);
          const raw = dataUrl.split(",")[1] ?? dataUrl;
          const watermarked = await cropGeminiWatermark(raw);
          return `data:image/jpeg;base64,${watermarked}`;
        })
      );

      const results = await Promise.allSettled(tasks);

      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[gemini-uret] task rejected:", r.reason instanceof Error ? r.reason.message : String(r.reason));
        }
      }

      const images = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map(r => r.value);

      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images });
    }

    // ── Eski format: styleLock + new_design_concept → Imagen 3 ───────────────
    if (!styleLock || !new_design_concept) {
      return NextResponse.json(
        { error: "Eksik parametre: styleLock ve new_design_concept ya da takiTipi ve referansGorsel gerekli." },
        { status: 400 }
      );
    }

    const finalPrompt = `
**STYLE LOCK — ABSOLUTE PRIORITY:**
The following design DNA must be replicated with 100% fidelity. All stylistic decisions MUST conform to this locked specification. No creative deviation is permitted.

METAL_FINISH: ${styleLock.metal_finish}
SURFACE_TECHNIQUE: ${styleLock.surface_technique}
DECORATIVE_MOTIFS: ${styleLock.decorative_motifs}
STONE_TREATMENT: ${styleLock.stone_treatment}
OVERALL_MOOD: ${styleLock.overall_mood}
**END STYLE LOCK.**

---

**GENERATION TASK:**
Create a high-end luxury jewelry studio photograph of: ${new_design_concept}

**STRICT APPLICATION RULES:**
1. REPLICATE THE EXACT STYLE: Every visual characteristic in the STYLE LOCK above (metal finish, surface technique, decorative motifs, stone treatment, mood) MUST be precisely applied to this piece.
2. NO DEVIATIONS: Do NOT introduce any new stylistic elements, techniques, or interpretations not present in the STYLE LOCK. The piece must look like it belongs to the exact same collection as the reference.
3. PHOTOGRAPHIC PRESENTATION: ${styleLock.photography_setting}
4. NEGATIVE: No hands, no model, no body parts, no text overlays, no watermarks, no blurred elements.
`.trim();

    const response = await Promise.race([
      ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "1:1",
          outputMimeType: "image/jpeg",
          // @ts-expect-error — compressionQuality is valid but not typed yet in SDK
          compressionQuality: 95,
        },
      }),
      timeoutPromise,
    ]);

    const imageBytes = (response as { generatedImages?: Array<{ image?: { imageBytes?: string } }> })
      .generatedImages?.[0]?.image?.imageBytes;

    if (!imageBytes) {
      return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    const watermarked = await cropGeminiWatermark(imageBytes);
    return NextResponse.json({ images: [`data:image/jpeg;base64,${watermarked}`] });

  } catch (err: unknown) {
    console.error("[gemini-uret] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    let userMsg = "Görsel üretimi başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
