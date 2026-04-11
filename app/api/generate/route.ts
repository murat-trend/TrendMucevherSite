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
import { debitCredits } from "@/lib/billing/store";
import { requireRemauraUserAndCredits } from "@/lib/remaura/api-billing-guard";
import { getAdminSettings } from "@/lib/site/settings-store";
import {
  buildRingThreeQuarterBlock,
  RING_VIEW_SENTINEL,
  stripRingThreeQuarterRule,
} from "@/lib/remaura/internal-visual-rules";
import { buildPlatformFormatPromptClause } from "@/lib/remaura/platform-format-prompt";
import { REMAURA_VISUAL_SET_CLAUSE, REMAURA_VISUAL_SET_RING_ADDENDUM } from "@/lib/remaura/remaura-visual-dna";
import { MAX_STYLE_REFERENCE_SLOTS } from "@/components/remaura/remaura-types";
import { CAMERA_PANEL_MAIN_PROMPT_SUFFIX } from "@/lib/remaura/camera-prompt";
import {
  detectJewelryShotFromUserPrompt,
  promptTextContainsRingKeyword,
} from "@/lib/remaura/jewelry-shot-detection";
import { normalizePromptLocale } from "@/lib/i18n/prompt-locale";

loadEnvConfig(process.cwd());

const DEBUG_MODE = process.env.NODE_ENV !== "production";

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

    const body = await req.json();
    const guard = await requireRemauraUserAndCredits(body.userId as string | undefined, { minCredits: 5 });
    if (!guard.ok) return guard.response;
    userId = guard.userId;

    const client = new OpenAI({ apiKey });

    const rawPrompt = body.prompt as string | undefined;
    const revisedPrompt = body.revisedPrompt as string | undefined;
    const effectiveLocale = normalizePromptLocale(body.locale ?? body.revisedPromptLocale);
    const customNegative = body.negativePrompt as string | undefined;
    format = (body.format as string | undefined) ?? "";
    const optimizedResult = body.optimizedResult as OptimizedPromptResult | undefined;
    const styleAnalysis = body.styleAnalysis as StyleAnalysisResult | undefined;
    const styleImages = body.styleImages as Array<{ base64: string; mimeType?: string }> | undefined;
    const hasStyleRef = styleImages && styleImages.length > 0 && styleImages[0]?.base64;
    const exportMode3D = body.exportMode3D === true;
    const jewelryShot = detectJewelryShotFromUserPrompt(
      rawPrompt,
      revisedPrompt,
      optimizedResult?.optimizedPrompt
    );
    const useRingAngleRule = jewelryShot === "ring45";
    const useExplicitFront = jewelryShot === "frontCatalog";

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
    const suffixReferenceQualityCore = useRingAngleRule
      ? " 100mm macro lens, sharp focus on textures and relief, photorealistic metal reflections, 8k resolution."
      : " shot with 100mm macro lens, centered framing, entire jewelry fully visible with safe margin — no cropping at frame edges, sharp focus on intricate textures and relief, high-contrast studio lighting, photorealistic metal reflections, hard-surface precision, specular highlights on facets, deep shadows in recesses, 8k resolution.";
    /** Varsayılan: otomatik 3/4 ipucu (kamera paneli "genel" iken) */
    const suffixReferenceQuality =
      " 3/4 isometric perspective from a high-angle where appropriate for the piece," + suffixReferenceQualityCore;
    const stylePartsLimitMain = 20;
    const stylePartsLimitEdit = 24;

    if (revisedPrompt?.trim()) {
      const revised = await optimizePrompt(apiKey, revisedPrompt.trim(), undefined, effectiveLocale, exportMode3D);
      designWithStyle = revised.optimizedPrompt?.trim() || revisedPrompt.trim();
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis, { excludeCameraPose: useRingAngleRule });
      if (styleParts.length > 0) {
        designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
      }
    } else if (optimizedResult?.optimizedPrompt) {
      designWithStyle = optimizedResult.optimizedPrompt;
      negativePrompt = exportMode3D
        ? JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints.join(", ")
        : JEWELRY_CONSTITUTION.defaultNegativeConstraints.join(", ");
      const styleParts = styleToPromptParts(styleAnalysis, { excludeCameraPose: useRingAngleRule });
      if (styleParts.length > 0) {
        designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
      }
    } else {
      const { output } = await generatePromptPipeline(
        (rawPrompt ?? "").trim(),
        effectiveLocale,
        exportMode3D,
        apiKey
      );
      designWithStyle = output.imagePromptEn ?? output.finalPromptEn;
      negativePrompt = output.negativePrompt;
      if (styleAnalysis) {
        const styleParts = styleToPromptParts(styleAnalysis, { excludeCameraPose: useRingAngleRule });
        if (styleParts.length > 0) {
          designWithStyle = `${designWithStyle} Style: ${styleParts.slice(0, stylePartsLimitMain).join(", ")}.`;
        }
      }
    }

    if (useRingAngleRule) {
      designWithStyle = designWithStyle
        .replace(/\b(front view|frontal view|frontal|eye-level|eye level|bird'?s[- ]eye|top[- ]down|straight[- ]on|head[- ]on|direct front|perpendicular view)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    const photoSuffix = !hasFullTemplate(designWithStyle)
      ? exportMode3D
        ? suffix3D
        : useRingAngleRule || useExplicitFront
          ? suffixReferenceQualityCore
          : suffixReferenceQuality
      : "";
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

    const mentionsRing =
      promptTextContainsRingKeyword(mainPrompt) || promptTextContainsRingKeyword(rawPrompt ?? "");
    const wantsFrontKeywords = /\b(front view|frontal|karşıdan|karsidan|direct front)\b/i.test(mainPrompt);
    const wantsFrontView = wantsFrontKeywords && !mentionsRing;

    let ringCameraBlock = "";
    if (useRingAngleRule) {
      const rawBlock = buildRingThreeQuarterBlock((rawPrompt ?? "").trim());
      ringCameraBlock = stripRingThreeQuarterRule(rawBlock) === rawBlock
        ? rawBlock
        : rawBlock.slice(rawBlock.indexOf(RING_VIEW_SENTINEL) + RING_VIEW_SENTINEL.length).trim();
    }

    let fullPrompt = mainPrompt;

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
    if (useRingAngleRule) {
      fullPrompt += " Avoid: ring lying flat, frontal eye-level shot, top-down view.";
    }

    const formatKey = typeof format === "string" ? format.toLowerCase().trim() : "";

    if (!useRingAngleRule && useExplicitFront) {
      fullPrompt += CAMERA_PANEL_MAIN_PROMPT_SUFFIX.front;
    }

    const platformFormatClause = buildPlatformFormatPromptClause(formatKey);
    if (platformFormatClause) {
      fullPrompt += ` ${platformFormatClause}`;
    }

    if (!exportMode3D) {
      fullPrompt += ` ${REMAURA_VISUAL_SET_CLAUSE}`;
      if (useRingAngleRule) {
        fullPrompt += REMAURA_VISUAL_SET_RING_ADDENDUM;
      }
    }

    let promptForImageModel: string;
    if (ringCameraBlock) {
      const cameraReminder =
        "\n\nCAMERA REMINDER: Three-quarter view, camera at 2 o'clock elevated 45°, ring turned 30° right. Front face + side band both visible. Finger hole clearly open at bottom. Not frontal.";
      promptForImageModel = `${ringCameraBlock}\n\n${buildLabeledImagePrompt(designAfterExport, fullPrompt)}${cameraReminder}`;
    } else {
      promptForImageModel = buildLabeledImagePrompt(designAfterExport, fullPrompt);
    }

    const size: ValidSize = (formatKey && SIZE_MAP[formatKey]) || "1024x1024";

    if (DEBUG_MODE) {
      console.log("\n╔══════════════════════════════════════════════╗");
      console.log("║  REMAURA DEBUG — PROMPT → OpenAI             ║");
      console.log("╠══════════════════════════════════════════════╣");
      console.log("║ jewelryShot:", jewelryShot, "| size:", size);
      console.log("║ hasStyleRef:", !!hasStyleRef, "| exportMode3D:", exportMode3D);
      console.log("╠══════════════════════════════════════════════╣");
      console.log(hasStyleRef ? "║ MODE: images.edit (style ref)" : "║ MODE: images.generate");
      console.log("╚══════════════════════════════════════════════╝");
      console.log("\n--- promptForImageModel ---\n");
      console.log(promptForImageModel);
      console.log("\n--- END ---\n");
    }

    let imageBase64: string | undefined;

    if (hasStyleRef) {
      const styleRefs = styleImages!.filter((img) => img?.base64).slice(0, MAX_STYLE_REFERENCE_SLOTS);
      const styleParts = styleToPromptParts(styleAnalysis, { excludeCameraPose: useRingAngleRule });
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

      if (DEBUG_MODE) {
        console.log("\n--- editPrompt (style ref) ---\n");
        console.log(editPrompt);
        console.log("\n--- END editPrompt ---\n");
      }

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

    const debit = await debitCredits(userId, 5, "Mücevher tasarımı");
    if (!debit.ok) {
      return NextResponse.json(
        { error: "Yetersiz kredi", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
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

    const response: Record<string, unknown> = {
      image: `data:image/png;base64,${imageBase64}`,
      promptUsed: promptUsedForClient,
    };
    return NextResponse.json(response);
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
