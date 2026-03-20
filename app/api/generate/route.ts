import { loadEnvConfig } from "@next/env";
import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import { getOpenAIApiKey } from "@/lib/api/openai";
import { generatePromptPipeline } from "@/lib/ai/pipeline/generatePromptPipeline";
import { optimizePrompt } from "@/lib/ai/remaura/prompt-optimizer";
import { JEWELRY_CONSTITUTION } from "@/lib/ai/constitution/jewelry.constitution";
import { styleToPromptParts } from "@/lib/ai/remaura/style-analyzer";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import type { StyleAnalysisResult } from "@/lib/ai/remaura/style-analyzer";

loadEnvConfig(process.cwd());

/** gpt-image-1.5 desteklenen boyutlar: 1024x1024, 1024x1536, 1536x1024, auto */
type ValidSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
const SIZE_MAP: Record<string, ValidSize> = {
  "insta-post": "1024x1024",
  "story-reels": "1024x1536",
  "youtube-web": "1536x1024",
  "portrait": "1024x1536",
  "3d-export": "1024x1024",
  "instagram": "1024x1024",
  "insta": "1024x1024",
  "tiktok": "1024x1536",
  "reels": "1024x1536",
  "youtube": "1536x1024",
};

export async function POST(req: Request) {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış. .env.local dosyasında OPENAI_API_KEY=sk-... şeklinde tanımlayın." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await req.json();
    const rawPrompt = body.prompt as string | undefined;
    const revisedPrompt = body.revisedPrompt as string | undefined;
    const promptLocale = (body.locale ?? body.revisedPromptLocale) as "tr" | "en" | undefined;
    const effectiveLocale = promptLocale === "en" ? "en" : "tr";
    const customNegative = body.negativePrompt as string | undefined;
    const format = body.format as string | undefined;
    const optimizedResult = body.optimizedResult as OptimizedPromptResult | undefined;
    const styleAnalysis = body.styleAnalysis as StyleAnalysisResult | undefined;
    const styleImages = body.styleImages as Array<{ base64: string; mimeType?: string }> | undefined;
    const hasStyleRef = styleImages && styleImages.length > 0 && styleImages[0]?.base64;
    const exportMode3D = body.exportMode3D === true;

    if (!rawPrompt?.trim() && !optimizedResult?.optimizedPrompt && !revisedPrompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt gerekli." },
        { status: 400 }
      );
    }

    let mainPrompt: string;
    let negativePrompt: string;

    const hasFullTemplate = (p: string) => /Hyper-realistic jewelry photography/i.test(p) && /100mm macro lens/i.test(p);
    const suffix3D =
      " 8K resolution, plain white or light gray background, soft diffused studio lighting, minimal shadows, product centered with 15% margin, clear geometric separation between elements, distinct relief layers with readable depth, crisp sharp edges, moderate detail density for 3D conversion, structured composition, sharp focus.";
    /** Referans kalite (Medusa madalyon seviyesi) – tüm promptlar bu kalitede çıksın */
    const suffixReferenceQuality =
      " shot with 100mm macro lens, extreme close-up, sharp focus on intricate textures, high-contrast studio lighting, photorealistic metal reflections, caustic light patterns, deep shadows for depth, 8k resolution, cinematic composition.";

    if (revisedPrompt?.trim()) {
      const revised = await optimizePrompt(apiKey, revisedPrompt.trim(), undefined, effectiveLocale, exportMode3D);
      mainPrompt = revised.optimizedPrompt?.trim() || revisedPrompt.trim();
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis);
      if (styleParts.length > 0) {
        mainPrompt = `${mainPrompt} Style: ${styleParts.slice(0, 12).join(", ")}.`;
      }
      if (!hasFullTemplate(mainPrompt)) {
        mainPrompt += exportMode3D ? suffix3D : suffixReferenceQuality;
      }
    } else if (optimizedResult?.optimizedPrompt) {
      mainPrompt = optimizedResult.optimizedPrompt;
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis);
      if (styleParts.length > 0) {
        mainPrompt = `${mainPrompt} Style: ${styleParts.slice(0, 12).join(", ")}.`;
      }
      if (!hasFullTemplate(mainPrompt)) {
        mainPrompt += exportMode3D ? suffix3D : suffixReferenceQuality;
      }
    } else {
      const { output } = generatePromptPipeline((rawPrompt ?? "").trim(), effectiveLocale, exportMode3D);
      mainPrompt = output.imagePromptEn ?? output.finalPromptEn;
      negativePrompt = output.negativePrompt;
      if (styleAnalysis) {
        const styleParts = styleToPromptParts(styleAnalysis);
        if (styleParts.length > 0) {
          mainPrompt = `${mainPrompt} Style: ${styleParts.slice(0, 12).join(", ")}.`;
        }
      }
      if (!hasFullTemplate(mainPrompt)) {
        mainPrompt += exportMode3D ? suffix3D : suffixReferenceQuality;
      }
    }

    if (exportMode3D) {
      mainPrompt = mainPrompt
        .replace(/black background/gi, "plain white background")
        .replace(/reflective surface/gi, "matte surface")
        .replace(/dramatic directional lighting|high-contrast|chiaroscuro/gi, "soft diffused studio lighting")
        .replace(/,?\s*caustic light patterns,?/gi, "")
        .replace(/deep shadows/gi, "minimal shadows");
    }

    let fullPrompt = mainPrompt;
    const wantsFrontView = /\b(front view|frontal|karşıdan|direct front)\b/i.test(mainPrompt);
    if (wantsFrontView) {
      fullPrompt += ` CRITICAL: Strict frontal view — camera directly facing the jewelry, perpendicular, no perspective angle, flat-on product shot.`;
    }
    if (negativePrompt) {
      const negativeShort = negativePrompt.split(",").map((s) => s.trim()).slice(0, 8).join(", ");
      const extraNeg = wantsFrontView ? "angled view, 3/4 angle, perspective tilt, " : "";
      fullPrompt += ` Avoid: ${extraNeg}${negativeShort}.`;
    }
    if (customNegative?.trim()) {
      const extra = customNegative.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      if (extra.length > 0) {
        fullPrompt += ` No ${extra.join(", ")}.`;
      }
    }

    const formatKey = typeof format === "string" ? format.toLowerCase().trim() : "";
    const size: ValidSize = (formatKey && SIZE_MAP[formatKey]) || "1024x1024";

    let imageBase64: string | undefined;
    let promptUsed = fullPrompt;

    if (hasStyleRef) {
      const styleParts = styleToPromptParts(styleAnalysis);
      const styleGuide = styleParts.length > 0
        ? ` Maintain this exact style: ${styleParts.slice(0, 16).join(", ")}.`
        : "";
      const outputHint = exportMode3D
        ? " Output: plain white background, soft diffused lighting, minimal shadows, clear geometric separation between elements, distinct relief layers, moderate detail density, structured composition for Meshy 3D conversion."
        : " Output: photorealistic jewelry photography, same lighting, composition, background, and material appearance as the reference.";
      const editPrompt = `Use the EXACT same visual style from this reference image. Generate a NEW jewelry design (different piece, same style): ${fullPrompt}.${styleGuide}${outputHint} Do not copy the design—create a new design in the same style.`;
      promptUsed = editPrompt;
      const firstImg = styleImages![0];
      const base64Data = firstImg.base64.replace(/^data:[^;]+;base64,/, "");
      const mimeType = firstImg.mimeType || "image/png";
      const buffer = Buffer.from(base64Data, "base64");
      const file = await toFile(buffer, "style-reference.png", { type: mimeType });

      const editResult = await client.images.edit({
        model: "gpt-image-1.5",
        image: file,
        prompt: editPrompt,
        size: size === "auto" ? "1024x1024" : size,
        quality: "high",
        input_fidelity: "high",
      });
      imageBase64 = editResult.data?.[0]?.b64_json;
    } else {
      const result = await client.images.generate({
        model: "gpt-image-1.5",
        prompt: fullPrompt,
        size: size === "auto" ? "auto" : size,
        quality: "high",
      });
      imageBase64 = result.data?.[0]?.b64_json;
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Görsel üretilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: `data:image/png;base64,${imageBase64}`,
      promptUsed,
    });
  } catch (error: unknown) {
    console.error("API ERROR:", error);
    const err = error as { status?: number; code?: string; message?: string; error?: { message?: string } };
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        {
          error:
            "API anahtarı geçersiz. https://platform.openai.com/api-keys adresinden yeni anahtar oluşturun. .env.local dosyasında OPENAI_API_KEY=sk-proj-xxx formatında (tırnak yok, boşluk yok) kaydedin.",
        },
        { status: 401 }
      );
    }
    const errMsg = (err?.message ?? err?.error?.message ?? "") as string;
    const isSafetyRejection = err?.status === 400 || /safety|rejected|content_policy/i.test(errMsg);
    if (isSafetyRejection) {
      return NextResponse.json(
        {
          error:
            "İstek güvenlik filtresi tarafından reddedildi. Promptu sadeleştirmeyi veya farklı bir ifade denemeyi deneyin. Hata devam ederse help.openai.com ile iletişime geçin.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: typeof errMsg === "string" && errMsg ? errMsg : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
