import OpenAI from "openai";
import { STYLE_ANALYZER_SYSTEM_PROMPT, STYLE_ANALYZER_COLLECTION_PROMPT } from "./constants";

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

export function styleToPromptParts(style: StyleAnalysisResult | null | undefined): string[] {
  if (!style) return [];
  const parts: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  };
  add(style.metalType);
  add(style.surfaceTexture);
  add(style.craftsmanshipQuality);
  add(style.engravingCharacter);
  add(style.motifDensity);
  add(style.styleLanguage);
  add(style.gemstonePlacement);
  add(style.lightAtmosphere);
  add(style.ornamentLanguage);
  add(style.engravingDensity);
  add(style.motifComplexity);
  add(style.surfaceCarvingStyle);
  add(style.reliefDepth);
  add(style.colorPalette);
  add(style.cameraAngle);
  add(style.composition);
  add(style.backgroundType);
  add(style.lightingDirection);
  add(style.shadowStyle);
  if (Array.isArray(style.craftsmanshipTypes)) {
    style.craftsmanshipTypes.forEach(add);
  }
  return parts;
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
  return JSON.parse(content) as StyleAnalysisResult;
}

export type StyleImageInput = { base64: string; mimeType: string };

/**
 * Birden fazla referans görselinden koleksiyon stil analizi.
 * En fazla 4 görsel desteklenir.
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

  const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images.slice(0, 4).map(
    (img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "high" as const,
      },
    })
  );

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
  return JSON.parse(text) as StyleAnalysisResult;
}
