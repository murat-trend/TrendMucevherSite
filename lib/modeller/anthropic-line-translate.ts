import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/api/anthropic";

export const ANTHROPIC_TRANSLATE_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6";

export type TripleLocaleStrings = { en: string; de: string; ru: string };

export function parseTripleLocaleJson(raw: string): TripleLocaleStrings {
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as TripleLocaleStrings).en !== "string" ||
    typeof (parsed as TripleLocaleStrings).de !== "string" ||
    typeof (parsed as TripleLocaleStrings).ru !== "string"
  ) {
    throw new Error("Invalid translations shape");
  }
  return parsed as TripleLocaleStrings;
}

/**
 * Tek bir Türkçe metni EN / DE / RU çevirir (şiirsel mücevher üslubu — mevcut /api/translate ile aynı).
 */
export async function translateTurkishLineWithAnthropic(text: string): Promise<TripleLocaleStrings> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { en: "", de: "", ru: "" };
  }

  const apiKey = getAnthropicApiKey();
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: ANTHROPIC_TRANSLATE_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Translate the following text to English, German, and Russian. Use poetic jewelry style. 
Return ONLY a valid JSON object with no markdown, no extra text, no line breaks inside values:
{"en":"translation","de":"translation","ru":"translation"}

Source text:
${trimmed}`,
      },
    ],
  });

  const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseTripleLocaleJson(raw);
}
