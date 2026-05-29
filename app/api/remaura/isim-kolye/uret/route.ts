import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { GoogleGenAI } from "@google/genai";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

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

// ─── Single generation ────────────────────────────────────────────────────────

async function generateOne(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseModalities: ["IMAGE", "TEXT"] } as never,
  });

  const candidate = result.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const parts = candidate?.content?.parts ?? [];

  // Log text parts server-side
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
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { mode, text, fontStyle, metal, decoration, count } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }

    // API key kontrolü
    if (!process.env.GOOGLE_API_KEY) {
      console.error("[isim-kolye] GOOGLE_API_KEY eksik");
      return NextResponse.json({ error: "Yapılandırma hatası" }, { status: 500 });
    }

    const resolvedMode = mode === "name" ? "name" : "letter";
    const resolvedCount = Math.min(Math.max(Number(count) || 1, 1), 4);

    const prompt = buildPrompt({
      mode: resolvedMode,
      text: text.trim(),
      fontStyle: fontStyle ?? "cursive-thin",
      metal: metal ?? "yellow-gold",
      decoration: decoration ?? "plain",
    });

    // Paralel üretim
    const tasks = Array.from({ length: resolvedCount }, () => generateOne(prompt));
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
      // _dbg: geçici tanı — düzeldikten sonra kaldır
      return NextResponse.json({ error: "Görsel üretilemedi, tekrar dene", _dbg: hint }, { status: 500 });
    }

    return NextResponse.json({ images });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[isim-kolye] unhandled POST error:", msg);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
