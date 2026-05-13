import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

async function translateTheme(turkishText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !turkishText.trim()) return turkishText;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `Translate this Turkish jewelry design description to concise English for an image generation prompt. Return ONLY the translation, no explanation, no quotes:\n\n${turkishText}`,
        },
      ],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : turkishText;
  } catch {
    return turkishText;
  }
}

async function uploadReferenceToFal(
  base64: string,
  falKey: string
): Promise<string | null> {
  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const mimeMatch = base64.match(/data:([^;]+);/);
    const mime = mimeMatch?.[1] ?? "image/jpeg";
    const buffer = Buffer.from(raw, "base64");
    const file = new File([buffer], "reference.jpg", { type: mime });
    const url = await fal.storage.upload(file);
    return url;
  } catch (e) {
    console.error("[koleksiyon-edit/uret] fal storage upload failed:", e);
    return null;
  }
}

const SYSTEM_PROMPT =
  "Professional jewelry product photography. " +
  "Single jewelry piece centered on pure white background. " +
  "Studio lighting, sharp edges, clean silhouette. " +
  "No gemstones, empty settings only. " +
  "Ultra detailed metal surface.";

const METAL_MAP: Record<string, string> = {
  "Sarı Altın": "yellow gold",
  "Rose Gold": "rose gold",
  "Beyaz Altın": "white gold",
  "Gümüş": "sterling silver",
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json();
  const {
    takiTipi,
    tema,
    formKarakterleri,
    metalRengi,
    referansGorsel,
  } = body as {
    koleksiyonAdi?: string;
    takiTipi?: string;
    tema?: string;
    formKarakterleri?: string[];
    metalRengi?: string;
    referansGorsel?: string;
  };

  if (!tema?.trim()) {
    return NextResponse.json({ error: "Tema / açıklama gerekli." }, { status: 400 });
  }

  const [temaEn, refUrl] = await Promise.all([
    translateTheme(tema),
    referansGorsel ? uploadReferenceToFal(referansGorsel, falKey) : Promise.resolve(null),
  ]);

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.join(", ")
    : "";
  const metalEn = METAL_MAP[metalRengi ?? ""] ?? metalRengi ?? "gold";

  const userPrompt = [
    `${takiTipi || "jewelry"} jewelry`,
    temaEn,
    formStr,
    `${metalEn} metal`,
    "women's collection, no stones, empty bezel only",
    "filigree details, NURBS-ready geometry",
  ]
    .filter(Boolean)
    .join(", ");

  const fullPrompt = `${SYSTEM_PROMPT} ${userPrompt}`;

  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any = {
      prompt: fullPrompt,
      num_images: 4,
      image_size: "square_hd",
      guidance_scale: 3.5,
      num_inference_steps: 28,
      safety_tolerance: "5",
      output_format: "jpeg",
    };
    if (refUrl) {
      input.image_url = refUrl;
    }

    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input,
      logs: false,
    });

    type FalImage = { url: string };
    const images: string[] = ((result.data as { images?: FalImage[] })?.images ?? []).map(
      (img) => img.url
    );

    return NextResponse.json({ images });
  } catch (err: unknown) {
    console.error("[koleksiyon-edit/uret] fal error:", err);
    const e = err as { message?: string; status?: number };
    return NextResponse.json(
      { error: e?.message || "Görsel üretimi başarısız." },
      { status: e?.status || 500 }
    );
  }
}
