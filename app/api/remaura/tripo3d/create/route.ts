import { NextResponse } from "next/server";
import { getTripoApiKey, TRIPO_BASE, tripoUploadImage } from "@/lib/api/tripo";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const apiKey = getTripoApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "3D servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const billing = await requireRemauraUserAndCredits(body?.userId as string | undefined);
    if (!billing.ok) return billing.response;

    const image = (body?.image as string | undefined)?.trim();
    if (!image) {
      return NextResponse.json({ error: "Görsel gerekli." }, { status: 400 });
    }

    // 1. Görseli yükle → file_token al
    const { fileToken, type } = await tripoUploadImage(apiKey, image);

    // 2. image-to-model görevi oluştur
    const createRes = await fetch(`${TRIPO_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: { type, file_token: fileToken },
        model_version: "v2.5-20250123",
      }),
    });

    const createData = (await createRes.json().catch(() => ({}))) as {
      code?: number;
      data?: { task_id?: string };
      message?: string;
    };

    if (!createRes.ok || createData.code !== 0 || !createData.data?.task_id) {
      console.error("[tripo3d/create]", createData);
      return NextResponse.json(
        { error: "3D model oluşturulamadı. Lütfen daha sonra tekrar deneyin." },
        { status: 503 }
      );
    }

    const taskId = createData.data.task_id;

    return NextResponse.json({
      taskId,
      status: "PENDING",
      progress: 0,
      provider: "rv2",
    });
  } catch (err: unknown) {
    console.error("[tripo3d/create]", err);
    return NextResponse.json(
      { error: "3D oluşturma isteği başarısız. Lütfen daha sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
