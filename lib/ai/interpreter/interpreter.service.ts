import type {
  SupportedLanguage,
  ProductType,
  AudienceType,
  InputQuality,
  InferenceLevel,
  JewelryIntent,
} from "../types/prompt.types";
import { normalizeStyleTokens } from "../constitution/style.rules";
import {
  DEFAULT_MATERIAL_HINTS,
  DEFAULT_BACKGROUND_HINTS,
  DEFAULT_MOOD,
  DEFAULT_AVOID_ELEMENTS,
} from "../constitution/defaults.rules";

const TURKISH_PRODUCT_KEYWORDS = [
  "kolye",
  "yüzük",
  "küpe",
  "bileklik",
  "madalyon",
  "altın",
  "gümüş",
  "eskitilmiş",
];

const MOTIF_MAP: Array<{ keywords: string[]; value: string }> = [
  { keywords: ["kurt", "wolf"], value: "wolf head" },
  { keywords: ["kedi", "cat"], value: "cat" },
  { keywords: ["kalp", "heart"], value: "heart" },
  { keywords: ["melek", "angel"], value: "angel" },
  { keywords: ["şeytan", "devil"], value: "devil" },
  { keywords: ["kartopu", "snowball"], value: "snowball" },
];

/** Takı parçasının kendisinin formu/şekli (kalp formu = heart-shaped pendant) */
const SHAPE_MAP: Array<{ keywords: string[]; value: string }> = [
  { keywords: ["kalp formu", "kalp şekli", "heart-shaped", "heart shape"], value: "heart-shaped" },
  { keywords: ["oval", "oval form"], value: "oval" },
  { keywords: ["yuvarlak", "daire", "round", "circular"], value: "round" },
  { keywords: ["damla", "damla form", "teardrop", "gözyaşı"], value: "teardrop" },
  { keywords: ["kare", "square"], value: "square" },
  { keywords: ["dikdörtgen", "rectangular"], value: "rectangular" },
  { keywords: ["yıldız", "star", "yıldız formu"], value: "star-shaped" },
  { keywords: ["hilal", "crescent", "ay"], value: "crescent" },
  { keywords: ["üçgen", "triangle", "üçgen form"], value: "triangular" },
];

function detectLanguage(input: string): SupportedLanguage {
  const lower = input.toLowerCase();
  const hasTurkish = TURKISH_PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
  return hasTurkish ? "tr" : "en";
}

function detectProductType(input: string): ProductType {
  const lower = input.toLowerCase();
  if (lower.includes("kolye ucu") || lower.includes("kolye")) return "pendant";
  if (lower.includes("yüzük") || lower.includes("ring")) return "ring";
  if (lower.includes("küpe") || lower.includes("earring")) return "earring";
  if (lower.includes("bileklik") || lower.includes("bracelet")) return "bracelet";
  if (lower.includes("madalyon") || lower.includes("medallion")) return "medallion";
  return "unknown";
}

function detectAudience(input: string): AudienceType {
  const lower = input.toLowerCase();
  if (lower.includes("erkek") || lower.includes("male")) return "male";
  if (lower.includes("kadın") || lower.includes("female")) return "female";
  if (lower.includes("unisex")) return "unisex";
  return "unknown";
}

function detectMotifs(input: string): string[] {
  const lower = input.toLowerCase();
  const words = lower.split(/\s+/);
  const result: string[] = [];

  for (const { keywords, value } of MOTIF_MAP) {
    if (keywords.some((kw) => words.includes(kw) || lower.includes(kw))) {
      result.push(value);
    }
  }

  return [...new Set(result)];
}

function detectMaterialHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];

  if (lower.includes("rose gold")) result.push("rose gold");
  if (lower.includes("altın") || lower.includes("gold")) result.push("gold");
  if (lower.includes("gümüş") || lower.includes("silver")) result.push("silver");
  if (lower.includes("eskitilmiş")) result.push("aged silver");

  return result.length > 0 ? result : [...DEFAULT_MATERIAL_HINTS];
}

function detectShapeHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];

  for (const { keywords, value } of SHAPE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      result.push(value);
    }
  }

  return [...new Set(result)];
}

function detectCompositionHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];

  if (
    lower.includes("karşıdan") ||
    lower.includes("frontal") ||
    lower.includes("front view") ||
    lower.includes("düz karşıdan") ||
    lower.includes("tam karşıdan")
  ) {
    result.push("front view");
  }
  if (
    lower.includes("açılı") ||
    lower.includes("3/4") ||
    lower.includes("three quarter") ||
    lower.includes("slight angle")
  ) {
    result.push("slight angle for depth");
  }

  return result;
}

function detectLightingHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];

  if (
    lower.includes("yüksek kontrast") ||
    lower.includes("kontrastlı") ||
    lower.includes("high contrast") ||
    lower.includes("dramatic chiaroscuro") ||
    lower.includes("dramatik") ||
    lower.includes("chiaroscuro")
  ) {
    result.push("high contrast lighting");
  }
  if (lower.includes("yumuşak") || lower.includes("soft") || lower.includes("diffused")) {
    result.push("soft studio lighting");
  }

  return result;
}

function estimateInputQuality(
  input: string,
  motifs: string[],
  productType: ProductType
): InputQuality {
  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const productKnown = productType !== "unknown";

  if (productKnown && motifs.length > 0 && wordCount >= 3) return "high";
  if (productKnown && wordCount >= 2) return "medium";
  return "low";
}

function estimateInferenceLevel(
  productType: ProductType,
  motifs: string[],
  audience: AudienceType
): InferenceLevel {
  let missing = 0;
  if (productType === "unknown") missing++;
  if (motifs.length === 0) missing++;
  if (audience === "unknown") missing++;

  if (missing >= 2) return "high";
  if (missing === 1) return "moderate";
  return "minimal";
}

export class InterpreterService {
  parse(rawPrompt: string, language?: SupportedLanguage): JewelryIntent {
    const trimmed = rawPrompt.trim();
    const detectedLang = detectLanguage(trimmed);
    const lang = language ?? detectedLang;

    const productType = detectProductType(trimmed);
    const audience = detectAudience(trimmed);
    const motifs = detectMotifs(trimmed);
    const materialHints = detectMaterialHints(trimmed);

    const inputQuality = estimateInputQuality(trimmed, motifs, productType);
    const inferenceLevel = estimateInferenceLevel(productType, motifs, audience);
    const needsInference = inferenceLevel !== "minimal";

    const styleTokens = normalizeStyleTokens(trimmed);
    const theme = [...styleTokens];
    const style = [...styleTokens];

    const confidence =
      inputQuality === "high" ? 0.92 : inputQuality === "medium" ? 0.75 : 0.52;

    const ambiguityFlags: string[] = [];
    if (productType === "unknown") ambiguityFlags.push("missing_product_type");

    return {
      rawInput: trimmed,
      language: lang,

      inputQuality,
      needsInference,
      inferenceLevel,

      productType,
      subType: null,
      audience,

      theme,
      motifs,
      style,
      mood: [...DEFAULT_MOOD],

      materialHints,
      gemstoneHints: [],

      compositionHints: detectCompositionHints(trimmed),
      lightingHints: detectLightingHints(trimmed),
      cameraHints: [],
      backgroundHints: [...DEFAULT_BACKGROUND_HINTS],

      mustHaveElements: [],
      shapeHints: detectShapeHints(trimmed),
      avoidElements: [...DEFAULT_AVOID_ELEMENTS],

      qualityConstraints: [],
      negativeConstraints: [],

      inferredFields: [],
      ambiguityFlags,

      confidence,
    };
  }
}
