import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";

loadEnvConfig(process.cwd());

const MESHY_REMESH_BASE_URL = "https://api.meshy.ai/openapi/v1/remesh";

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
    const remeshTaskId = searchParams.get("remeshTaskId")?.trim();

    if (!remeshTaskId) {
      return NextResponse.json({ error: "remeshTaskId gerekli." }, { status: 400 });
    }

    const statusRes = await fetch(`${MESHY_REMESH_BASE_URL}/${encodeURIComponent(remeshTaskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const statusData = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok) {
      const message =
        (statusData as { message?: string; error?: string })?.message ||
        (statusData as { message?: string; error?: string })?.error ||
        "Remesh durum sorgusu başarısız.";
      return NextResponse.json({ error: message }, { status: statusRes.status || 500 });
    }

    const data = statusData as {
      id?: string;
      status?: string;
      progress?: number | string;
      model_urls?: {
        glb?: string;
        obj?: string;
        fbx?: string;
        stl?: string;
        usdz?: string;
        blend?: string;
      };
      task_error?: { message?: string };
    };

    const status = String(data?.status ?? "PENDING");
    const progressRaw = data?.progress;
    const progress =
      typeof progressRaw === "number"
        ? progressRaw
        : typeof progressRaw === "string"
          ? Number(progressRaw)
          : undefined;

    const modelUrl = data?.model_urls?.glb ?? null;

    return NextResponse.json({
      remeshTaskId: data?.id ?? remeshTaskId,
      status,
      progress: Number.isFinite(progress) ? progress : undefined,
      modelUrl,
      allUrls: data?.model_urls ?? null,
      error: data?.task_error?.message || null,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Remesh durum sorgusu başarısız." }, { status: 500 });
  }
}
