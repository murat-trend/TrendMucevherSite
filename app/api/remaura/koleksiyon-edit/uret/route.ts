import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

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

// Referans görselin SADECE stilini analiz et — şekil/harf/konu içermemeli
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
        "YOU MUST INCLUDE: (1) exact metal color (oxidized silver / yellow gold / rose gold etc), " +
        "(2) surface technique (filigree wirework / repoussé / casting / engraving etc), " +
        "(3) specific decorative motifs (roses and butterflies / acanthus leaves / geometric stars etc), " +
        "(4) stone treatment (small amethyst accents / no stones / pavé diamonds etc), " +
        "(5) mood and finish (antique oxidized / high polish / dramatic dark etc). " +
        "NEVER mention jewelry type (ring/earring/necklace/bracelet). " +
        "This style will be applied to DIFFERENT jewelry types — only describe the visual DNA. " +
        "Format: comma-separated keywords only.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: raw } },
            { type: "text", text: "Extract the jewelry craftsmanship style keywords." },
          ],
        },
      ],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  } catch (e) {
    console.error("[uret] vision analysis failed:", e);
    return "";
  }
}

const TAKI_TIPI_EN: Record<string, string> = {
  "Yüzük": "ring",
  "Kolye": "necklace",
  "Küpe": "earring",
  "Bilezik": "bracelet",
  "Broş": "brooch",
};

const KAMERA_ACISI: Record<string, string> = {
  "Yüzük": "45-degree overhead angle, camera looking down at 45 degrees from above-front, ring band fully visible, top face of ring clearly shown, e-commerce jewelry standard angle",
  "Kolye": "front-facing view, pendant centered, chain visible on both sides, slight downward angle",
  "Küpe": "front-facing view, pair of earrings side by side, symmetric composition, slight 3/4 angle",
  "Bilezik": "45-degree overhead angle, bracelet laid flat or on slight tilt showing inner and outer surface",
  "Broş": "perfectly flat front-facing view, entire brooch visible, no perspective distortion",
};

const METAL_RENGI_EN: Record<string, string> = {
  "Sarı Altın": "yellow gold",
  "Rose Gold": "rose gold",
  "Beyaz Altın": "white gold",
  "Gümüş": "silver",
  "Oksitlenmiş Gümüş": "oxidized silver",
};

const FORM_EN: Record<string, string> = {
  "İnce & Zarif": "thin and delicate",
  "Geometrik": "geometric",
  "Organik": "organic",
  "Filigran": "filigree",
  "Kabartmalı": "embossed",
  "Asimetrik": "asymmetric",
};

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json() as {
    takiTipi?: string;
    tema?: string;
    formKarakterleri?: string[];
    metalRengi?: string;
    referansGorsel?: string;
    numImages?: number;
    referansGucu?: number;
    stilPrompt?: string;   // GPT-4o analizinden gelen hazır stil promptu
  };

  const {
    takiTipi,
    tema,
    formKarakterleri,
    metalRengi,
    referansGorsel,
    numImages = 1,
    stilPrompt,
  } = body;

  if (!tema?.trim() && !referansGorsel && !stilPrompt) {
    return NextResponse.json({ error: "Tema veya referans görsel gerekli." }, { status: 400 });
  }

  // stilPrompt'tan takı tipi kelimelerini temizle (prompt çakışmasını önlemek için)
  const cleanedStilPrompt = stilPrompt
    ? stilPrompt
        .replace(/\b(ring|necklace|earring|bracelet|brooch|pendant|bangle|choker)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
    : null;

  // cleanedStilPrompt varsa (GPT-4o analiz yapıldı) doğrudan kullan, yoksa Vision analizi yap
  const [temaEn, styleDescription] = await Promise.all([
    tema?.trim() ? translateToEnglish(tema) : Promise.resolve(""),
    cleanedStilPrompt
      ? Promise.resolve(cleanedStilPrompt)
      : referansGorsel
        ? analyzeStyleWithVision(referansGorsel)
        : Promise.resolve(""),
  ]);

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.map((f) => FORM_EN[f] ?? f.toLowerCase()).join(", ") : "";

  const noStoneClause = [
    "absolutely no gemstones", "no diamonds", "no rubies", "no sapphires",
    "no emeralds", "no crystals", "no pearls", "no rhinestones", "no pavé",
    "no prong set stones", "bare empty settings", "bare metal only",
    "no hands", "no fingers", "no human body parts", "no model",
  ].join(", ");

  const takiTipiEn = TAKI_TIPI_EN[takiTipi ?? ""] ?? "jewelry";
  const promptBody = [
    `IMPORTANT: This is a ${takiTipiEn}. Generate ONLY a ${takiTipiEn}.`,
    `CAMERA ANGLE — CRITICAL: ${KAMERA_ACISI[takiTipi ?? ""] ?? "professional product photography angle"}`,
    temaEn,
    formStr,
    styleDescription,
    `${METAL_RENGI_EN[metalRengi ?? ""] ?? "gold"} metal`,
    "women's collection",
    "professional product photography",
    "pure white background",
    "seamless white studio backdrop",
    "centered single object",
    "sharp edges",
    "studio lighting",
    "ultra detailed metal surface texture",
  ].filter(Boolean).join(", ");

  const prompt = `${noStoneClause}, ${promptBody}`;
  const seed = Math.floor(Math.random() * 1_000_000);

  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt,
        num_images: Math.min(numImages, 4),
        seed,
        image_size: "square_hd",
        enhance_prompt: false,
        guidance_scale: 8,
        num_inference_steps: 32,
        safety_tolerance: "2",
        output_format: "jpeg",
      } as any,
      logs: false,
    });

    type FalImage = { url: string };
    const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(
      (img) => img.url
    );

    return NextResponse.json({ images, seed, styleDescription });
  } catch (err: unknown) {
    console.error("[uret] fal error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "Görsel üretimi başarısız." }, { status: 500 });
  }
}
