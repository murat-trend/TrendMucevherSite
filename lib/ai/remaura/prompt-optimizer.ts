import OpenAI from "openai";
import { OPTIMIZER_SYSTEM_PROMPT, OPTIMIZER_SYSTEM_PROMPT_3D_EXPORT } from "./constants";

export type OptimizedPromptResult = {
  jewelryType: string;
  metalMaterial: string;
  gemstoneLogic: string;
  designStructure: string;
  ornamentEngraving: string;
  craftsmanshipLanguage: string;
  lighting: string;
  luxuryQuality: string;
  optimizedPrompt: string;
  optimizedPromptTr?: string;
};

export async function optimizePrompt(
  apiKey: string,
  userPrompt: string,
  systemPrompt?: string,
  locale: string = "tr",
  mode3DExport: boolean = false
): Promise<OptimizedPromptResult> {
  const openai = new OpenAI({ apiKey });
  const prompt =
    systemPrompt ??
    (mode3DExport ? OPTIMIZER_SYSTEM_PROMPT_3D_EXPORT : OPTIMIZER_SYSTEM_PROMPT);
  const langHint = locale === "tr" ? "Kullanıcı Türkçe konuşuyor. optimizedPromptTr MUTLAKA Türkçe olmalı." : "User prefers English. optimizedPromptTr can be in English.";
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `${langHint}\n\nKullanıcı fikri: ${userPrompt}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  let parsed: OptimizedPromptResult;
  try {
    parsed = JSON.parse(content) as OptimizedPromptResult;
  } catch {
    throw new Error("Optimizer geçersiz JSON döndü. Lütfen tekrar deneyin.");
  }
  if (!parsed.optimizedPrompt?.trim()) {
    parsed.optimizedPrompt = userPrompt.trim();
  }
  const templateSuffix3D =
    ", plain white or light gray background, shot with 100mm macro lens, product centered with 15% margin, directional studio lighting with hard silhouette edges, crisp micro-contrast between relief planes, short defined shadows, clear geometric separation between elements, distinct relief layers with readable depth, crisp sharp edges, no fuzzy transitions, moderate detail density for 3D conversion, structured composition, tack sharp focus, 8k resolution, optimized for Meshy Image to 3D.";
  const templateSuffix =
    ", shot with 100mm macro lens, extreme close-up, sharp focus on intricate textures, high-contrast studio lighting, photorealistic metal reflections, caustic light patterns, deep shadows for depth, 8k resolution, cinematic composition.";
  const templateSuffixToUse = mode3DExport ? templateSuffix3D : templateSuffix;
  const hasFullTemplate =
    /Hyper-realistic jewelry photography/i.test(parsed.optimizedPrompt) &&
    /100mm macro lens/i.test(parsed.optimizedPrompt);
  if (!hasFullTemplate && parsed.optimizedPrompt.trim()) {
    const detail = parsed.optimizedPrompt.trim().replace(/\.+$/, "");
    parsed.optimizedPrompt = `Hyper-realistic jewelry photography, ${detail}${templateSuffixToUse}`;
  } else if (mode3DExport && parsed.optimizedPrompt.trim()) {
    parsed.optimizedPrompt = parsed.optimizedPrompt
      .replace(/black background/gi, "plain white background")
      .replace(/reflective surface/gi, "matte surface")
      .replace(/cinematic composition/gi, "optimized for 3D model conversion");
    if (!/plain white|light gray|hard silhouette|crisp sharp edges/i.test(parsed.optimizedPrompt)) {
      parsed.optimizedPrompt = parsed.optimizedPrompt.replace(
        /8k resolution[^.]*\.?/i,
        "8k resolution, plain white background, directional lighting with crisp silhouette edges, optimized for 3D conversion. "
      );
    }
  }
  return parsed;
}
