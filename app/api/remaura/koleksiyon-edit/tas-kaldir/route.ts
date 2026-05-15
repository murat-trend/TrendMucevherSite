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

// base64 data URL veya https:// → fal CDN URL
async function toFalUrl(image: string, falKey: string): Promise<string> {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: falKey });
  const raw = image.includes(",") ? image.split(",")[1] : image;
  const buf = Buffer.from(raw, "base64");
  const file = new File([new Uint8Array(buf)], "image.png", { type: "image/png" });
  return await fal.storage.upload(file);
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const falKey = process.env.FAL_KEY;
  const stabilityKey = process.env.STABILITY_API_KEY;

  if (!falKey) return NextResponse.json({ error: "FAL_KEY yapılandırılmamış." }, { status: 500 });
  if (!stabilityKey) return NextResponse.json({ error: "STABILITY_API_KEY yapılandırılmamış." }, { status: 500 });

  const { image } = await req.json() as { image: string };
  if (!image) return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });

  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });

    // 1. Görseli fal CDN'e yükle (gerekirse)
    const imageUrl = await toFalUrl(image, falKey);

    // 2. EVF-SAM2 ile taş/değerli taş maskesi üret
    const samResult = await fal.subscribe("fal-ai/evf-sam", {
      input: {
        image_url: imageUrl,
        text_prompt: "gemstone, diamond, crystal, prong-set stone, faceted gem, ruby, sapphire, emerald",
      },
      logs: false,
    });

    type FalImage = { url: string };
    const maskUrl = (samResult.data as { image?: FalImage })?.image?.url;
    if (!maskUrl) {
      return NextResponse.json({ error: "Taş maskesi üretilemedi." }, { status: 500 });
    }

    // 3. Orijinal görsel + maske buffer'larını paralel çek
    const [imgRes, maskRes] = await Promise.all([
      fetch(imageUrl, { cache: "no-store" }),
      fetch(maskUrl, { cache: "no-store" }),
    ]);
    if (!imgRes.ok) throw new Error(`Görsel fetch başarısız: ${imgRes.status}`);
    if (!maskRes.ok) throw new Error(`Maske fetch başarısız: ${maskRes.status}`);

    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const maskBuf = Buffer.from(await maskRes.arrayBuffer());

    // 4. Stability inpaint: maskelenen taş alanlarını metal yüzeyle doldur
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(imgBuf)], { type: "image/png" }), "image.png");
    form.append("mask", new Blob([new Uint8Array(maskBuf)], { type: "image/png" }), "mask.png");
    form.append("prompt", "empty bezel setting, smooth polished metal surface, no gemstone, clean metal jewelry");
    form.append("output_format", "png");

    const stabRes = await fetch("https://api.stability.ai/v2beta/stable-image/edit/inpaint", {
      method: "POST",
      headers: { Authorization: `Bearer ${stabilityKey}`, Accept: "image/*" },
      body: form,
    });

    if (!stabRes.ok) {
      const txt = await stabRes.text();
      console.error("[tas-kaldir] stability error:", txt);
      return NextResponse.json(
        { error: `Stability hatası (${stabRes.status}): ${txt.slice(0, 200)}` },
        { status: stabRes.status }
      );
    }

    const resultBuf = Buffer.from(await stabRes.arrayBuffer());
    const ct = stabRes.headers.get("content-type") ?? "image/png";
    return NextResponse.json({
      image: `data:${ct};base64,${resultBuf.toString("base64")}`,
    });
  } catch (err: unknown) {
    console.error("[tas-kaldir] error:", err);
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message ?? "İşlem başarısız." }, { status: 500 });
  }
}
