import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";

loadEnvConfig(process.cwd());

const MESHY_IMAGE_TO_3D_URL = "https://api.meshy.ai/openapi/v1/image-to-3d";

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const apiKey = getMeshyApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Meshy API anahtarı yapılandırılmamış." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId")?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId parametresi gerekli." }, { status: 400 });
    }

    const meshyRes = await fetch(`${MESHY_IMAGE_TO_3D_URL}/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    const meshyData = await meshyRes.json().catch(() => ({}));
    if (!meshyRes.ok) {
      const message =
        (meshyData as { message?: string; error?: string })?.message ||
        (meshyData as { message?: string; error?: string })?.error ||
        "Meshy durum sorgusu basarisiz.";
      return NextResponse.json({ error: message }, { status: meshyRes.status || 500 });
    }

    const normalized = meshyData as {
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
      taskId: firstString(normalized.id, taskId),
      status: normalized.status ?? "PENDING",
      progress: Number.isFinite(progressValue) ? progressValue : undefined,
      previewUrl,
      modelUrl,
      downloadUrl,
      providerResponse: meshyData,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Durum sorgusu basarisiz." }, { status: 500 });
  }
}
