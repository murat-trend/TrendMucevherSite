import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { GoogleGenAI } from "@google/genai";

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

async function requireAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const FONT_PROMPTS: Record<string, string> = {
  "cursive-thin":
    "elegant thin cursive script with flowing hairline strokes, graceful swirls at terminals, thin-to-thick calligraphic contrast, luxury jewelry wire quality",
  "cursive-bold":
    "bold dramatic cursive script with thick flowing strokes, expressive calligraphic loops and swirls, strong thick-to-thin contrast, statement piece quality",
  "block-serif":
    "classic bold block serif letter, solid 3D body, clean geometric serifs, monogram style, luxury engraved finish",
  "wire-minimal":
    "ultra-thin single-stroke wire script, delicate hairline cursive, fine jewelry wire bent into letter shape, airy open design",
};

const METAL_PROMPTS: Record<string, string> = {
  "yellow-gold":  "18k polished yellow gold, warm golden hue, mirror-bright finish",
  "rose-gold":    "18k polished rose gold, warm pink tone, reflective finish",
  "white-gold":   "18k polished white gold, cool bright silver-white sheen",
  "silver":       "sterling silver 925, bright cool silver, high polish",
};

const DECORATION_PROMPTS: Record<string, string> = {
  "plain":     "plain polished metal surface, no stones, pure mirror finish, light reflections along curves",
  "diamond":   "fully pavé-set with brilliant-cut round diamonds along the entire surface, sparkling brilliance",
  "floral":    "delicate white enamel flower accents with tiny diamond centers, soft organic motifs wrapping the letter",
  "colorful":  "vivid mixed gemstone pavé — rubies, sapphires, emeralds, amethysts — rich colorful mosaic across the surface",
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(params: {
  mode: "letter" | "name";
  text: string;
  fontStyle: string;
  metal: string;
  decoration: string;
}): string {
  const { mode, text, fontStyle, metal, decoration } = params;
  const fontDesc   = FONT_PROMPTS[fontStyle]    ?? FONT_PROMPTS["cursive-thin"];
  const metalDesc  = METAL_PROMPTS[metal]        ?? METAL_PROMPTS["yellow-gold"];
  const decoDesc   = DECORATION_PROMPTS[decoration] ?? DECORATION_PROMPTS["plain"];

  if (mode === "letter") {
    return `Professional luxury e-commerce jewelry product photograph.

SUBJECT: A single-letter initial pendant necklace.
Letter: "${text.toUpperCase()}" — this exact letter, perfectly formed and clearly legible.
Font style: ${fontDesc}.
Metal: ${metalDesc}.
Surface decoration: ${decoDesc}.
Chain: delicate fine cable chain, same metal.

COMPOSITION: Front-facing view, pendant perfectly centered in frame. Full pendant visible, upper portion of chain extends to top edge.
BACKGROUND: Pure white (#FFFFFF), soft diffused studio lighting, subtle drop shadow beneath pendant only.

CRITICAL REQUIREMENT: The pendant must unmistakably show the letter "${text.toUpperCase()}". The letter form must be clean, complete, and instantly readable. Every stroke and curve must be correct.

No hands. No model. No props. No text overlays. No watermarks.
Photorealistic render quality, sharp focus throughout, luxury product photography standard.`;
  }

  // name mode
  const displayName = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  return `Professional luxury e-commerce jewelry product photograph.

SUBJECT: A name necklace pendant spelling "${displayName}".
The pendant is a single continuous piece reading exactly "${displayName}" — these exact letters in this exact order, fully legible.
Script style: ${fontDesc}.
Metal: ${metalDesc}.
Surface decoration: ${decoDesc}.
Chain: delicate fine cable chain, same metal.

COMPOSITION: Front-facing view, name pendant horizontally centered. Full name and upper chain visible.
BACKGROUND: Pure white (#FFFFFF), soft diffused studio lighting, slight drop shadow under pendant.

CRITICAL REQUIREMENT: The pendant text must clearly read "${displayName}" — every letter individually legible, correct spelling preserved. Do not shorten, stylize beyond recognition, or alter the name.

No hands. No model. No props. No text overlays.
Photorealistic, luxury e-commerce quality, sharp throughout.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanApiKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256)
    .join("")
    .trim() || undefined;
}

type GenerateResult = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: unknown[] } | null;
  }> | null;
};

function extractImageFromResult(result: GenerateResult): string {
  const candidate = result.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts ?? [];

  const textParts = (parts as Array<{ text?: string; inlineData?: unknown; thought?: boolean }>)
    .filter(p => !p.thought && p.text)
    .map(p => p.text)
    .join(" ");
  if (textParts) console.log("[isim-kolye] text:", textParts.slice(0, 200));

  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));

  if (!imgPart?.inlineData) {
    throw new Error(`no_image | finishReason=${finishReason} | parts=${parts.length} | text=${textParts.slice(0, 100)}`);
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

// ─── Generation functions ─────────────────────────────────────────────────────

async function generateOne(prompt: string): Promise<string> {
  const apiKey = cleanApiKey(process.env.GOOGLE_API_KEY);
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing or invalid");
  const ai = new GoogleGenAI({ apiKey });

  // 240sn timeout — Pro plan 300sn limitinden önce temiz hata ver
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü, tekrar dene")), 240_000)
  );

  const result = await Promise.race([
    ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
    }),
    timeoutPromise,
  ]);

  const dataUrl = extractImageFromResult(result);
  const raw = dataUrl.split(",")[1] ?? dataUrl;
  const watermarked = await cropGeminiWatermark(raw);
  return `data:image/jpeg;base64,${watermarked}`;
}

async function generateOneWithReference(
  text: string,
  mode: "letter" | "name",
  referenceDataUrl: string,
): Promise<string> {
  const apiKey = cleanApiKey(process.env.GOOGLE_API_KEY);
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing or invalid");

  // Parse data URL: "data:<mime>;base64,<data>"
  const mimeMatch = referenceDataUrl.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const base64Data = referenceDataUrl.includes(",")
    ? referenceDataUrl.split(",")[1]
    : referenceDataUrl;

  const displayText =
    mode === "letter"
      ? text.toUpperCase()
      : text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

  const prompt =
    mode === "letter"
      ? `You are given a reference jewelry product photograph. Create a NEW pendant necklace showing the letter "${displayText}" in EXACTLY the same visual style as the reference image.

MATCH PRECISELY: metal color and finish, letter/font style and weight, surface decoration (stones, enamel, plain), chain style, lighting, background, photography angle.
ONLY CHANGE: the letter displayed — it must unmistakably show "${displayText}", perfectly formed and legible.

Professional luxury e-commerce photograph. Pure white background. No hands, no model, no props, no watermarks.`
      : `You are given a reference jewelry product photograph. Create a NEW name necklace pendant spelling "${displayText}" in EXACTLY the same visual style as the reference image.

MATCH PRECISELY: metal color and finish, script/font style and weight, surface decoration (stones, enamel, plain), chain style, lighting, background, photography angle.
ONLY CHANGE: the text on the pendant — it must clearly read "${displayText}", every letter legible, correct spelling.

Professional luxury e-commerce photograph. Pure white background. No hands, no model, no props, no watermarks.`;

  const ai = new GoogleGenAI({ apiKey });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü, tekrar dene")), 240_000)
  );

  const result = await Promise.race([
    ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
      config: { responseModalities: ["IMAGE", "TEXT"], thinkingConfig: { thinkingBudget: 0 } } as never,
    }),
    timeoutPromise,
  ]);

  const dataUrl = extractImageFromResult(result);
  const raw = dataUrl.split(",")[1] ?? dataUrl;
  const watermarked = await cropGeminiWatermark(raw);
  return `data:image/jpeg;base64,${watermarked}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    let body: {
      mode?: string;
      text?: string;
      fontStyle?: string;
      metal?: string;
      decoration?: string;
      count?: number;
      referenceImage?: string; // data URL — stil kopyalama modu
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { mode, text, fontStyle, metal, decoration, count, referenceImage } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }

    // API key kontrolü (BOM dahil)
    if (!cleanApiKey(process.env.GOOGLE_API_KEY)) {
      console.error("[isim-kolye] GOOGLE_API_KEY eksik veya geçersiz");
      return NextResponse.json({ error: "Yapılandırma hatası" }, { status: 500 });
    }

    const resolvedMode = mode === "name" ? "name" : "letter";
    const resolvedCount = Math.min(Math.max(Number(count) || 1, 1), 4);

    // Referans görsel varsa stil-kopyalama modu, yoksa normal prompt modu
    const hasReference = typeof referenceImage === "string" && referenceImage.startsWith("data:");

    const tasks = hasReference
      ? Array.from({ length: resolvedCount }, () =>
          generateOneWithReference(text.trim(), resolvedMode, referenceImage!)
        )
      : (() => {
          const prompt = buildPrompt({
            mode: resolvedMode,
            text: text.trim(),
            fontStyle: fontStyle ?? "cursive-thin",
            metal: metal ?? "yellow-gold",
            decoration: decoration ?? "plain",
          });
          return Array.from({ length: resolvedCount }, () => generateOne(prompt));
        })();
    const results = await Promise.allSettled(tasks);

    // Log failures
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[isim-kolye] rejected:", r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
    }

    const images = results
      .map(r => (r.status === "fulfilled" ? r.value : null))
      .filter((v): v is string => !!v);

    if (images.length === 0) {
      const firstErr = results.find(r => r.status === "rejected");
      const hint = firstErr?.status === "rejected"
        ? (firstErr.reason instanceof Error ? firstErr.reason.message : String(firstErr.reason)).slice(0, 200)
        : "no_image_no_rejection";
      console.error("[isim-kolye] tüm görseller başarısız:", hint);
      return NextResponse.json({ error: "Görsel üretilemedi, tekrar dene" }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[isim-kolye] unhandled POST error:", msg);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
