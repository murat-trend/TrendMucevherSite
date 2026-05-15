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

// Referans görselin tarzını Claude Vision ile analiz et
async function analyzeStyleWithVision(base64: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const mime = (base64.match(/data:([^;]+);/)?.[1] ?? "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system:
        "You are a jewelry style analyst. Look at this jewelry image and describe its visual style in 10-15 English keywords for AI image generation. Focus on: design style, metal finish, surface texture, form language, pattern, decorative technique. Do NOT mention stones, gems, people or colors. Return only comma-separated keywords, nothing else.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: raw } },
            { type: "text", text: "Describe the jewelry style in keywords." },
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
  };

  const {
    takiTipi,
    tema,
    formKarakterleri,
    metalRengi,
    referansGorsel,
    numImages = 1,
  } = body;

  if (!tema?.trim() && !referansGorsel) {
    return NextResponse.json({ error: "Tema veya referans görsel gerekli." }, { status: 400 });
  }

  // Tema çevirisi ve referans görsel stil analizi paralel çalışır
  const [temaEn, styleDescription] = await Promise.all([
    tema?.trim() ? translateToEnglish(tema) : Promise.resolve(""),
    referansGorsel ? analyzeStyleWithVision(referansGorsel) : Promise.resolve(""),
  ]);

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.map((f) => FORM_EN[f] ?? f.toLowerCase()).join(", ") : "";

  const noStoneClause = [
    "absolutely no gemstones", "no diamonds", "no rubies", "no sapphires",
    "no emeralds", "no crystals", "no pearls", "no rhinestones", "no pavé",
    "no prong set stones", "bare empty settings", "bare metal only",
    "no hands", "no fingers", "no human body parts", "no model",
  ].join(", ");

  const promptBody = [
    `${TAKI_TIPI_EN[takiTipi ?? ""] ?? "jewelry"} jewelry`,
    temaEn,
    formStr,
    styleDescription,                                   // Vision'dan gelen stil
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

    // Her durumda flux-pro/v1.1 (text-to-image) kullanılır
    // Referans görsel varsa stil analizi prompt'a eklenmiş olur
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt,
        num_images: Math.min(numImages, 4),
        seed,
        image_size: "square_hd",
        enhance_prompt: false,
        guidance_scale: 7,
        num_inference_steps: 28,
        safety_tolerance: "5",
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
