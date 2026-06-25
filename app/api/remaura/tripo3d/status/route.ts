import { NextResponse } from "next/server";
import { getTripoApiKey, TRIPO_BASE } from "@/lib/api/tripo";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "3D servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId")?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId parametresi gerekli." }, { status: 400 });
    }

    const res = await fetch(`${TRIPO_BASE}/task/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      code?: number;
      data?: {
        task_id?: string;
        status?: string;
        progress?: number;
        output?: {
          model?: string;
          rendered_image?: string;
          pbr_model?: string;
        };
      };
      message?: string;
    };

    if (!res.ok || data.code !== 0) {
      return NextResponse.json(
        { error: "3D model durumu alınamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    const d = data.data ?? {};

    // Tripo durumlarını ortak formata normalize et
    const rawStatus = (d.status ?? "queued").toLowerCase();
    const statusMap: Record<string, string> = {
      queued: "PENDING",
      running: "IN_PROGRESS",
      success: "SUCCEEDED",
      failed: "FAILED",
      cancelled: "FAILED",
      canceled: "FAILED",
    };
    const status = statusMap[rawStatus] ?? rawStatus.toUpperCase();

    const modelUrl = d.output?.pbr_model ?? d.output?.model ?? null;

    return NextResponse.json({
      taskId: d.task_id ?? taskId,
      status,
      progress: typeof d.progress === "number" ? d.progress : undefined,
      modelUrl,
      downloadUrl: modelUrl,
      previewUrl: d.output?.rendered_image ?? null,
    });
  } catch (err: unknown) {
    console.error("[tripo3d/status]", err);
    return NextResponse.json({ error: "Durum sorgusu başarısız." }, { status: 500 });
  }
}
