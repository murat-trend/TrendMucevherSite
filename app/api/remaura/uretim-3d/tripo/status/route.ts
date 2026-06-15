import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getTripoApiKey, TRIPO_BASE } from "@/lib/api/tripo";

loadEnvConfig(process.cwd());

/**
 * V2 (Tripo) durum. status: queued/running/success/failed → ortak forma çevrilir.
 * output.model (GLB) önizleme/indirme için kullanılır. STL convert sonraki iş.
 */
function mapStatus(s: string): string {
  const v = s.toLowerCase();
  if (v === "success") return "SUCCEEDED";
  if (v === "failed" || v === "cancelled" || v === "canceled" || v === "error") return "FAILED";
  if (v === "running") return "IN_PROGRESS";
  return "PENDING";
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function GET(req: Request) {
  const apiKey = getTripoApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "3D servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId")?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId parametresi gerekli." }, { status: 400 });
  }

  try {
    const res = await fetch(`${TRIPO_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: number;
      data?: {
        status?: string;
        progress?: number;
        output?: { model?: string; pbr_model?: string; rendered_image?: string };
      };
      message?: string;
    };

    if (!res.ok || data.code !== 0 || !data.data) {
      return NextResponse.json(
        { error: "3D model durumu alınamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    const d = data.data;
    const modelUrl = firstString(d.output?.pbr_model, d.output?.model);

    return NextResponse.json({
      engine: "tripo",
      taskId,
      status: mapStatus(d.status ?? "PENDING"),
      progress: typeof d.progress === "number" ? d.progress : undefined,
      previewUrl: firstString(d.output?.rendered_image),
      modelUrl,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Durum sorgusu başarısız." }, { status: 500 });
  }
}
