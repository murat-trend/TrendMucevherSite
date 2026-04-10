import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { optimizePrompt } from "@/lib/ai/remaura/prompt-optimizer";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import { appendRemauraJob } from "@/lib/remaura/jobs-store";
import { detectJewelryShotFromUserPrompt } from "@/lib/remaura/jewelry-shot-detection";
import { normalizePromptLocale } from "@/lib/i18n/prompt-locale";

loadEnvConfig(process.cwd());

const DEBUG_MODE = process.env.NODE_ENV !== "production";

export async function POST(req: Request) {
  const startedAt = Date.now();
  let status: "ok" | "error" = "ok";
  let userId = "";
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış." },
        { status: 500 }
      );
    }

    const body = await req.json();
    userId = (body.userId as string | undefined)?.trim() || "";
    const prompt = (body.prompt as string)?.trim();
    const locale = normalizePromptLocale(body.locale);
    const mode3DExport = body.mode3DExport === true;
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt gerekli." },
        { status: 400 }
      );
    }

    const shot = detectJewelryShotFromUserPrompt(prompt);

    if (DEBUG_MODE) {
      console.log("\n╔══════════════════════════════════════════════╗");
      console.log("║  REMAURA DEBUG — OPTIMIZE                    ║");
      console.log("╠══════════════════════════════════════════════╣");
      console.log("║ locale:", locale, "| shot:", shot, "| 3D:", mode3DExport);
      console.log("║ raw prompt:", prompt);
      console.log("╚══════════════════════════════════════════════╝");
    }

    const result = await optimizePrompt(apiKey, prompt, undefined, locale, mode3DExport);

    if (DEBUG_MODE) {
      console.log("\n--- Optimized result ---");
      console.log("optimizedPrompt:", result.optimizedPrompt);
      if (result.optimizedPromptTr) console.log("optimizedPromptTr:", result.optimizedPromptTr);
      console.log("--- END optimize ---\n");
    }

    await appendRemauraJob({
      type: "optimize",
      status,
      userId: userId || undefined,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.01,
      message: "optimize_ok",
    });
    return NextResponse.json({ ...result, jewelryShot: shot });
  } catch (error: unknown) {
    status = "error";
    console.error("OPTIMIZE ERROR:", error);
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        { error: "API anahtarı geçersiz." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Optimizasyon başarısız." },
      { status: 500 }
    );
  } finally {
    if (status === "error") {
      await appendRemauraJob({
        type: "optimize",
        status: "error",
        userId: userId || undefined,
        durationMs: Date.now() - startedAt,
        estimatedCostUsd: 0.01,
        message: "optimize_error",
      });
    }
  }
}
