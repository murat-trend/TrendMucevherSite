import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

const FAL_MODEL = "fal-ai/ideogram/v3/remix";

type Oran = "square" | "portrait" | "story" | "landscape";
const IMAGE_SIZE: Record<Oran, string> = {
  square: "square_hd",
  portrait: "portrait_4_3",
  story: "portrait_16_9",
  landscape: "landscape_16_9",
};

async function requireSuperAdmin(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }) };
  }
  return { ok: true };
}

async function translateToEnglish(text: string): Promise<string> {
  const t = text.trim();
  if (!t) return "";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return t;
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system:
        "Translate this image-generation prompt to natural English. Keep all the intent and details. " +
        "Return ONLY the translation, no quotes or notes. If already English, return as is.",
      messages: [{ role: "user", content: t }],
    });
    const block = msg.content[0];
    return block?.type === "text" ? block.text.trim() : t;
  } catch {
    return t;
  }
}

async function toCdnUrl(
  image: string,
  fal: { storage: { upload: (f: File) => Promise<string> } }
): Promise<string> {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const raw = image.includes(",") ? image.split(",")[1] : image;
  const buf = Buffer.from(raw, "base64");
  const file = new File([new Uint8Array(buf)], "image.jpg", { type: "image/jpeg" });
  return await fal.storage.upload(file);
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "Servis yapılandırılmamış, lütfen yöneticiye bildirin." }, { status: 500 });
  }

  let body: {
    image?: string;
    prompt?: string;
    oran?: string;
    numImages?: number;
    style?: string;
    magicPrompt?: boolean;
    renderSpeed?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const image = body.image?.trim();
  if (!image) return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  if (!body.prompt?.trim()) return NextResponse.json({ error: "Açıklama (prompt) gerekli." }, { status: 400 });

  const oran: Oran =
    body.oran === "portrait" || body.oran === "story" || body.oran === "landscape" ? body.oran : "square";
  const style = ["AUTO", "REALISTIC", "DESIGN", "GENERAL"].includes(body.style ?? "")
    ? body.style!
    : "AUTO";
  const renderSpeed = ["TURBO", "BALANCED", "QUALITY"].includes(body.renderSpeed ?? "")
    ? body.renderSpeed!
    : "BALANCED";

  const promptEn = await translateToEnglish(body.prompt);

  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });
    const imageUrl = await toCdnUrl(image, fal);

    const input: Record<string, unknown> = {
      prompt: promptEn,
      image_url: imageUrl,
      image_size: IMAGE_SIZE[oran],
      rendering_speed: renderSpeed,
      style,
      expand_prompt: body.magicPrompt !== false,
      num_images: Math.min(Math.max(body.numImages ?? 2, 1), 4),
    };

    const result = await (fal.subscribe as (
      model: string,
      opts: { input: Record<string, unknown>; logs: boolean }
    ) => Promise<{ data: unknown }>)(FAL_MODEL, { input, logs: false });

    type FalImage = { url: string };
    const urls = ((result.data as { images?: FalImage[] })?.images ?? []).map((i) => i.url);
    if (urls.length === 0) {
      return NextResponse.json({ error: "Görsel üretilemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    const images = await Promise.all(
      urls.map(async (u) => {
        try {
          const r = await fetch(u);
          if (!r.ok) return u;
          const ct = r.headers.get("content-type") ?? "image/png";
          return `data:${ct};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
        } catch {
          return u;
        }
      })
    );
    return NextResponse.json({ images });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; body?: { detail?: unknown }; detail?: unknown };
    const detail =
      (typeof e?.body?.detail === "string" && e.body.detail) ||
      (e?.body?.detail && JSON.stringify(e.body.detail)) ||
      (typeof e?.detail === "string" && e.detail) ||
      e?.message ||
      "bilinmeyen hata";
    console.error("[sosyal-post/uret] fal error:", e?.status, JSON.stringify(detail).slice(0, 800));
    return NextResponse.json(
      { error: "Görsel üretimi başarısız oldu, lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
