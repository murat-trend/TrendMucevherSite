import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { analyzeJewelryImage } from "@/lib/ai/remaura/jewelry-analyzer";
import type { JewelryPlatformTarget } from "@/lib/ai/remaura/jewelry-analyzer";
import { createPaymentSession, creditCredits, debitCredits, getWallet, setCheckoutInfo } from "@/lib/billing/store";
import { createVirtualPosCheckout } from "@/lib/billing/provider";
import { appendRemauraJob } from "@/lib/remaura/jobs-store";
import { getAdminSettings } from "@/lib/site/settings-store";
import { appendRingThreeQuarterRule } from "@/lib/remaura/internal-visual-rules";

loadEnvConfig(process.cwd());

function parseImageInput(body: unknown): { base64: string; mimeType: string } | null {
  const b = body as Record<string, unknown>;
  const image = b?.image as string | undefined;

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
  const startedAt = Date.now();
  let debited = false;
  let debitUserId = "";
  let selectedPlatform: JewelryPlatformTarget | undefined;
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY yapılandırılmamış." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const settings = await getAdminSettings();
    if (!settings.features.analyzeJewelryEnabled) {
      return NextResponse.json(
        { error: "Ürün hikayesi geçici olarak kapalı." },
        { status: 503 }
      );
    }
    const parsed = parseImageInput(body);
    if (!parsed) {
      return NextResponse.json(
        { error: "Geçerli görsel gerekli (base64 veya data URI)." },
        { status: 400 }
      );
    }

    let prompt = (body?.prompt as string) || undefined;
    const applyRingThreeQuarterView = body?.applyRingThreeQuarterView === true;
    if (applyRingThreeQuarterView && prompt?.trim()) {
      prompt = appendRingThreeQuarterRule(prompt.trim());
    }
    const userId = (body?.userId as string | undefined)?.trim();
    selectedPlatform = (body?.selectedPlatform as JewelryPlatformTarget | undefined) ?? undefined;
    if (!userId) {
      return NextResponse.json(
        { error: "userId gerekli." },
        { status: 400 }
      );
    }

    const debitResult = await debitCredits(
      userId,
      settings.contentCreditCost,
      "analyze_jewelry_platform_content"
    );
    if (!debitResult.ok) {
      const session = await createPaymentSession(
        userId,
        settings.contentPriceTry,
        settings.contentCreditCost
      );
      const checkout = await createVirtualPosCheckout(session);
      const updated = await setCheckoutInfo(session.id, checkout.checkoutUrl, checkout.providerRef);
      const wallet = await getWallet(userId);
      await appendRemauraJob({
        type: "analyze_jewelry",
        status: "error",
        userId,
        platform: selectedPlatform,
        durationMs: Date.now() - startedAt,
        estimatedCostUsd: 0,
        message: "insufficient_credit",
      });
      return NextResponse.json(
        {
          error: "Kredi yetersiz. Devam etmek için ödeme gerekli.",
          code: "INSUFFICIENT_CREDIT",
          wallet,
          checkoutSession: updated ?? session,
          checkoutUrl: checkout.checkoutUrl,
        },
        { status: 402 }
      );
    }
    if (debitResult.charged) {
      debited = true;
      debitUserId = userId;
    }

    const result = await analyzeJewelryImage(
      apiKey,
      parsed.base64,
      parsed.mimeType,
      prompt,
      selectedPlatform
    );

    await appendRemauraJob({
      type: "analyze_jewelry",
      status: "ok",
      userId,
      platform: selectedPlatform,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.03,
      message: "analyze_jewelry_ok",
    });
    return NextResponse.json(
      debitResult.charged ? result : { ...result, remauraUnmetered: true as const }
    );
  } catch (error: unknown) {
    if (debited && debitUserId) {
      try {
        const settings = await getAdminSettings();
        await creditCredits(debitUserId, settings.contentCreditCost, "analyze_jewelry_refund");
      } catch {
        // refund best-effort
      }
    }
    console.error("Analyze jewelry error:", error);
    const err = error as { status?: number; code?: string; message?: string };
    const msg = (err?.message ?? "") as string;
    await appendRemauraJob({
      type: "analyze_jewelry",
      status: "error",
      userId: debitUserId || undefined,
      platform: selectedPlatform,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.03,
      message: msg || "analyze_jewelry_error",
    });
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        { error: "API anahtarı geçersiz." },
        { status: 401 }
      );
    }
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
      { error: typeof msg === "string" && msg ? msg : "Ürün hikayesi oluşturulamadı." },
      { status: 500 }
    );
  }
}
