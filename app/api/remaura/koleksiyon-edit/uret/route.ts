import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

// ─── Claude translation ───────────────────────────────────────────────────────

async function translateToEnglish(text: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !text.trim()) return text;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system:
        "Translate this jewelry description to English for AI image generation. Return only the translation.",
      messages: [{ role: "user", content: text }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : text;
  } catch {
    return text;
  }
}

// ─── fal.ai reference upload ──────────────────────────────────────────────────

async function uploadRefToFal(base64: string, falKey: string): Promise<string | null> {
  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const mime = base64.match(/data:([^;]+);/)?.[1] ?? "image/jpeg";
    const blob = new Blob([Buffer.from(raw, "base64")], { type: mime });
    const file = new File([blob], "reference.jpg", { type: mime });
    return await fal.storage.upload(file);
  } catch (e) {
    console.error("[uret] fal storage upload failed:", e);
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

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
  };

  const { takiTipi, tema, formKarakterleri, metalRengi, referansGorsel } = body;

  if (!tema?.trim()) {
    return NextResponse.json({ error: "Tema / açıklama gerekli." }, { status: 400 });
  }

  const [temaEn, refUrl] = await Promise.all([
    translateToEnglish(tema),
    referansGorsel ? uploadRefToFal(referansGorsel, falKey) : Promise.resolve(null),
  ]);

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.join(", ").toLowerCase()
    : "";

  const promptBody = [
    `${(takiTipi ?? "jewelry").toLowerCase()} jewelry`,
    temaEn,
    formStr,
    `${(metalRengi ?? "gold").toLowerCase()} metal`,
    "women's collection",
    "professional product photography, pure white background",
    "centered single object, sharp edges, studio lighting",
    "ultra detailed metal surface texture",
  ]
    .filter(Boolean)
    .join(", ");

  const prompt = `NO GEMSTONES, NO DIAMONDS, NO STONES, EMPTY SETTINGS ONLY, ${promptBody}`;

  const negativePrompt =
    "diamonds, gemstones, stones, crystals, pearls, rubies, sapphires, emeralds, jewelry with stones, set stones, pavé, prong set stones";

  const seed = Math.floor(Math.random() * 1_000_000);

  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt,
      negative_prompt: negativePrompt,
      num_images: 4,
      seed,
      image_size: "square_hd",
      guidance_scale: 3.5,
      num_inference_steps: 28,
      safety_tolerance: "5",
      output_format: "jpeg",
    };
    if (refUrl) {
      input.image_url = refUrl;
      input.image_prompt_strength = 0.25;
    }

    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", { input, logs: false });

    type FalImage = { url: string };
    const images = ((result.data as { images?: FalImage[] })?.images ?? []).map(
      (img) => img.url
    );

    return NextResponse.json({ images });
  } catch (err: unknown) {
    console.error("[uret] fal error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "Görsel üretimi başarısız." }, { status: 500 });
  }
}
