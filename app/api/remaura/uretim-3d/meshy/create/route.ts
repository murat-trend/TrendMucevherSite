import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

/**
 * V1 (Meshy) — KOPYA (kaynak: mesh3d/create), süper-admin geçitli, izole.
 * Kritik kalite parametreleri backend'de sabit; istemci değiştiremez.
 */
function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const apiKey = getMeshyApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Meshy API anahtarı yapılandırılmamış (MESHY_API_KEY)." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { image?: string; mode?: string };
    const imageUrl = body?.image?.trim();
    const mode = body?.mode === "visual" ? "visual" : "production";

    if (!imageUrl?.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "Meshy için alfa kanallı PNG gerekli. Önce arka plan temizliği yapılmalıdır." },
        { status: 400 }
      );
    }

    const meshyPayload = {
      image_url: imageUrl,
      ai_model: "meshy-6",
      art_style: "realistic",
      model_type: "standard",
      topology: "triangle",
      should_texture: mode === "visual",
      enable_pbr: mode === "visual",
      should_remesh: false,
    };

    const meshyRes = await fetch(MESHY_IMAGE_TO_3D_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meshyPayload),
    });

    const meshyData = await meshyRes.json().catch(() => ({}));
    if (!meshyRes.ok) {
      return NextResponse.json(
        { error: "3D model oluşturulamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    const normalized = meshyData as {
      result?: string;
      id?: string;
      status?: string;
      progress?: number | string;
      thumbnail_url?: string;
      preview_url?: string;
      model_url?: string;
      model_urls?: { glb?: string; gltf?: string; usdz?: string; stl?: string };
    };

    const taskId = firstString(normalized.result, normalized.id);
    const previewUrl = firstString(normalized.preview_url, normalized.thumbnail_url);
    const modelUrl = firstString(
      normalized.model_url,
      normalized.model_urls?.glb,
      normalized.model_urls?.gltf
    );

    return NextResponse.json({
      engine: "meshy",
      taskId,
      status: normalized.status ?? "PENDING",
      previewUrl,
      modelUrl,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "3D oluşturma isteği başarısız." },
      { status: 500 }
    );
  }
}
