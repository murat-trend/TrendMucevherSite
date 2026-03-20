import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { analyzeStyleReferences } from "@/lib/ai/remaura/style-analyzer";

loadEnvConfig(process.cwd());

export async function POST(req: Request) {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış." },
        { status: 500 }
      );
    }

    const body = await req.json();

    // Tek görsel (eski format) veya çoklu görsel
    const images = body.images as Array<{ base64: string; mimeType?: string }> | undefined;
    const legacyImage = body.image as string | undefined;
    const legacyMime = (body.mimeType as string) || "image/jpeg";

    const imageInputs: Array<{ base64: string; mimeType: string }> = [];

    if (images?.length) {
      for (const img of images.slice(0, 4)) {
        if (img?.base64) {
          imageInputs.push({
            base64: img.base64,
            mimeType: img.mimeType || "image/jpeg",
          });
        }
      }
    } else if (legacyImage) {
      imageInputs.push({ base64: legacyImage, mimeType: legacyMime });
    }

    if (imageInputs.length === 0) {
      return NextResponse.json(
        { error: "En az bir görsel gerekli (base64)." },
        { status: 400 }
      );
    }

    const result = await analyzeStyleReferences(apiKey, imageInputs);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("ANALYZE STYLE ERROR:", error);
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
          error:
            "Referans görsel güvenlik filtresi tarafından reddedildi. Farklı bir görsel yüklemeyi deneyin.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Stil analizi başarısız." },
      { status: 500 }
    );
  }
}
