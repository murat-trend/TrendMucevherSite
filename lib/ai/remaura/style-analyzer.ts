import OpenAI from "openai";
import { MAX_STYLE_REFERENCE_SLOTS } from "@/components/remaura/remaura-types";
import { STYLE_ANALYZER_SYSTEM_PROMPT, STYLE_ANALYZER_COLLECTION_PROMPT } from "./constants";

const emptyStyleAnalysis = (): StyleAnalysisResult => ({
  metalType: "",
  surfaceTexture: "",
  craftsmanshipQuality: "",
  engravingCharacter: "",
  motifDensity: "",
  styleLanguage: "",
  gemstonePlacement: "",
  lightAtmosphere: "",
  ornamentLanguage: "",
  engravingDensity: "",
  motifComplexity: "",
  surfaceCarvingStyle: "",
  reliefDepth: "",
  craftsmanshipTypes: [],
});

/** Model JSON’u eksik/yanlış anahtarlı döndürdüğünde çökmez; stil rehberi boş kalmaz. */
export function normalizeStyleAnalysisResult(raw: unknown): StyleAnalysisResult {
  const s = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const typesRaw = o.craftsmanshipTypes;
  const craftsmanshipTypes = Array.isArray(typesRaw)
    ? typesRaw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    : [];
  const opt = (x: unknown) => {
    const v = s(x);
    return v || undefined;
  };
  return {
    metalType: s(o.metalType),
    surfaceTexture: s(o.surfaceTexture),
    craftsmanshipQuality: s(o.craftsmanshipQuality),
    engravingCharacter: s(o.engravingCharacter),
    motifDensity: s(o.motifDensity),
    styleLanguage: s(o.styleLanguage),
    gemstonePlacement: s(o.gemstonePlacement),
    lightAtmosphere: s(o.lightAtmosphere),
    ornamentLanguage: s(o.ornamentLanguage),
    engravingDensity: s(o.engravingDensity),
    motifComplexity: s(o.motifComplexity),
    surfaceCarvingStyle: s(o.surfaceCarvingStyle),
    reliefDepth: s(o.reliefDepth),
    craftsmanshipTypes,
    colorPalette: opt(o.colorPalette),
    cameraAngle: opt(o.cameraAngle),
    composition: opt(o.composition),
    backgroundType: opt(o.backgroundType),
    lightingDirection: opt(o.lightingDirection),
    shadowStyle: opt(o.shadowStyle),
  };
}

function parseStyleJson(content: string): StyleAnalysisResult {
  try {
    const raw = JSON.parse(content) as unknown;
    return normalizeStyleAnalysisResult(raw);
  } catch {
    return emptyStyleAnalysis();
  }
}

export type StyleAnalysisResult = {
  metalType: string;
  surfaceTexture: string;
  craftsmanshipQuality: string;
  engravingCharacter: string;
  motifDensity: string;
  styleLanguage: string;
  gemstonePlacement: string;
  lightAtmosphere: string;
  ornamentLanguage: string;
  engravingDensity: string;
  motifComplexity: string;
  surfaceCarvingStyle: string;
  reliefDepth: string;
  craftsmanshipTypes: string[];
  colorPalette?: string;
  cameraAngle?: string;
  composition?: string;
  backgroundType?: string;
  lightingDirection?: string;
  shadowStyle?: string;
};

/**
 * Görsel uyumu için en yüksek sinyalli alanlar önce (slice ile kesilince kritikler korunur).
 */
const CAMERA_POSE_KEYS: ReadonlySet<keyof StyleAnalysisResult> = new Set([
  "cameraAngle",
  "composition",
]);

export function styleToPromptParts(
  style: StyleAnalysisResult | null | undefined,
  options?: { excludeCameraPose?: boolean },
): string[] {
  if (!style) return [];
  const skip = options?.excludeCameraPose ? CAMERA_POSE_KEYS : new Set<string>();
  const parts: string[] = [];
  const add = (key: keyof StyleAnalysisResult, v: unknown) => {
    if (skip.has(key)) return;
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  };
  add("metalType", style.metalType);
  add("surfaceTexture", style.surfaceTexture);
  add("colorPalette", style.colorPalette);
  add("lightAtmosphere", style.lightAtmosphere);
  add("lightingDirection", style.lightingDirection);
  add("shadowStyle", style.shadowStyle);
  add("backgroundType", style.backgroundType);
  add("cameraAngle", style.cameraAngle);
  add("composition", style.composition);
  add("craftsmanshipQuality", style.craftsmanshipQuality);
  add("styleLanguage", style.styleLanguage);
  add("gemstonePlacement", style.gemstonePlacement);
  add("engravingCharacter", style.engravingCharacter);
  add("motifDensity", style.motifDensity);
  add("ornamentLanguage", style.ornamentLanguage);
  add("engravingDensity", style.engravingDensity);
  add("motifComplexity", style.motifComplexity);
  add("surfaceCarvingStyle", style.surfaceCarvingStyle);
  add("reliefDepth", style.reliefDepth);
  if (Array.isArray(style.craftsmanshipTypes)) {
    style.craftsmanshipTypes.forEach((v) => add("craftsmanshipTypes", v));
  }
  return parts;
}

/** Üretimde stil referansı kullanmak için yeterli sinyal var mı (boş JSON sonrası). */
export function styleAnalysisIsUsable(s: StyleAnalysisResult | null | undefined): boolean {
  if (!s) return false;
  return styleToPromptParts(s).length >= 2;
}

export async function analyzeStyleReference(
  apiKey: string,
  imageBase64: string,
  mimeType: string = "image/jpeg",
  systemPrompt?: string
): Promise<StyleAnalysisResult> {
  const openai = new OpenAI({ apiKey });
  const prompt = systemPrompt ?? STYLE_ANALYZER_SYSTEM_PROMPT;
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1536,
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  return parseStyleJson(content);
}

export type StyleImageInput = { base64: string; mimeType: string };

/**
 * Birden fazla referans görselinden koleksiyon stil analizi.
 * Kullanılan görsel sayısı üst sınırı `MAX_STYLE_REFERENCE_SLOTS` ile aynıdır (`remaura-types`; UI ve `analyze-style` route ile paylaşılır).
 */
export async function analyzeStyleReferences(
  apiKey: string,
  images: StyleImageInput[],
  systemPrompt?: string
): Promise<StyleAnalysisResult> {
  if (images.length === 0) {
    throw new Error("En az bir görsel gerekli.");
  }
  if (images.length === 1) {
    return analyzeStyleReference(apiKey, images[0].base64, images[0].mimeType, systemPrompt);
  }

  const openai = new OpenAI({ apiKey });
  const prompt = systemPrompt ?? STYLE_ANALYZER_COLLECTION_PROMPT;

  const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images
    .slice(0, MAX_STYLE_REFERENCE_SLOTS)
    .map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "high" as const,
      },
    }));

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text" as const, text: "Bu referans görselleri bir koleksiyonun parçası. Ortak stilleri analiz edip JSON formatında döndür." },
    ...imageParts,
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1536,
  });

  const text = res.choices[0]?.message?.content ?? "{}";
  return parseStyleJson(text);
}
