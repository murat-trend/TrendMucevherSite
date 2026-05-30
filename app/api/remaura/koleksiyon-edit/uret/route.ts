import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { buildRingThreeQuarterBlock } from "@/lib/remaura/internal-visual-rules";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 300;

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

// ─── Gemini helpers ───────────────────────────────────────────────────────────

function cleanApiKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.split("").filter(ch => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) < 256).join("").trim() || undefined;
}

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
  if (textParts) console.log("[uret] gemini text:", textParts.slice(0, 150));

  const imgPart = (parts as Array<{ thought?: boolean; inlineData?: { mimeType: string; data: string } }>)
    .find(p => !p.thought && p.inlineData?.mimeType?.startsWith("image/"));

  if (!imgPart?.inlineData) {
    throw new Error(`no_image | finishReason=${finishReason} | parts=${parts.length} | text=${textParts.slice(0, 80)}`);
  }
  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}

async function generateOneWithGemini(
  referenceDataUrl: string,
  prompt: string,
  googleApiKey: string,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: googleApiKey });

  const mimeMatch = referenceDataUrl.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const base64Data = referenceDataUrl.includes(",")
    ? referenceDataUrl.split(",")[1]
    : referenceDataUrl;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout_240s — üretim çok uzun sürdü")), 240_000)
  );

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
  const cropped = await cropGeminiWatermark(raw);
  return `data:image/jpeg;base64,${cropped}`;
}

// ─── Çeviri & stil analizi ────────────────────────────────────────────────────

async function translateToEnglish(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "Translate this jewelry description to English for AI image generation. Return only the translation.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

async function analyzeStyleWithVision(base64: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const mime = (base64.match(/data:([^;]+);/)?.[1] ?? "image/jpeg") as
      | "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system:
        "You are a luxury jewelry style analyst. Extract the EXACT visual style from this reference image in 15-20 English keywords. " +
        "YOU MUST INCLUDE: (1) exact metal color, (2) surface technique, (3) specific decorative motifs, " +
        "(4) stone treatment, (5) mood and finish. " +
        "NEVER mention jewelry type. Format: comma-separated keywords only.",
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: raw } },
          { type: "text", text: "Extract the jewelry craftsmanship style keywords." },
        ],
      }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  } catch (e) {
    console.error("[uret] vision analysis failed:", e);
    return "";
  }
}

