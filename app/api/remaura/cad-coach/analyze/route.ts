import { loadEnvConfig } from "@next/env";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/api/anthropic";
import { buildSystemPrompt as buildMatrixGoldSystemPrompt } from "@/lib/remaura/cad/matrixgold-library";

loadEnvConfig(process.cwd());

const LOG_PREFIX = "[remaura/cad-coach/analyze]";

type ImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

const ALLOWED: readonly ImageMedia[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function normalizeBase64(image: string): { data: string; mediaType: ImageMedia } {
  const dataUrlMatch = image.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1].toLowerCase() as ImageMedia;
    const mediaType = ALLOWED.includes(mime) ? mime : "image/png";
    return { data: dataUrlMatch[2], mediaType };
  }
  return { data: image, mediaType: "image/jpeg" };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, prompt } = body as { image?: string; prompt?: string };

    const apiKey = getAnthropicApiKey();
    const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";

    const client = new Anthropic({ apiKey });

    const userContent: Anthropic.MessageCreateParams["messages"][number]["content"] = [];

    if (image) {
      const { data, mediaType } = normalizeBase64(image);
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data },
      });
    }

    userContent.push({
      type: "text",
      text:
        prompt ??
        "Bu takı görselini analiz et. MatrixGold NURBS modelleme adımlarını ve gerekli şemaları JSON formatında oluştur.",
    });

    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      system: buildMatrixGoldSystemPrompt(),
      messages: [{ role: "user", content: userContent }],
    });

    const rawText = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");

    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      return NextResponse.json({ ok: true, data });
    } catch {
      return NextResponse.json({ ok: true, rawText });
    }
  } catch (err) {
    console.error(LOG_PREFIX, err);
    return NextResponse.json({ ok: false, error: "Analiz başarısız" }, { status: 502 });
  }
}
