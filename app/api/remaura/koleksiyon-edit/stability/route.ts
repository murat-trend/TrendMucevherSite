import { loadEnvConfig } from "@next/env";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

function base64ToBlob(base64: string, fallbackMime = "image/png"): Blob {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mime = mimeMatch?.[1] ?? fallbackMime;
  return new Blob([Buffer.from(raw, "base64")], { type: mime });
}

async function binaryToBase64Response(
  res: Response
): Promise<NextResponse> {
  const buffer = await res.arrayBuffer();
  const ct = res.headers.get("content-type") || "image/png";
  const b64 = Buffer.from(buffer).toString("base64");
  return NextResponse.json({ image: `data:${ct};base64,${b64}` });
}

async function callStabilitySync(
  endpoint: string,
  form: FormData,
  apiKey: string
): Promise<NextResponse> {
  const res = await fetch(`https://api.stability.ai${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: txt }, { status: res.status });
  }
  return binaryToBase64Response(res);
}

async function pollCreativeUpscale(
  jobId: string,
  apiKey: string
): Promise<NextResponse> {
  const url = `https://api.stability.ai/v2beta/stable-image/upscale/creative/result/${jobId}`;
  for (let i = 0; i < 35; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    });
    if (res.status === 202) continue;
    if (res.ok) return binaryToBase64Response(res);
    const txt = await res.text();
    return NextResponse.json({ error: txt }, { status: res.status });
  }
  return NextResponse.json({ error: "Creative upscale zaman aşımı." }, { status: 504 });
}

// ─── Operation handlers ───────────────────────────────────────────────────────

async function opRemoveBg(imageB64: string, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(imageB64), "image.png");
  form.append("output_format", "png");
  return callStabilitySync(
    "/v2beta/stable-image/edit/remove-background",
    form,
    apiKey
  );
}

async function opUpscaleConservative(
  imageB64: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(imageB64), "image.png");
  form.append(
    "prompt",
    "jewelry product photo, high detail, sharp focus, professional photography"
  );
  form.append("output_format", "png");
  return callStabilitySync(
    "/v2beta/stable-image/upscale/conservative",
    form,
    apiKey
  );
}

async function opUpscaleCreative(
  imageB64: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(imageB64), "image.png");
  form.append(
    "prompt",
    "jewelry product photo, ultra high detail, sharp edges, professional photography"
  );
  form.append("creativity", "0.3");
  form.append("output_format", "png");

  const res = await fetch(
    "https://api.stability.ai/v2beta/stable-image/upscale/creative",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      body: form,
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: txt }, { status: res.status });
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) {
    return NextResponse.json({ error: "Creative upscale job ID alınamadı." }, { status: 500 });
  }
  return pollCreativeUpscale(json.id, apiKey);
}

async function opSearchReplace(
  imageB64: string,
  searchPrompt: string,
  replacePrompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(imageB64), "image.png");
  form.append("prompt", replacePrompt);
  form.append("search_prompt", searchPrompt);
  form.append("output_format", "png");
  return callStabilitySync(
    "/v2beta/stable-image/edit/search-and-replace",
    form,
    apiKey
  );
}

async function opSearchRecolor(
  imageB64: string,
  selectPrompt: string,
  newColor: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(imageB64), "image.png");
  form.append("prompt", newColor);
  form.append("select_prompt", selectPrompt);
  form.append("output_format", "png");
  return callStabilitySync(
    "/v2beta/stable-image/edit/search-and-recolor",
    form,
    apiKey
  );
}

async function opStyleTransfer(
  imageB64: string,
  referenceB64: string,
  prompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", base64ToBlob(referenceB64), "reference.png");
  form.append("init_image", base64ToBlob(imageB64), "image.png");
  form.append("prompt", prompt || "jewelry product photo, detailed metal surface");
  form.append("output_format", "png");
  return callStabilitySync(
    "/v2beta/stable-image/control/style",
    form,
    apiKey
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json();
  const {
    operation,
    imageBase64,
    searchPrompt,
    replacePrompt,
    selectPrompt,
    newColor,
    referenceBase64,
    stylePrompt,
    upscaleMode,
  } = body as {
    operation: string;
    imageBase64: string;
    searchPrompt?: string;
    replacePrompt?: string;
    selectPrompt?: string;
    newColor?: string;
    referenceBase64?: string;
    stylePrompt?: string;
    upscaleMode?: "conservative" | "creative";
  };

  if (!imageBase64) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    switch (operation) {
      case "remove-bg":
        return opRemoveBg(imageBase64, apiKey);

      case "upscale":
        return upscaleMode === "creative"
          ? opUpscaleCreative(imageBase64, apiKey)
          : opUpscaleConservative(imageBase64, apiKey);

      case "search-replace":
        if (!searchPrompt || !replacePrompt)
          return NextResponse.json({ error: "Arama ve değiştirme promptları gerekli." }, { status: 400 });
        return opSearchReplace(imageBase64, searchPrompt, replacePrompt, apiKey);

      case "search-recolor":
        if (!selectPrompt || !newColor)
          return NextResponse.json({ error: "Seçim promptu ve yeni renk gerekli." }, { status: 400 });
        return opSearchRecolor(imageBase64, selectPrompt, newColor, apiKey);

      case "style-transfer":
        if (!referenceBase64)
          return NextResponse.json({ error: "Referans görsel gerekli." }, { status: 400 });
        return opStyleTransfer(imageBase64, referenceBase64, stylePrompt ?? "", apiKey);

      default:
        return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[koleksiyon-edit/stability] error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || "İşlem başarısız." }, { status: 500 });
  }
}
