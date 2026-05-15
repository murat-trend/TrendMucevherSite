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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * URL veya data: base64 → Buffer
 * R2, fal CDN veya herhangi bir https:// URL çalışır.
 */
async function resolveImageBuffer(input: string): Promise<Buffer> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const res = await fetch(input, { cache: "no-store" });
    if (!res.ok) throw new Error(`Görsel fetch başarısız: ${res.status} — ${input}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const raw = input.includes(",") ? input.split(",")[1] : input;
  return Buffer.from(raw, "base64");
}

function bufferToBlob(buf: Buffer, mime = "image/png"): Blob {
  return new Blob([new Uint8Array(buf)], { type: mime });
}

async function stabilityPost(
  endpoint: string,
  form: FormData,
  apiKey: string
): Promise<NextResponse> {
  const res = await fetch(`https://api.stability.ai${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[stability] ${endpoint} error ${res.status}:`, txt);
    return NextResponse.json(
      { error: `Stability AI hatası (${res.status}): ${txt.slice(0, 200)}` },
      { status: res.status }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "image/png";
  return NextResponse.json({ image: `data:${ct};base64,${buf.toString("base64")}` });
}

// ─── Operations ───────────────────────────────────────────────────────────────

async function removeBg(imgBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/remove-background", form, apiKey);
}

async function upscale(imgBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", "jewelry product photo, ultra high detail, sharp edges, professional photography");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/upscale/conservative", form, apiKey);
}

async function searchReplace(
  imgBuf: Buffer,
  searchPrompt: string,
  replacePrompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", replacePrompt);
  form.append("search_prompt", searchPrompt);
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/search-and-replace", form, apiKey);
}

async function searchRecolor(
  imgBuf: Buffer,
  selectPrompt: string,
  colorPrompt: string,
  apiKey: string
): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("prompt", colorPrompt);
  form.append("select_prompt", selectPrompt);
  form.append("output_format", "png");
  // ✅ Doğru endpoint: "search-and-recolor" (Stability v2beta resmi adı)
  return stabilityPost("/v2beta/stable-image/edit/search-and-recolor", form, apiKey);
}

async function opErase(imgBuf: Buffer, maskBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("mask", bufferToBlob(maskBuf), "mask.png");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/erase", form, apiKey);
}

async function opInpaint(imgBuf: Buffer, maskBuf: Buffer, apiKey: string): Promise<NextResponse> {
  const form = new FormData();
  form.append("image", bufferToBlob(imgBuf), "image.png");
  form.append("mask", bufferToBlob(maskBuf), "mask.png");
  form.append("prompt", "smooth metal surface, empty setting, no stones, clean polished metal");
  form.append("output_format", "png");
  return stabilityPost("/v2beta/stable-image/edit/inpaint", form, apiKey);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "STABILITY_API_KEY yapılandırılmamış." }, { status: 500 });
  }

  const body = await req.json() as {
    action: string;
    image: string;        // https:// URL veya data: base64
    mask?: string;        // data: base64 PNG binary mask
    searchPrompt?: string;
    replacePrompt?: string;
    selectPrompt?: string;
    colorPrompt?: string;
  };

  const { action, image, mask, searchPrompt, replacePrompt, selectPrompt, colorPrompt } = body;

  if (!image) {
    return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
  }

  try {
    const imgBuf = await resolveImageBuffer(image);

    switch (action) {
      case "remove-background":
        return removeBg(imgBuf, apiKey);

      case "upscale":
        return upscale(imgBuf, apiKey);

      case "search-replace":
        if (!searchPrompt || !replacePrompt) {
          return NextResponse.json(
            { error: "searchPrompt ve replacePrompt gerekli." },
            { status: 400 }
          );
        }
        return searchReplace(imgBuf, searchPrompt, replacePrompt, apiKey);

      case "recolor":
        if (!selectPrompt || !colorPrompt) {
          return NextResponse.json(
            { error: "selectPrompt ve colorPrompt gerekli." },
            { status: 400 }
          );
        }
        return searchRecolor(imgBuf, selectPrompt, colorPrompt, apiKey);

      case "erase": {
        if (!mask) return NextResponse.json({ error: "Maske gerekli." }, { status: 400 });
        const maskBuf = await resolveImageBuffer(mask);
        return opErase(imgBuf, maskBuf, apiKey);
      }

      case "inpaint": {
        if (!mask) return NextResponse.json({ error: "Maske gerekli." }, { status: 400 });
        const maskBuf = await resolveImageBuffer(mask);
        return opInpaint(imgBuf, maskBuf, apiKey);
      }

      default:
        return NextResponse.json({ error: `Geçersiz action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("[stability] unhandled error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "İşlem başarısız." }, { status: 500 });
  }
}
