import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";
import { falUpscaleToUrl, type UpscaleModel } from "@/lib/remaura/aci-lab-upscale";

const MODELS: UpscaleModel[] = ["clarity", "aura-sr", "esrgan"];

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * AÇI LAB — UPSCALE (Real-ESRGAN / fal, izole deney).
 * Düşük kaliteli girdiyi netleştirir. Poz-normalize'DEN önce çalışacak adım.
 * Serverless (fal) — geçici; olgunlaşınca kendi Real-ESRGAN sunucumuza taşınır.
 */

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json()) as { image?: string; scale?: number; model?: UpscaleModel };
    if (!body.image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }
    const scale = Math.max(1, Math.min(Math.round(body.scale ?? 2), 4));
    const model: UpscaleModel = MODELS.includes(body.model as UpscaleModel)
      ? (body.model as UpscaleModel)
      : "clarity";
    const url = await falUpscaleToUrl(body.image, scale, model);
    return NextResponse.json({ image: url, meta: { scale, model } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[aci-lab/upscale] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
