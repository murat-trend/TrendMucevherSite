import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/api/anthropic";
import { ANTHROPIC_TRANSLATE_MODEL } from "@/lib/modeller/anthropic-line-translate";

export const PRODUCT_LOCALES = ["tr", "en", "de", "ru"] as const;
export type ProductLocale = (typeof PRODUCT_LOCALES)[number];
export type ContentSourceLocale = ProductLocale;

export type ProductTranslationsQuad = Record<ProductLocale, { name: string; story: string }>;

const SOURCE_LABEL: Record<ContentSourceLocale, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  ru: "Russian",
};

function parseProductTranslationsQuad(raw: string): ProductTranslationsQuad {
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid translations shape");
  }
  const out = {} as ProductTranslationsQuad;
  for (const loc of PRODUCT_LOCALES) {
    const block = (parsed as Record<string, unknown>)[loc];
    if (typeof block !== "object" || block === null) {
      throw new Error(`Missing locale ${loc}`);
    }
    const name = typeof (block as { name?: unknown }).name === "string" ? (block as { name: string }).name : "";
    const story =
      typeof (block as { story?: unknown }).story === "string" ? (block as { story: string }).story : "";
    out[loc] = { name, story };
  }
  if (!out.tr.name.trim()) {
    throw new Error("Turkish name required in response");
  }
  return out;
}

/**
 * Satıcının yazdığı dil (sourceLang) + tek ad/hikaye → dört dilde name/story (mücevher vitrin üslubu).
 */
export async function buildProductTranslationsFromSource(
  sourceLang: ContentSourceLocale,
  name: string,
  story: string,
): Promise<ProductTranslationsQuad | null> {
  const nameTrim = name.trim();
  if (!nameTrim) {
    return null;
  }

  try {
    const apiKey = getAnthropicApiKey();
    const client = new Anthropic({ apiKey });
    const storyTrim = story.trim();
    const srcLabel = SOURCE_LABEL[sourceLang];

    const message = await client.messages.create({
      model: ANTHROPIC_TRANSLATE_MODEL,
      max_tokens: 6000,
      messages: [
        {
          role: "user",
          content: `You localize a jewelry / 3D product listing for a global marketplace.

The product TITLE and STORY below were written by the seller in ${srcLabel} (${sourceLang}).

Produce ONE JSON object with exactly these top-level keys: "tr", "en", "de", "ru".
Each value MUST be an object: {"name":"...","story":"..."}
- "name": localized product title for that language (concise, elegant).
- "story": localized product story for that language (poetic jewelry commerce tone). If the seller story is empty, use "" for every language's story.

Rules:
- Preserve meaning; adapt naturally for each locale.
- For the seller's source language (${sourceLang}), stay closest to the original wording while polishing.
- Escape double quotes inside strings as \\".
- Return ONLY valid minified JSON, no markdown fences, no commentary.

TITLE:
${nameTrim}

STORY:
${storyTrim || "(empty)"}`,
        },
      ],
    });

    const raw = message.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    return parseProductTranslationsQuad(raw);
  } catch (e) {
    console.error("[buildProductTranslationsFromSource]", e);
    return null;
  }
}

/** @deprecated Eski Türkçe-kaynak akışı; yeni kod buildProductTranslationsFromSource('tr', ...) kullanır. */
export async function buildProductTranslations(nameTr: string, storyTr: string): Promise<ProductTranslationsQuad | null> {
  return buildProductTranslationsFromSource("tr", nameTr, storyTr);
}

export function productTranslationsToDbPatch(quad: ProductTranslationsQuad, contentSourceLocale: ContentSourceLocale) {
  return {
    translations: quad as unknown as Record<string, unknown>,
    content_source_locale: contentSourceLocale,
    name_en: quad.en.name,
    name_de: quad.de.name,
    name_ru: quad.ru.name,
    story_en: quad.en.story,
    story_de: quad.de.story,
    story_ru: quad.ru.story,
  };
}

export function productTranslationsNeedsFill(translations: unknown): boolean {
  if (translations == null || typeof translations !== "object") {
    return true;
  }
  const o = translations as Record<string, { name?: string; story?: string }>;
  for (const lang of PRODUCT_LOCALES) {
    const n = o[lang]?.name?.trim();
    if (!n) return true;
  }
  return false;
}

export function normalizeContentSourceLocale(raw: string | null | undefined): ContentSourceLocale {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "en" || v === "de" || v === "ru" || v === "tr") return v;
  return "tr";
}

function legacyStoryForLocale(loc: ContentSourceLocale, legacy: {
  story: string;
  story_en: string | null;
  story_de: string | null;
  story_ru: string | null;
}): string {
  if (loc === "en") return legacy.story_en?.trim() || legacy.story;
  if (loc === "de") return legacy.story_de?.trim() || legacy.story;
  if (loc === "ru") return legacy.story_ru?.trim() || legacy.story;
  return legacy.story;
}

/** Ziyaretçi diline göre başlık/hikaye: önce translations[locale], yoksa legacy kolonlar + name/story. */
export function pickLocalizedProductText(
  locale: string,
  translations: unknown,
  legacy: {
    name: string;
    story: string;
    name_en: string | null;
    name_de: string | null;
    name_ru: string | null;
    story_en: string | null;
    story_de: string | null;
    story_ru: string | null;
  },
): { name: string; story: string } {
  const loc = normalizeContentSourceLocale(locale);
  const o =
    translations != null && typeof translations === "object"
      ? (translations as Record<string, { name?: string; story?: string }>)
      : null;
  const block = o?.[loc];
  const nameFromT = block?.name?.trim();
  if (nameFromT) {
    const storyFromBlock = block?.story?.trim() ?? "";
    if (storyFromBlock) {
      return { name: nameFromT, story: storyFromBlock };
    }
    return { name: nameFromT, story: legacyStoryForLocale(loc, legacy) };
  }
  const name =
    loc === "en"
      ? legacy.name_en?.trim() || legacy.name
      : loc === "de"
        ? legacy.name_de?.trim() || legacy.name
        : loc === "ru"
          ? legacy.name_ru?.trim() || legacy.name
          : legacy.name;
  const story = legacyStoryForLocale(loc, legacy);
  return { name, story };
}
