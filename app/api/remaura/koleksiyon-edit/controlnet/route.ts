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

// Referans görselden sadece işçilik stilini çıkar — form/şekil/taş asla dahil edilmemeli
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
      max_tokens: 250,
      system:
        "You are a luxury jewelry style analyst. Analyze this jewelry image and extract ONLY the craftsmanship and decorative style in 15-20 English keywords for AI image generation. " +
        "Be specific: describe metal surface finish (polished/brushed/hammered), decorative technique (pavé/filigree/engraving/channel set), " +
        "ornamental motifs (floral/botanical/vine/geometric), surface texture, edge treatment, and material quality. " +
        "Also include: what decorations appear WHERE on the piece (e.g., 'flowers on sides', 'stones along vertical axis'). " +
        "NEVER mention: the specific letter shape, gem names (use 'accent stones' instead), people, colors, or brand names. " +
        "Format: comma-separated keywords only, no sentences.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: raw } },
            { type: "text", text: "Extract the luxury jewelry craftsmanship and decorative style keywords." },
          ],
        },
      ],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  } catch (e) {
    console.error("[controlnet] vision analysis failed:", e);
    return "";
  }
}

// base64 data URL veya https:// → fal CDN URL
async function toFalUrl(image: string, fal: { storage: { upload: (f: File) => Promise<string> } }): Promise<string> {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const raw = image.includes(",") ? image.split(",")[1] : image;
  const buf = Buffer.from(raw, "base64");
  const file = new File([new Uint8Array(buf)], "image.png", { type: "image/png" });
  return await fal.storage.upload(file);
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
    letterTemplate: string;   // Canvas'tan gelen base64 harf şablonu
    referansGorsel?: string;  // Stil referansı (A harfi)
    takiTipi?: string;
    tema?: string;
    formKarakterleri?: string[];
    metalRengi?: string;
    targetLetter?: string;    // Hedef harf (B, C, vs.)
  };

  const {
    letterTemplate,
    referansGorsel,
    takiTipi,
    tema,
    formKarakterleri,
    metalRengi,
    targetLetter = "",
  } = body;

  if (!letterTemplate) {
    return NextResponse.json({ error: "Harf şablonu gerekli." }, { status: 400 });
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: falKey });

  // Tema çevirisi ve stil analizi paralel çalışır
  const [temaEn, styleDescription] = await Promise.all([
    tema?.trim() ? translateToEnglish(tema) : Promise.resolve(""),
    referansGorsel ? analyzeStyleWithVision(referansGorsel) : Promise.resolve(""),
  ]);

  // Harf şablonunu ve referans görseli fal CDN'e yükle
  const [templateUrl, refUrl] = await Promise.all([
    toFalUrl(letterTemplate, fal),
    referansGorsel ? toFalUrl(referansGorsel, fal) : Promise.resolve(null as unknown as string),
  ]);

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.map((f) => FORM_EN[f] ?? f.toLowerCase()).join(", ") : "";

  const letterDesc = targetLetter ? `letter ${targetLetter.toUpperCase()} pendant` : "letter pendant";
  const metalStr = METAL_RENGI_EN[metalRengi ?? ""] ?? "yellow gold";
  const takiStr = TAKI_TIPI_EN[takiTipi ?? ""] ?? "necklace";

  const prompt = [
    `luxury ${letterDesc} ${takiStr}`,
    `${metalStr} metal`,
    temaEn,
    formStr,
    styleDescription,
    "minimalist accent stones, focus on polished metal surfaces",
    "botanical elegance, ornamental decorations",
    "professional product photography",
    "pure white background",
    "centered single object",
    "studio lighting",
    "ultra detailed metal surface",
    "no hands, no fingers, no model",
  ].filter(Boolean).join(", ");

  const seed = Math.floor(Math.random() * 1_000_000);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt,
      controlnets: [
        {
          path: "InstantX/FLUX.1-dev-Controlnet-Canny",
          control_image_url: templateUrl,
          conditioning_scale: 0.6,
        },
      ],
      num_images: 1,
      seed,
      image_size: "square_hd",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      output_format: "jpeg",
    };

    // Referans görsel varsa IP-Adapter style olarak ekle
    if (refUrl) {
      input.image_url = refUrl;
    }

    const result = await fal.subscribe("fal-ai/flux-general", {
      input,
      logs: false,
    });

    type FalImage = { url: string };
    const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(
      (img) => img.url
    );

    return NextResponse.json({ images, seed, styleDescription });
  } catch (err: unknown) {
    console.error("[controlnet] fal error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "ControlNet üretimi başarısız." }, { status: 500 });
  }
}
