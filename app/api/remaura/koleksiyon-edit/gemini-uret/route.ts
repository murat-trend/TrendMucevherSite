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
    const cropH = Math.floor(h * 0.90); // son %10 kırp
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

// ─── Gemini multimodal helpers ────────────────────────────────────────────────

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
    const { styleLock, new_design_concept, referansGorsel } = await req.json() as {
      styleLock: AnalizSonucu["styleLock"];
      new_design_concept: string;
      referansGorsel?: string; // base64 data URL — opsiyonel
    };

    if (!styleLock || !new_design_concept) {
      return NextResponse.json(
        { error: "Eksik parametre: styleLock ve new_design_concept gerekli." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: googleKey });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000)
    );

    // ── Referans görsel varsa: multimodal (görsel + prompt) ───────────────────
    if (referansGorsel?.startsWith("data:")) {
      const mimeMatch = referansGorsel.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch?.[1] ?? "image/jpeg";
      const base64Data = referansGorsel.split(",")[1] ?? referansGorsel;

      const prompt = `You are given a reference jewelry product photograph.

Create a NEW piece that is: ${new_design_concept}

**STYLE LOCK — replicate EVERY visual detail from the reference image:**
- Metal finish: ${styleLock.metal_finish}
- Surface technique: ${styleLock.surface_technique}
- Decorative motifs: ${styleLock.decorative_motifs}
- Stone treatment: ${styleLock.stone_treatment}
- Overall mood: ${styleLock.overall_mood}

CRITICAL: You can SEE the reference. Every decorative element (flowers, enamel, engravings, stone settings, textures) visible in the reference MUST appear on the new piece. Do NOT simplify or omit any motif.
The ONLY change is the jewelry type — make it a ${new_design_concept}, not a copy of the reference shape.

PHOTOGRAPHIC PRESENTATION: ${styleLock.photography_setting}
No hands, no model, no body parts, no text overlays, no watermarks.`;

      const result = await Promise.race([
        ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt },
            ],
          }],
          config: { responseModalities: ["IMAGE", "TEXT"] } as never,
        }),
        timeoutPromise,
      ]);

      const dataUrl = extractImageFromResult(result);
      const raw = dataUrl.split(",")[1] ?? dataUrl;
      const watermarked = await cropGeminiWatermark(raw);
      return NextResponse.json({
        success: true,
        image: `data:image/jpeg;base64,${watermarked}`,
      });
    }

    // ── Referans görsel yok: Imagen 3 metin bazlı ────────────────────────────
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
1. REPLICATE THE EXACT STYLE: Every visual characteristic in the STYLE LOCK above MUST be precisely applied to this piece.
2. NO DEVIATIONS: The piece must look like it belongs to the exact same collection as the reference.
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
    return NextResponse.json({
      success: true,
      image: `data:image/jpeg;base64,${watermarked}`,
    });

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
