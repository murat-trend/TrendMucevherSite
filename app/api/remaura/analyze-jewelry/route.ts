import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { analyzeJewelryImage } from "@/lib/ai/remaura/jewelry-analyzer";

loadEnvConfig(process.cwd());

function parseImageInput(body: unknown): { base64: string; mimeType: string } | null {
  const b = body as Record<string, unknown>;
  const image = b?.image as string | undefined;
  const prompt = b?.prompt as string | undefined;

  if (!image || typeof image !== "string") return null;

  let base64: string;
  let mimeType = "image/png";

  if (image.startsWith("data:")) {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    mimeType = match[1] || "image/png";
    base64 = match[2];
  } else {
    base64 = image;
  }

  if (!base64 || base64.length < 100) return null;
  return { base64, mimeType };
}

export async function POST(req: Request) {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY yapılandırılmamış." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const parsed = parseImageInput(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "Geçerli görsel gerekli (base64 veya data URI)." },
        { status: 400 }
      );
    }

    const prompt = (body?.prompt as string) || undefined;
    const result = await analyzeJewelryImage(
      apiKey,
      parsed.base64,
      parsed.mimeType,
      prompt
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Analyze jewelry error:", error);
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        { error: "API anahtarı geçersiz." },
        { status: 401 }
      );
    }
    const msg = (err?.message ?? "") as string;
    const isSafetyRejection = err?.status === 400 || /safety|rejected|content_policy/i.test(msg);
    if (isSafetyRejection) {
      return NextResponse.json(
        {
          error: "Görsel güvenlik filtresi tarafından reddedildi. Farklı bir görsel deneyin.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: typeof msg === "string" && msg ? msg : "Mücevher analizi başarısız." },
      { status: 500 }
    );
  }
}
