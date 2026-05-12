import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/api/anthropic";
import { ANTHROPIC_TRANSLATE_MODEL } from "@/lib/modeller/anthropic-line-translate";

export const POST_LOCALES = ["tr", "en", "de", "ru"] as const;
export type PostLocale = (typeof POST_LOCALES)[number];
export type PostTranslationsQuad = Record<PostLocale, { title: string; content: string; excerpt: string }>;

function parsePostTranslationsQuad(raw: string): PostTranslationsQuad {
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as unknown;
  if (typeof parsed !== "object" || parsed === null) throw new Error("Invalid shape");
  const out = {} as PostTranslationsQuad;
  for (const loc of POST_LOCALES) {
    const block = (parsed as Record<string, unknown>)[loc];
    if (typeof block !== "object" || block === null) throw new Error(`Missing locale: ${loc}`);
    const b = block as Record<string, unknown>;
    out[loc] = {
      title:   typeof b.title   === "string" ? b.title   : "",
      content: typeof b.content === "string" ? b.content : "",
      excerpt: typeof b.excerpt === "string" ? b.excerpt : "",
    };
  }
  if (!out.tr.title.trim()) throw new Error("Turkish title required");
  return out;
}

export async function buildPostTranslations(
  title: string,
  content: string,
  excerpt: string,
): Promise<PostTranslationsQuad | null> {
  const titleTrim = title.trim();
  if (!titleTrim) return null;
  try {
    const apiKey = getAnthropicApiKey();
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: ANTHROPIC_TRANSLATE_MODEL,
      max_tokens: 16000,
      messages: [{
        role: "user",
        content: `Translate this Turkish blog post (written by a jewelry artist) to English, German, and Russian.

Return ONE JSON object with keys "tr","en","de","ru". Each value: {"title":"...","content":"...","excerpt":"..."}.
- "tr": keep closest to the original, light polish only.
- content: preserve paragraph structure (keep newlines).
- excerpt: if empty, derive a 1-2 sentence summary from content.
- Return ONLY minified JSON — no markdown fences, no commentary.

TITLE: ${titleTrim}
EXCERPT: ${excerpt.trim() || "(empty)"}
CONTENT:
${content.trim() || "(empty)"}`,
      }],
    });
    const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    return parsePostTranslationsQuad(raw);
  } catch (e) {
    console.error("[buildPostTranslations]", e);
    return null;
  }
}

export function postTranslationsToDbPatch(quad: PostTranslationsQuad): Record<string, unknown> {
  return {
    translations: quad as unknown as Record<string, unknown>,
    title_en:   quad.en.title   || null,
    content_en: quad.en.content || null,
    excerpt_en: quad.en.excerpt || null,
    title_de:   quad.de.title   || null,
    content_de: quad.de.content || null,
    excerpt_de: quad.de.excerpt || null,
    title_ru:   quad.ru.title   || null,
    content_ru: quad.ru.content || null,
    excerpt_ru: quad.ru.excerpt || null,
  };
}

export function pickLocalizedPostText(
  locale: string,
  translations: unknown,
  legacy: {
    title: string;
    content: string | null;
    excerpt: string | null;
    title_en?: string | null;
    content_en?: string | null;
    excerpt_en?: string | null;
    title_de?: string | null;
    content_de?: string | null;
    excerpt_de?: string | null;
    title_ru?: string | null;
    content_ru?: string | null;
    excerpt_ru?: string | null;
  },
): { title: string; content: string; excerpt: string } {
  const loc: PostLocale = (POST_LOCALES as readonly string[]).includes(locale)
    ? (locale as PostLocale)
    : "tr";

  const o =
    translations != null && typeof translations === "object"
      ? (translations as Record<string, { title?: string; content?: string; excerpt?: string }>)
      : null;
  const block = o?.[loc];
  if (block?.title?.trim()) {
    return {
      title:   block.title.trim(),
      content: block.content?.trim() || legacy.content || "",
      excerpt: block.excerpt?.trim() || legacy.excerpt || "",
    };
  }

  if (loc === "en") return {
    title:   legacy.title_en?.trim()   || legacy.title,
    content: legacy.content_en?.trim() || legacy.content || "",
    excerpt: legacy.excerpt_en?.trim() || legacy.excerpt || "",
  };
  if (loc === "de") return {
    title:   legacy.title_de?.trim()   || legacy.title,
    content: legacy.content_de?.trim() || legacy.content || "",
    excerpt: legacy.excerpt_de?.trim() || legacy.excerpt || "",
  };
  if (loc === "ru") return {
    title:   legacy.title_ru?.trim()   || legacy.title,
    content: legacy.content_ru?.trim() || legacy.content || "",
    excerpt: legacy.excerpt_ru?.trim() || legacy.excerpt || "",
  };
  return {
    title:   legacy.title,
    content: legacy.content || "",
    excerpt: legacy.excerpt || "",
  };
}
