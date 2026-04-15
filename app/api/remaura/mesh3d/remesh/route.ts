import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getMeshyApiKey } from "@/lib/api/meshy";

loadEnvConfig(process.cwd());

const MESHY_REMESH_URL = "https://api.meshy.ai/openapi/v1/remesh";

export async function POST(req: Request) {
  try {
    const apiKey = getMeshyApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Meshy API anahtarı yapılandırılmamış." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const taskId = (body?.taskId as string | undefined)?.trim();
    const resizeHeightMm = Number(body?.resizeHeightMm);

    if (!taskId) {
      return NextResponse.json({ error: "taskId gerekli." }, { status: 400 });
    }

    if (!Number.isFinite(resizeHeightMm) || resizeHeightMm <= 0) {
      return NextResponse.json({ error: "Geçerli bir resizeHeightMm değeri gerekli." }, { status: 400 });
    }

    // Meshy Remesh API metres cinsinden bekliyor: mm → m
    const resizeHeightMeters = resizeHeightMm / 1000;

    const remeshPayload = {
      input_task_id: taskId,
      target_formats: ["glb", "stl"],
      resize_height: resizeHeightMeters,
      origin_at: "bottom",
    };

    const remeshRes = await fetch(MESHY_REMESH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(remeshPayload),
    });

    const remeshData = await remeshRes.json().catch(() => ({}));
    if (!remeshRes.ok) {
      const message =
        (remeshData as { message?: string; error?: string })?.message ||
        (remeshData as { message?: string; error?: string })?.error ||
        "Remesh görevi oluşturulamadı.";
      return NextResponse.json({ error: message }, { status: remeshRes.status || 500 });
    }

    const remeshTaskId = (remeshData as { result?: string })?.result ?? null;

    return NextResponse.json({
      remeshTaskId,
      resizeHeightMm,
      resizeHeightMeters,
      status: "PENDING",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err?.message ?? "Remesh isteği başarısız." }, { status: 500 });
  }
}
