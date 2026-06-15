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

/**
 * V2 (Tripo) — image-to-model. Görsel açısı KORUNUR (orientation: align_image),
 * bu yüzden hazırla adımındaki doğru üretim açısı 3D'ye birebir yansır.
 */
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

    // 2) image_to_model görevi oluştur
    const taskRes = await fetch(`${TRIPO_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: { type, file_token: fileToken },
        model_version: "v3.1",
      }),
    });

    const taskData = (await taskRes.json().catch(() => ({}))) as {
      code?: number;
      data?: { task_id?: string };
      message?: string;
    };

    if (!taskRes.ok || taskData.code !== 0 || !taskData.data?.task_id) {
      console.error("[uretim-3d/tripo/create] task error:", taskRes.status, taskData);
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
    console.error("[uretim-3d/tripo/create] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "3D oluşturma isteği başarısız." },
      { status: 500 }
    );
  }
}