async function toFalUrl(image: string, fal: { storage: { upload: (f: File) => Promise<string> } }): Promise<string> {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const raw = image.includes(",") ? image.split(",")[1] : image;
  const buf = Buffer.from(raw, "base64");
  const file = new File([new Uint8Array(buf)], "image.jpg", { type: "image/jpeg" });
  return await fal.storage.upload(file);
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const TAKI_TIPI_EN: Record<string, string> = {
  "Yüzük": "ring", "Kolye": "necklace", "Küpe": "earring",
  "Bilezik": "bracelet", "Broş": "brooch",
};

const KAMERA_ACISI: Record<string, string> = {
  "Kolye": "front-facing view, pendant centered, chain visible on both sides, slight downward angle, pure white background",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle, pure white background",
  "Bilezik": "three-quarter elevated 3/4 angle, camera at 45 degrees above, bracelet displayed on a slight diagonal tilt, inner hollow and outer surface both visible, entire bracelet in frame, pure white background",
  "Broş": "perfectly flat front-facing view, entire brooch visible, no perspective distortion, pure white background",
};

function temaContainsRing(text: string): boolean {
  return new RegExp(
    "(^|[^\\p{L}\\p{N}])(yüzük|yuzuk|alyans|ring|wedding band|eternity ring|signet|trauring|ehering|кольцо)(?=[^\\p{L}\\p{N}]|$)",
    "iu"
  ).test(text);
}

function temaContainsBracelet(text: string): boolean {
  return /\b(bilezik|bracelet|bangle|armband|armreif)\b/i.test(text);
}

const METAL_RENGI_EN: Record<string, string> = {
  "Sarı Altın": "yellow gold", "Rose Gold": "rose gold",
  "Beyaz Altın": "white gold", "Gümüş": "silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin and delicate", "Geometrik": "geometric",
  "Organik": "organic", "Filigran": "filigree",
  "Kabartmalı": "embossed", "Asimetrik": "asymmetric",
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json() as {
    takiTipi?: string;
    tema?: string;
    formKarakterleri?: string[];
    metalRengi?: string;
    referansGorsel?: string;
    numImages?: number;
    stilKartiId?: string;
    stilPrompt?: string;
  };

  const { takiTipi, tema, formKarakterleri, metalRengi,
          referansGorsel, numImages = 1, stilKartiId, stilPrompt } = body;

  if (!tema?.trim() && !referansGorsel && !stilPrompt && !stilKartiId) {
    return NextResponse.json({ error: "Tema, referans görsel veya stil kartı gerekli." }, { status: 400 });
  }

  const takiTipiEn = TAKI_TIPI_EN[takiTipi ?? ""] ?? "jewelry";
  const metalEn    = METAL_RENGI_EN[metalRengi ?? ""] ?? "gold";
  const formStr    = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.map(f => FORM_EN[f] ?? f.toLowerCase()).join(", ") : "";
  const temaEn     = tema?.trim() ? await translateToEnglish(tema) : "";

  const metalSource = [tema, metalRengi].filter(Boolean).join(" ");
  let kameraAcisi: string;
  if (takiTipi === "Yüzük" || (!takiTipi?.trim() && temaContainsRing(tema ?? ""))) {
    kameraAcisi = buildRingThreeQuarterBlock(metalSource || "ring");
  } else if (takiTipi && KAMERA_ACISI[takiTipi]) {
    kameraAcisi = KAMERA_ACISI[takiTipi];
  } else if (!takiTipi?.trim() && temaContainsBracelet(tema ?? "")) {
    kameraAcisi = KAMERA_ACISI["Bilezik"];
  } else {
    kameraAcisi = "professional e-commerce jewelry product photography angle, entire piece visible, pure white background";
  }

  try {
    // ── PATH 1: Referans görsel var → Gemini multimodal (görseli gerçekten görür) ──
    if (referansGorsel) {
      const googleApiKey = cleanApiKey(process.env.GOOGLE_API_KEY);
      if (!googleApiKey) {
        return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
      }

      // Stil açıklaması: stilPrompt (koleksiyon analiz styleLock) varsa kullan, yoksa vision analizi
      const stilDescription = stilPrompt
        ? stilPrompt
            .replace(/\b(ring|necklace|earring|bracelet|brooch|pendant|bangle|choker)\b/gi, "")
            .replace(/\s+/g, " ").trim()
        : await analyzeStyleWithVision(referansGorsel);

      const prompt = [
        `You are given a reference jewelry product photograph.`,
        `Create a NEW ${metalEn} ${takiTipiEn} in EXACTLY the same visual style as the reference image.`,
        `MATCH PRECISELY: every decorative motif (flowers, leaves, enamel accents, stone settings, engravings, filigree), metal color and finish, surface technique, stone treatment, overall aesthetic mood.`,
        `CHANGE ONLY: the jewelry type — it must be a ${takiTipiEn}, not a copy of the reference piece shape or subject.`,
        stilDescription ? `Additional style keywords: ${stilDescription}.` : "",
        temaEn,
        formStr,
        `CAMERA: ${kameraAcisi}`,
        `Professional luxury e-commerce photograph. Pure white background. No hands, no model, no props, no watermarks. Sharp focus, studio lighting.`,
      ].filter(Boolean).join(" ");

      const count = Math.min(Math.max(Number(numImages) || 1, 1), 4);
      const tasks = Array.from({ length: count }, () =>
        generateOneWithGemini(referansGorsel, prompt, googleApiKey)
      );
      const results = await Promise.allSettled(tasks);

      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[uret] gemini rejected:", r.reason instanceof Error ? r.reason.message : String(r.reason));
        }
      }

      const images = results
        .map(r => r.status === "fulfilled" ? r.value : null)
        .filter((v): v is string => !!v);

      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images, seed: 0, stilDescription });
    }

    // ── PATH 2: Stil kartı veya sadece metin → FAL ────────────────────────────
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
    }
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });

    let stilDescription = "";
    let referansUrl: string | null = null;

    if (stilKartiId) {
      const admin = (() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return null;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient: sc } = require("@supabase/supabase-js");
        return sc(url, key, { auth: { persistSession: false } });
      })();
      if (admin) {
        const { data } = await admin.from("stil_kartlari").select("*").eq("id", stilKartiId).single();
        if (data) {
          stilDescription = data.stil_prompt;
          referansUrl = data.referans_gorsel_url ?? null;
        }
      }
    } else if (stilPrompt) {
      stilDescription = stilPrompt
        .replace(/\b(ring|necklace|earring|bracelet|brooch|pendant|bangle|choker)\b/gi, "")
        .replace(/\s+/g, " ").trim();
    }

    if (referansUrl) {
      // Stil kartından gelen CDN URL'i ile Flux Kontext
      const falReferansUrl = await toFalUrl(referansUrl, fal);
      const prompt = [
        `Generate a new ${metalEn} ${takiTipiEn}.`,
        stilDescription
          ? `STYLE LOCK — apply ALL of these characteristics: ${stilDescription}.`
          : `STYLE LOCK: Keep the EXACT same craftsmanship technique, decorative motifs, metal finish from the reference.`,
        `Create a new ${takiTipiEn} — do NOT copy the shape of the reference piece.`,
        `CAMERA: ${kameraAcisi}`,
        temaEn,
        formStr,
        `Pure white background. No model, no hands. Single centered jewelry piece. Studio lighting. Ultra detailed.`,
      ].filter(Boolean).join(" ");

      const result = await (fal.subscribe as (model: string, opts: { input: Record<string, unknown>; logs: boolean }) => Promise<{ data: unknown }>)("fal-ai/flux-pro/kontext", {
        input: {
          prompt,
          image_url: falReferansUrl,
          num_images: Math.min(numImages, 4),
          aspect_ratio: "1:1",
          output_format: "jpeg",
          safety_tolerance: 3,
        },
        logs: false,
      });

      type FalImage = { url: string };
      const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(i => i.url);
      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images, seed: 0, stilDescription });

    } else {
      // Metin bazlı üretim — Flux Ultra
      const prompt = [
        `A single ${metalEn} ${takiTipiEn}, luxury jewelry product photography.`,
        kameraAcisi,
        stilDescription || temaEn,
        formStr,
        `Ultra detailed metal surface, intricate craftsmanship, sharp focus.`,
        `Pure white background, centered, studio lighting, no hands, no model.`,
      ].filter(Boolean).join(". ");

      const seed = Math.floor(Math.random() * 1_000_000);
      const result = await (fal.subscribe as (model: string, opts: { input: Record<string, unknown>; logs: boolean }) => Promise<{ data: unknown }>)("fal-ai/flux-pro/v1.1-ultra", {
        input: {
          prompt,
          num_images: Math.min(numImages, 4),
          seed,
          aspect_ratio: "1:1",
          output_format: "jpeg",
          safety_tolerance: 3,
        },
        logs: false,
      });

      type FalImage = { url: string };
      const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(i => i.url);
      if (images.length === 0) {
        return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
      }
      return NextResponse.json({ images, seed, stilDescription });
    }

  } catch (err: unknown) {
    console.error("[uret] error:", err);
    const e = err as { status?: number; message?: string };
    const status = e?.status ?? 500;
    let userMsg = "Görsel üretimi başarısız oldu, lütfen tekrar deneyin.";
    if (status === 401 || status === 403) userMsg = "Yetkilendirme hatası, lütfen yöneticiye bildirin.";
    else if (status === 429) userMsg = "İstek limiti aşıldı, lütfen birkaç dakika sonra tekrar deneyin.";
    else if (status === 503 || status === 504) userMsg = "Servis geçici olarak meşgul, lütfen tekrar deneyin.";
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
