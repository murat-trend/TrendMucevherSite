import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import {
  getTripoApiKey,
  tripoUploadImage,
  TRIPO_BASE,
} from "@/lib/api/tripo";
import { requireSuperAdmin } from "@/lib/remaura/uretim-3d/auth";

loadEnvConfig(process.cwd());

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const apiKey = getTripoApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "3D servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as { image?: string };
    const image = body?.image?.trim();
    if (!image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }

    // 1) Görseli Tripo'ya yükle → file_token
    const { fileToken, type } = await tripoUploadImage(apiKey, image);
    console.log("[uretim-3d/tripo/create] upload ok, token:", fileToken.slice(0, 12), "type:", type);

    // 2) image_to_model görevi oluştur (V3 endpoint, 90s timeout)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    let taskRes: Response;
    try {
      taskRes = await fetch(`${TRIPO_BASE}/generation/image-to-model`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: "v2.5-20250123",
          file: { type, file_token: fileToken },
        }),
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      console.error("[uretim-3d/tripo/create] fetch failed:", aborted ? "timeout(90s)" : e);
      return NextResponse.json(
        { error: aborted ? "3D servisi zaman aşımına uğradı, tekrar deneyin." : "3D servisine ulaşılamadı." },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeout);
    }

    // Ham yanıtı oku — 504/HTML olsa bile gerçek içeriği görelim
    const rawText = await taskRes.text();
    let taskData: { code?: number; data?: { task_id?: string }; message?: string } = {};
    try { taskData = JSON.parse(rawText); } catch { /* HTML gate yanıtı */ }

    if (!taskRes.ok || taskData.code !== 0 || !taskData.data?.task_id) {
      console.error(
        "[uretim-3d/tripo/create] task error:",
        taskRes.status,
        "code:", taskData.code,
        "msg:", taskData.message,
        "raw:", rawText.slice(0, 400)
      );
      return NextResponse.json(
        { error: "3D model oluşturulamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      engine: "tripo",
      taskId: taskData.data.task_id,
      status: "PENDING",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[uretim-3d/tripo/create] error:", err?.message ?? error);
    return NextResponse.json(
      { error: err?.message ?? "3D oluşturma isteği başarısız." },
      { status: 500 }
    );
  }
}
