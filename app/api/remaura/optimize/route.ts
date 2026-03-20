import { loadEnvConfig } from "@next/env";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { optimizePrompt } from "@/lib/ai/remaura/prompt-optimizer";

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
    const prompt = (body.prompt as string)?.trim();
    const localeRaw = (body.locale as string) || "tr";
    const locale = localeRaw === "en" ? "en" : "tr";
    const mode3DExport = body.mode3DExport === true;
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt gerekli." },
        { status: 400 }
      );
    }

    const result = await optimizePrompt(apiKey, prompt, undefined, locale, mode3DExport);
    return NextResponse.json(result);
  } catch (error: unknown) {
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
  }
}
