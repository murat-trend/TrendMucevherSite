import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { analyzeStyleReferences } from "@/lib/ai/remaura/style-analyzer";
import { appendRemauraJob } from "@/lib/remaura/jobs-store";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";
import { getAdminSettings } from "@/lib/site/settings-store";
import { MAX_STYLE_REFERENCE_SLOTS } from "@/components/remaura/remaura-types";

loadEnvConfig(process.cwd());

export async function POST(req: Request) {
  const startedAt = Date.now();
  let status: "ok" | "error" = "ok";
  let userId = "";
  try {
    // 1. AUTH CHECK — herşeyden önce
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekli." },
        { status: 401 }
      );
    }

    // userId SESSION'DAN, body'den DEĞİL
    userId = user.id;

    // 2. Admin feature flag
    const settings = await getAdminSettings();
    if (!settings.features.analyzeStyleEnabled) {
      return NextResponse.json(
        { error: "Stil analizi geçici olarak kapalı." },
        { status: 503 }
      );
    }

    // 3. OpenAI key
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış." },
        { status: 500 }
      );
    }

    // 4. Body parse
    const body = await req.json();

    // 5. Credit check — verified userId ile
    const billing = await requireRemauraUserAndCredits(userId);
    if (!billing.ok) return billing.response;

    // 6. Image processing
    const images = body.images as Array<{ base64: string; mimeType?: string }> | undefined;
    const legacyImage = body.image as string | undefined;
    const legacyMime = (body.mimeType as string) || "image/jpeg";

    const imageInputs: Array<{ base64: string; mimeType: string }> = [];

    if (images?.length) {
      for (const img of images.slice(0, MAX_STYLE_REFERENCE_SLOTS)) {
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
    await appendRemauraJob({
      type: "analyze_style",
      status,
      userId: userId || undefined,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.015,
      message: "analyze_style_ok",
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    status = "error";
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
  } finally {
    if (status === "error") {
      await appendRemauraJob({
        type: "analyze_style",
        status: "error",
        userId: userId || undefined,
        durationMs: Date.now() - startedAt,
        estimatedCostUsd: 0.015,
        message: "analyze_style_error",
      });
    }
  }
}
