import OpenAI from "openai";
import { JEWELRY_CONSTITUTION } from "../constitution/jewelry.constitution";
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
  const langHints: Record<string, string> = {
    tr: "Kullanıcı Türkçe konuşuyor. optimizedPromptTr MUTLAKA Türkçe olmalı.",
    en: "User prefers English. optimizedPromptTr should be written in English.",
    de: "Der Nutzer bevorzugt Deutsch. Das Feld optimizedPromptTr MUSS auf Deutsch formuliert sein.",
    ru: "Пользователь предпочитает русский язык. Поле optimizedPromptTr должно быть на русском.",
  };
  const langHint = langHints[locale] ?? langHints.tr;

  const templateSuffixToUse = mode3DExport
    ? ", " + JEWELRY_CONSTITUTION.mode3DExport.imageQualitySuffix
    : ", " + JEWELRY_CONSTITUTION.imageQualitySuffix;

  let res: OpenAI.Chat.Completions.ChatCompletion;
  try {
    res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `${langHint}\n\nKullanıcı fikri: ${userPrompt}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1536,
    });
  } catch (err) {
    console.error("[prompt-optimizer] OpenAI hatası:", err);
    return {
      jewelryType: "",
      metalMaterial: "",
      gemstoneLogic: "",
      designStructure: "",
      ornamentEngraving: "",
      craftsmanshipLanguage: "",
      lighting: "",
      luxuryQuality: "",
      optimizedPrompt: userPrompt.trim(),
      optimizedPromptTr: userPrompt.trim(),
    };
  }

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
