import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAnthropicApiKey } from "@/lib/api/anthropic";

const LOG_PREFIX = "[translate]";

const DEFAULT_MODEL = "claude-opus-4-6";

type Translations = { en: string; de: string; ru: string };

function parseTranslationsJson(raw: string): Translations {
  console.log("[translate] ham yanıt:", raw);
  const clean = raw.replace(/```json|```/g, "").trim();
  console.log("[translate] temizlenmiş:", clean);
  const parsed = JSON.parse(clean) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Translations).en !== "string" ||
    typeof (parsed as Translations).de !== "string" ||
    typeof (parsed as Translations).ru !== "string"
  ) {
    throw new Error("Invalid translations shape");
  }
  return parsed as Translations;
}

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang = "tr" } = (await req.json()) as {
      text?: string;
      sourceLang?: string;
    };
    if (!text?.trim()) {
      return NextResponse.json({ error: "Metin gerekli" }, { status: 400 });
    }

    const apiKey = getAnthropicApiKey();
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Translate the following text to English, German, and Russian. Use poetic jewelry style. 
Return ONLY a valid JSON object with no markdown, no extra text, no line breaks inside values:
{"en":"translation","de":"translation","ru":"translation"}

Source text:
${text}`,
        },
      ],
    });

    const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const translations = parseTranslationsJson(raw);

    return NextResponse.json({ ok: true, translations });
  } catch (err) {
    console.error(LOG_PREFIX, err);
    console.error(
      "[translate] detay:",
      JSON.stringify(err, Object.getOwnPropertyNames(err as object)),
    );
    if (err instanceof SyntaxError || (err instanceof Error && err.message === "Invalid translations shape")) {
      return NextResponse.json({ error: "Çeviri yanıtı işlenemedi" }, { status: 502 });
    }
    return NextResponse.json({ error: "Çeviri başarısız" }, { status: 500 });
  }
}
