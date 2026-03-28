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
import { appendRemauraJob } from "@/lib/remaura/jobs-store";
import { getAdminSettings } from "@/lib/site/settings-store";
import { appendRingThreeQuarterRule } from "@/lib/remaura/internal-visual-rules";
import { buildPlatformFormatPromptClause } from "@/lib/remaura/platform-format-prompt";
import { REMAURA_VISUAL_SET_CLAUSE } from "@/lib/remaura/remaura-visual-dna";
import { MAX_STYLE_REFERENCE_SLOTS } from "@/components/remaura/remaura-types";

loadEnvConfig(process.cwd());

/** gpt-image-1.5 desteklenen boyutlar: 1024x1024, 1024x1536, 1536x1024, auto */
type ValidSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
/** Görsel modele giden metinde tasarım özeti ile teknik talimatları ayırır */
const IMAGE_PROMPT_HEADING_DESIGN = "## Tasarım isteği";
const IMAGE_PROMPT_HEADING_TECH = "## Görsel üretim ve teknik talimatları";

function buildLabeledImagePrompt(designAfterExport: string, fullPrompt: string): string {
  const d = designAfterExport.trim();
  const tech = fullPrompt.startsWith(designAfterExport)
    ? fullPrompt.slice(designAfterExport.length).trimStart()
    : fullPrompt.trim();
  return `${IMAGE_PROMPT_HEADING_DESIGN}\n${d}\n\n${IMAGE_PROMPT_HEADING_TECH}\n${tech}`;
}

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
  const startedAt = Date.now();
  let userId = "";
  let format = "";
  try {
    const settings = await getAdminSettings();
    if (!settings.features.generateEnabled) {
      return NextResponse.json(
        { error: "Gorsel uretimi gecici olarak kapali." },
        { status: 503 }
      );
    }
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış. .env.local dosyasında OPENAI_API_KEY=sk-... şeklinde tanımlayın." },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const body = await req.json();
    userId = (body.userId as string | undefined)?.trim() || "";
    const rawPrompt = body.prompt as string | undefined;
    const revisedPrompt = body.revisedPrompt as string | undefined;
    const promptLocale = (body.locale ?? body.revisedPromptLocale) as "tr" | "en" | undefined;
    const effectiveLocale = promptLocale === "en" ? "en" : "tr";
    const customNegative = body.negativePrompt as string | undefined;
    format = (body.format as string | undefined) ?? "";
    const optimizedResult = body.optimizedResult as OptimizedPromptResult | undefined;
    const styleAnalysis = body.styleAnalysis as StyleAnalysisResult | undefined;
    const styleImages = body.styleImages as Array<{ base64: string; mimeType?: string }> | undefined;
    const hasStyleRef = styleImages && styleImages.length > 0 && styleImages[0]?.base64;
    const exportMode3D = body.exportMode3D === true;
    const applyRingThreeQuarterView = body.applyRingThreeQuarterView === true;

    if (!rawPrompt?.trim() && !optimizedResult?.optimizedPrompt && !revisedPrompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt gerekli." },
        { status: 400 }
      );
    }

    let negativePrompt: string;
    let designWithStyle: string;

    const hasFullTemplate = (p: string) => /Hyper-realistic jewelry photography/i.test(p) && /100mm macro lens/i.test(p);
    const suffix3D =
      " 8K resolution, plain white or light gray background, directional studio lighting with hard silhouette edges, crisp micro-contrast between relief planes, short defined shadows, product centered with 15% margin, clear geometric separation between elements, distinct relief layers with readable depth, crisp sharp edges, no fuzzy transitions, moderate detail density for 3D conversion, structured composition, tack sharp focus.";
    /** Referans kalite (Medusa madalyon seviyesi) – tüm promptlar bu kalitede çıksın */
    const suffixReferenceQuality =
      " 3/4 isometric perspective from a high-angle where appropriate for the piece, shot with 100mm macro lens, centered framing, entire jewelry fully visible with safe margin — no cropping at frame edges, extreme close-up, sharp focus on intricate textures and relief, high-contrast studio lighting, photorealistic metal reflections, hard-surface precision, specular highlights on facets, deep shadows in recesses, 8k resolution, cinematic composition.";
    const stylePartsLimitMain = 20;
    const stylePartsLimitEdit = 24;

    if (revisedPrompt?.trim()) {
      const revised = await optimizePrompt(apiKey, revisedPrompt.trim(), undefined, effectiveLocale, exportMode3D);
      designWithStyle = revised.optimizedPrompt?.trim() || revisedPrompt.trim();
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis);
      if (styleParts.length > 0) {
        designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
      }
    } else if (optimizedResult?.optimizedPrompt) {
      designWithStyle = optimizedResult.optimizedPrompt;
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis);
      if (styleParts.length > 0) {
        designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
      }
    } else {
      const { output } = generatePromptPipeline((rawPrompt ?? "").trim(), effectiveLocale, exportMode3D);
      designWithStyle = output.imagePromptEn ?? output.finalPromptEn;
      negativePrompt = output.negativePrompt;
      if (styleAnalysis) {
        const styleParts = styleToPromptParts(styleAnalysis);
        if (styleParts.length > 0) {
          designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
        }
      }
    }

    const photoSuffix = !hasFullTemplate(designWithStyle) ? (exportMode3D ? suffix3D : suffixReferenceQuality) : "";
    const designAfterExport = exportMode3D
      ? designWithStyle
          .replace(/black background/gi, "plain white background")
          .replace(/reflective surface/gi, "matte surface")
      : designWithStyle;

    let mainPrompt = designWithStyle + photoSuffix;
    if (exportMode3D) {
      mainPrompt = mainPrompt
        .replace(/black background/gi, "plain white background")
        .replace(/reflective surface/gi, "matte surface");
    }

    let fullPrompt = mainPrompt;
    const mentionsRing =
      /\b(yüzük|yuzuk)\b/i.test(mainPrompt) ||
      /\bring\b/i.test(mainPrompt) ||
      /\b(wedding band|eternity ring|signet)\b/i.test(mainPrompt);
    const wantsFrontKeywords = /\b(front view|frontal|karşıdan|karsidan|direct front)\b/i.test(mainPrompt);
    const wantsFrontView = wantsFrontKeywords && !mentionsRing;
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

    if (applyRingThreeQuarterView) {
      fullPrompt = appendRingThreeQuarterRule(fullPrompt, (rawPrompt ?? "").trim());
      fullPrompt +=
        " Avoid: ring lying flat on the surface, shank parallel to the floor, flat-lay jewelry on table, ring asleep on the ground plane.";
    }

    const platformFormatClause = buildPlatformFormatPromptClause(formatKey);
    if (platformFormatClause) {
      fullPrompt += ` ${platformFormatClause}`;
    }

    if (!exportMode3D) {
      fullPrompt += ` ${REMAURA_VISUAL_SET_CLAUSE}`;
    }

    const promptForImageModel = buildLabeledImagePrompt(designAfterExport, fullPrompt);

    const size: ValidSize = (formatKey && SIZE_MAP[formatKey]) || "1024x1024";

    let imageBase64: string | undefined;

    if (hasStyleRef) {
      const styleRefs = styleImages!.filter((img) => img?.base64).slice(0, MAX_STYLE_REFERENCE_SLOTS);
      const styleParts = styleToPromptParts(styleAnalysis);
      const styleGuide = styleParts.length > 0
        ? ` Maintain this exact style (verbatim cues from style analysis): ${styleParts.slice(0, stylePartsLimitEdit).join(", ")}.`
        : "";
      const outputHint = exportMode3D
        ? " Output: plain white background, directional lighting with hard silhouette edges, crisp relief separation, clear geometric separation between elements, distinct relief layers, moderate detail density, structured composition for Meshy 3D conversion. Keep metal texture, relief, and ornament vocabulary from the reference(s); no fuzzy or indistinct outlines."
        : " Output: photorealistic jewelry photography. Keep the reference collection's metal family, surface finish, motif/engraving language, and gemstone look — but apply the prompt's high-contrast macro lighting: strong tonal separation, caustic speculars, and deep readable shadows so edges and relief read clearly for downstream image-to-3D / mesh reconstruction.";
      const multiRefNote =
        styleRefs.length > 1
          ? `You are given ${styleRefs.length} reference images from the same style window; treat them as one collection — match their shared metal finish, motif language, and ornament vocabulary.\n\n`
          : "";
      const styleLockPreamble =
        "STYLE LOCK: Transfer the reference collection's metal hue, finish, micro-texture, engraving/relief character, and gemstone treatment to a NEW piece. Do not flatten contrast: preserve punchy studio separation, crisp edges, and depth cues required for mesh-friendly imagery — only the jewelry design (silhouette/layout) changes.\n\n";
      const editPrompt = `${styleLockPreamble}${multiRefNote}Use the EXACT same visual language from the reference image(s). Generate a NEW jewelry design (different piece, same style): ${promptForImageModel}.${styleGuide}${outputHint} Do not copy the silhouette or layout of the reference piece — invent a different design that could belong in the same collection.`;

      const files = await Promise.all(
        styleRefs.map(async (img, i) => {
          const base64Data = img.base64.replace(/^data:[^;]+;base64,/, "");
          const mimeType = img.mimeType || "image/png";
          const buffer = Buffer.from(base64Data, "base64");
          return toFile(buffer, `style-reference-${i}.png`, { type: mimeType });
        })
      );

      const editResult = await client.images.edit({
        model: "gpt-image-1.5",
        image: files.length === 1 ? files[0]! : files,
        prompt: editPrompt,
        size: size === "auto" ? "1024x1024" : size,
        quality: "high",
        input_fidelity: "high",
      });
      imageBase64 = editResult.data?.[0]?.b64_json;
    } else {
      const result = await client.images.generate({
        model: "gpt-image-1.5",
        prompt: promptForImageModel,
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

    await appendRemauraJob({
      type: "generate",
      status: "ok",
      userId: userId || undefined,
      platform: format || undefined,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.2,
      message: "generate_ok",
    });

    /** İstemcide yalnızca kullanıcının yazdığı metin gösterilir; model promptu asla dönülmez */
    const promptUsedForClient =
      (rawPrompt ?? "").trim() || (revisedPrompt ?? "").trim() || "";

    return NextResponse.json({
      image: `data:image/png;base64,${imageBase64}`,
      promptUsed: promptUsedForClient,
    });
  } catch (error: unknown) {
    console.error("API ERROR:", error);
    const err = error as { status?: number; code?: string; message?: string; error?: { message?: string } };
    const errMsg = (err?.message ?? err?.error?.message ?? "") as string;
    await appendRemauraJob({
      type: "generate",
      status: "error",
      userId: userId || undefined,
      platform: format || undefined,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0.2,
      message: errMsg || "generate_error",
    });
    if (err?.status === 401 || err?.code === "invalid_api_key") {
      return NextResponse.json(
        {
          error:
            "API anahtarı geçersiz. https://platform.openai.com/api-keys adresinden yeni anahtar oluşturun. .env.local dosyasında OPENAI_API_KEY=sk-proj-xxx formatında (tırnak yok, boşluk yok) kaydedin.",
        },
        { status: 401 }
      );
    }
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
