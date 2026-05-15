import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { getOpenAIApiKey } from "@/lib/api/openai";

loadEnvConfig(process.cwd());

const SYSTEM_PROMPT =
  "Professional jewelry product photography. " +
  "Single jewelry piece centered on pure black background. " +
  "Studio lighting with soft highlights showing metal surface. " +
  "Sharp edges and clean silhouette optimized for 3D mesh reconstruction. " +
  "No stones, no gemstones, empty settings only. " +
  "Ultra detailed metal surface texture. " +
  "No reflections on background. No shadow on background.";

const QUALITY_MAP: Record<string, string> = {
  "Hızlı Taslak": "low",
  "Standart": "medium",
  "Yüksek Detay": "high",
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

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "API anahtarı yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json();
  const { tasarimOdagi, anaTema, formKarakterleri, meshKalitesi } = body as {
    koleksiyonAdi?: string;
    tasarimOdagi?: string;
    anaTema?: string;
    formKarakterleri?: string[];
    meshKalitesi?: string;
  };

  if (!anaTema?.trim()) {
    return NextResponse.json({ error: "Ana tema gerekli." }, { status: 400 });
  }

  const formStr = Array.isArray(formKarakterleri) && formKarakterleri.length > 0
    ? formKarakterleri.join(", ")
    : "";

  const userPrompt = [
    `${tasarimOdagi || "jewelry"} jewelry design`,
    anaTema.trim(),
    formStr,
    "women's collection, gold/silver metal",
    "no gemstones, empty bezels only",
    "NURBS-ready clean geometry",
  ]
    .filter(Boolean)
    .join(", ");

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
  const quality = QUALITY_MAP[meshKalitesi ?? ""] ?? "medium";

  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      // @ts-expect-error — gpt-image-1 quality param
      quality,
    });

    const images = (response.data ?? [])
      .map((img) =>
        img.b64_json
          ? `data:image/png;base64,${img.b64_json}`
          : (img as { url?: string }).url ?? null
      )
      .filter(Boolean) as string[];

    return NextResponse.json({ images });
  } catch (err: unknown) {
    console.error("KOLEKSIYON-URET ERROR:", err);
    const e = err as { status?: number; code?: string; message?: string };
    if (e?.status === 401 || e?.code === "invalid_api_key") {
      return NextResponse.json({ error: "API anahtarı geçersiz." }, { status: 401 });
    }
    return NextResponse.json(
      { error: e?.message || "Görsel üretimi başarısız." },
      { status: 500 }
    );
  }
}
