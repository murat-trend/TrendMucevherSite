import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { optimizePrompt } from "@/lib/ai/remaura/prompt-optimizer";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import { appendRemauraJob } from "@/lib/remaura/jobs-store";
import { appendRingThreeQuarterRule, stripRingThreeQuarterRule } from "@/lib/remaura/internal-visual-rules";

loadEnvConfig(process.cwd());

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
    const localeRaw = (body.locale as string) || "tr";
    const locale = localeRaw === "en" ? "en" : "tr";
    const mode3DExport = body.mode3DExport === true;
    const applyRingThreeQuarterView = body.applyRingThreeQuarterView === true;
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt gerekli." },
        { status: 400 }
      );
    }

    const promptForModel = applyRingThreeQuarterView ? appendRingThreeQuarterRule(prompt) : prompt;
    const result = await optimizePrompt(apiKey, promptForModel, undefined, locale, mode3DExport);
    const sanitized: OptimizedPromptResult = {
      ...result,
      optimizedPrompt: stripRingThreeQuarterRule(result.optimizedPrompt ?? ""),
      optimizedPromptTr: result.optimizedPromptTr
        ? stripRingThreeQuarterRule(result.optimizedPromptTr)
        : result.optimizedPromptTr,
    };
    await appendRemauraJob({
      type: "optimize",
      status,
      userId: userId || undefined,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.01,
      message: "optimize_ok",
    });
    return NextResponse.json(sanitized);
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
