import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

loadEnvConfig(process.cwd());

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";
const MESHY_REQUIRED_AI_MODEL = "meshy-6";
const LOCKED_MESHY_FIELDS = [
  "ai_model",
  "art_style",
  "model_type",
  "topology",
  "should_texture",
  "enable_pbr",
  "should_remesh",
  "output_format",
] as const;

/**
 * MESHY URETIM SOZLESMESI (DOKUNULMAZ):
 * - Bu endpointteki kritik kalite/maliyet parametreleri istemciden degistirilemez.
 * - Sadece backend sabitleri ve acik urun karari ile guncellenir.
 */
function hasLockedFieldOverride(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  return LOCKED_MESHY_FIELDS.filter((field) => field in record);
}

function getQualityProfile(mode: "production" | "visual") {
  if (mode === "visual") {
    return {
      art_style: "realistic" as const,
      model_type: "standard" as const,
      topology: "triangle" as const,
      should_texture: true,
      enable_pbr: true,
      should_remesh: false,
    };
  }
  return {
    art_style: "realistic" as const,
    model_type: "standard" as const,
    topology: "triangle" as const,
    should_texture: false,
    enable_pbr: false,
    should_remesh: false,
  };
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const apiKey = getMeshyApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Meshy API anahtarı yapılandırılmamış. .env.local dosyasında MESHY_API_KEY=... ekleyin." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const billing = await requireRemauraUserAndCredits(body?.userId as string | undefined);
    if (!billing.ok) return billing.response;

    const overrideFields = hasLockedFieldOverride(body);
    if (overrideFields.length > 0) {
      return NextResponse.json(
        { error: `Kilitli Meshy alanlari istemciden degistirilemez: ${overrideFields.join(", ")}` },
        { status: 400 }
      );
    }

    const imageUrl = (body?.image as string | undefined)?.trim();
    const mode = body?.mode === "visual" ? "visual" : "production";
    const targetSize =
      typeof body?.targetSize === "number" && body.targetSize > 0
        ? (body.targetSize as number)
        : null;

    if (!imageUrl?.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "Meshy için alfa kanallı PNG gerekli. Önce arka plan temizliği yapılmalıdır." },
        { status: 400 }
      );
    }

    const quality = getQualityProfile(mode);

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

    console.log("Meshy Image-to-3D Payload:", meshyPayload);

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
      const message =
        (meshyData as { message?: string; error?: string })?.message ||
        (meshyData as { message?: string; error?: string })?.error ||
        "Meshy gorevi olusturulamadi.";
      return NextResponse.json({ error: message }, { status: meshyRes.status || 500 });
    }

    const normalized = meshyData as {
      result?: string;
      id?: string;
      status?: string;
      progress?: number | string;
      thumbnail_url?: string;
      preview_url?: string;
      model_url?: string;
      model_urls?: {
        glb?: string;
        gltf?: string;
        usdz?: string;
        obj?: string;
        fbx?: string;
        stl?: string;
      };
    };

    const taskId = firstString(normalized.result, normalized.id);
    const previewUrl = firstString(normalized.preview_url, normalized.thumbnail_url);
    const modelUrl = firstString(
      normalized.model_url,
      normalized.model_urls?.glb,
      normalized.model_urls?.gltf,
      normalized.model_urls?.usdz
    );
    const downloadUrl = firstString(
      modelUrl,
      normalized.model_urls?.obj,
      normalized.model_urls?.fbx,
      normalized.model_urls?.stl
    );
    const progressValue =
      typeof normalized.progress === "number"
        ? normalized.progress
        : typeof normalized.progress === "string"
          ? Number(normalized.progress)
          : undefined;

    return NextResponse.json({
      mode,
      taskId,
      status: normalized.status ?? "PENDING",
      progress: Number.isFinite(progressValue) ? progressValue : undefined,
      previewUrl,
      modelUrl,
      downloadUrl,
      providerResponse: meshyData,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "3D olusturma istegi basarisiz." }, { status: 500 });
  }
}
