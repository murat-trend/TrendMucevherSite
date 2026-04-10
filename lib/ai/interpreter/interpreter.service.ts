import OpenAI from "openai";
import type {
  SupportedLanguage,
  ProductType,
  AudienceType,
  InputQuality,
  InferenceLevel,
  JewelryIntent,
} from "../types/prompt.types";
import { normalizeStyleTokens } from "../constitution/style.rules";
import { DEFAULT_MOOD, DEFAULT_AVOID_ELEMENTS } from "../constitution/defaults.rules";

const DEFAULT_MATERIAL_FALLBACK = ["premium metal"] as const;
const DEFAULT_BACKGROUND_START = ["clean neutral background"] as const;

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

const OXIDATION_FINISH_KEYWORDS = [
  "eskitilmiş",
  "oksitli",
  "okside",
  "aged",
  "antique",
  "oxidized",
  "patina",
] as const;

const OXIDATION_MATERIAL_HINTS = [
  "aged silver",
  "oxidized finish",
  "deep recessed oxidation",
] as const;

const OXIDATION_LIGHTING_HINTS = [
  "hard single-source directional key light",
  "deep cast shadows in engraved recesses",
  "bright crisp highlights on raised surfaces only",
] as const;

const OXIDATION_BACKGROUND_HINTS = [
  "deep black studio background",
  "dark dramatic backdrop",
] as const;

const OXIDATION_QUALITY_CONSTRAINTS = [
  "deep recessed shadows revealing relief layers",
  "high-relief sculptural depth",
] as const;

const OXIDATION_NEGATIVE_CONSTRAINTS = [
  "flat even lighting",
  "white or light background",
  "washed-out oxidation",
] as const;

function hasOxidationFinishIntent(input: string): boolean {
  const lower = input.toLowerCase();
  return OXIDATION_FINISH_KEYWORDS.some((kw) => lower.includes(kw));
}

function mergeUniqueHints(base: string[], extras: readonly string[]): string[] {
  const seen = new Set(base.map((s) => s.toLowerCase()));
  const out = [...base];
  for (const s of extras) {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

/** Rule engine: product default backgrounds must not dilute oxidation dramatic backdrop set. */
export function isOxidationStudioBackgroundOverride(hints: string[]): boolean {
  if (hints.length !== OXIDATION_BACKGROUND_HINTS.length) return false;
  const set = new Set(hints.map((x) => x.toLowerCase()));
  return OXIDATION_BACKGROUND_HINTS.every((h) => set.has(h.toLowerCase()));
}

const MOTIF_RELIGIOUS_CHRIST = "Christ figure with halo, classical religious relief";
const MOTIF_RELIGIOUS_VIRGIN_MARY = "Virgin Mary figure, classical religious relief";
const MOTIF_RELIGIOUS_ANGEL = "angel figure with wings, detailed feathers";
const MOTIF_RELIGIOUS_DEMON = "demon figure with horns and wings, dark mythology";
const MOTIF_RELIGIOUS_MICHAEL = "Archangel Michael with sword, triumphant pose";
const MOTIF_RELIGIOUS_GEORGE = "Saint George slaying dragon, classical relief";
const MOTIF_RELIGIOUS_CHRISTOPHER = "Saint Christopher carrying child, classical relief";
const MOTIF_RELIGIOUS_DUALITY =
  "angel and demon confrontation, duality theme, classical religious dramatic composition";

const RELIGIOUS_MOTIF_VALUES = new Set<string>([
  MOTIF_RELIGIOUS_CHRIST,
  MOTIF_RELIGIOUS_VIRGIN_MARY,
  MOTIF_RELIGIOUS_ANGEL,
  MOTIF_RELIGIOUS_DEMON,
  MOTIF_RELIGIOUS_MICHAEL,
  MOTIF_RELIGIOUS_GEORGE,
  MOTIF_RELIGIOUS_CHRISTOPHER,
  MOTIF_RELIGIOUS_DUALITY,
]);

const RELIGIOUS_QUALITY_BASE = [
  "classical religious iconographic composition",
  "Byzantine or Renaissance sculptural tradition",
  "high-relief narrative scene",
  "dramatic theological storytelling in metal",
] as const;

const RELIGIOUS_QUALITY_REVERENT = "reverent dignified figure portrayal";

const RELIGIOUS_NEGATIVE_CONSTRAINTS = [
  "offensive religious portrayal",
  "sexualized religious figures",
  "blasphemous interpretation",
] as const;

function augmentReligiousFigureConstraints(
  motifs: string[],
  qualityConstraints: string[],
  negativeConstraints: string[]
): { qualityConstraints: string[]; negativeConstraints: string[] } {
  const religiousHit = motifs.some((m) => RELIGIOUS_MOTIF_VALUES.has(m));
  if (!religiousHit) {
    return { qualityConstraints, negativeConstraints };
  }

  let q = mergeUniqueHints(qualityConstraints, RELIGIOUS_QUALITY_BASE);
  let n = mergeUniqueHints(negativeConstraints, RELIGIOUS_NEGATIVE_CONSTRAINTS);

  const hasChrist = motifs.includes(MOTIF_RELIGIOUS_CHRIST);
  const hasMary = motifs.includes(MOTIF_RELIGIOUS_VIRGIN_MARY);
  const hasAngel = motifs.includes(MOTIF_RELIGIOUS_ANGEL);
  const hasDemon = motifs.includes(MOTIF_RELIGIOUS_DEMON);
  const hasDuality = motifs.includes(MOTIF_RELIGIOUS_DUALITY);

  const omitReverent = hasDuality || (hasAngel && hasDemon);
  if ((hasChrist || hasMary) && !omitReverent) {
    q = mergeUniqueHints(q, [RELIGIOUS_QUALITY_REVERENT]);
  }

  return { qualityConstraints: q, negativeConstraints: n };
}

const MOTIF_MAP: Array<{ keywords: string[]; value: string }> = [
  { keywords: ["medusa", "medüsa"], value: "medusa head" },
  { keywords: ["aslan", "lion"], value: "lion head" },
  { keywords: ["kartal", "eagle"], value: "eagle" },
  { keywords: ["ejderha", "dragon"], value: "dragon" },
  { keywords: ["çiçek", "flower", "gül", "rose"], value: "floral motif" },
  { keywords: ["yaprak", "leaf", "dal"], value: "leaf motif" },
  { keywords: ["yılan", "snake", "serpent"], value: "serpent" },
  { keywords: ["haç", "cross"], value: "cross" },
  { keywords: ["isa", "jesus", "christ", "mesih"], value: MOTIF_RELIGIOUS_CHRIST },
  {
    keywords: ["meryem", "virgin mary", "madonna", "meryem ana"],
    value: MOTIF_RELIGIOUS_VIRGIN_MARY,
  },
  {
    keywords: ["aziz mihail", "saint michael", "archangel michael"],
    value: MOTIF_RELIGIOUS_MICHAEL,
  },
  {
    keywords: ["aziz georg", "saint george", "aziz yorgi"],
    value: MOTIF_RELIGIOUS_GEORGE,
  },
  {
    keywords: ["aziz kristof", "saint christopher"],
    value: MOTIF_RELIGIOUS_CHRISTOPHER,
  },
  {
    keywords: [
      "iyi kötü",
      "melek şeytan",
      "angel devil",
      "ışık karanlık",
      "light dark",
      "good evil",
    ],
    value: MOTIF_RELIGIOUS_DUALITY,
  },
  {
    keywords: ["melek", "angel", "archangel", "arcangel"],
    value: MOTIF_RELIGIOUS_ANGEL,
  },
  {
    keywords: ["şeytan", "devil", "iblis", "demon", "lucifer"],
    value: MOTIF_RELIGIOUS_DEMON,
  },
  { keywords: ["kurt", "wolf"], value: "wolf head" },
  { keywords: ["kedi", "cat"], value: "cat" },
  { keywords: ["kalp", "heart"], value: "heart" },
  { keywords: ["kartopu", "snowball"], value: "snowball" },
];

const GEMSTONE_MAP: Array<{ keywords: string[]; value: string }> = [
  { keywords: ["elmas", "diamond"], value: "diamond" },
  { keywords: ["yakut", "ruby"], value: "ruby" },
  { keywords: ["zümrüt", "emerald"], value: "emerald" },
  { keywords: ["safir", "sapphire"], value: "sapphire" },
  { keywords: ["inci", "pearl"], value: "pearl" },
  { keywords: ["garnet", "granat"], value: "garnet" },
  { keywords: ["turkuaz", "turquoise"], value: "turquoise" },
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

function escapeRegexKeyword(kw: string): string {
  return kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordMatch(text: string, kw: string): boolean {
  const escaped = escapeRegexKeyword(kw.toLowerCase());
  return new RegExp(
    `(?<![a-zA-ZğüşıöçĞÜŞİÖÇ])${escaped}(?![a-zA-ZğüşıöçĞÜŞİÖÇ])`,
    "i"
  ).test(text);
}

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
  const result: string[] = [];

  for (const { keywords, value } of MOTIF_MAP) {
    if (keywords.some((kw) => wordMatch(lower, kw))) {
      result.push(value);
    }
  }

  return [...new Set(result)];
}

function detectGemstoneHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];
  for (const { keywords, value } of GEMSTONE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
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

  return result.length > 0 ? result : [...DEFAULT_MATERIAL_FALLBACK];
}

function detectShapeHints(input: string): string[] {
  const lower = input.toLowerCase();
  const result: string[] = [];

  for (const { keywords, value } of SHAPE_MAP) {
    if (keywords.some((kw) => wordMatch(lower, kw))) {
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
    result.push("even studio lighting with crisp hard edges on metal, no fuzzy outlines");
  }

  return result;
}

function rawInputWordCount(rawInput: string): number {
  return rawInput.trim().split(/\s+/).filter(Boolean).length;
}

/** İlişki/aksiyon sinyali — rawNarrative için; önce çok kelimeli ifadeler */
const RAW_NARRATIVE_CUE_KEYWORDS = [
  "standing over",
  "karşı karşıya",
  "dolanmış",
  "sarılmış",
  "dişleyecek",
  "kavramış",
  "tutmuş",
  "üzerinde",
  "coiled",
  "facing",
  "wrapped",
  "holding",
  "fighting",
  "attacking",
  "bakan",
] as const;

function rawInputHasRawNarrativeCue(rawInput: string): boolean {
  const lower = rawInput.toLowerCase();
  return RAW_NARRATIVE_CUE_KEYWORDS.some((kw) => lower.includes(kw));
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
  parse(
    rawPrompt: string,
    language?: SupportedLanguage,
    mode3DExport?: boolean
  ): JewelryIntent {
    const trimmed = rawPrompt.trim();
    const detectedLang = detectLanguage(trimmed);
    const lang = language ?? detectedLang;

    const productType = detectProductType(trimmed);
    const audience = detectAudience(trimmed);
    const motifs = detectMotifs(trimmed);
    let materialHints = detectMaterialHints(trimmed);

    const oxidationIntent = hasOxidationFinishIntent(trimmed);
    /** 3D export (mode3DExport === true): oksitlenmiş ürün çekimi moduna girme */
    const oxidizedProductShot = oxidationIntent && mode3DExport !== true;
    let lightingHints = detectLightingHints(trimmed);
    let backgroundHints: string[] = [...DEFAULT_BACKGROUND_START];
    let qualityConstraints: string[] = [];
    let negativeConstraints: string[] = [];

    if (oxidizedProductShot) {
      materialHints = mergeUniqueHints(materialHints, OXIDATION_MATERIAL_HINTS);
      lightingHints = mergeUniqueHints(lightingHints, OXIDATION_LIGHTING_HINTS);
      backgroundHints = [...OXIDATION_BACKGROUND_HINTS];
      qualityConstraints = mergeUniqueHints(qualityConstraints, OXIDATION_QUALITY_CONSTRAINTS);
      negativeConstraints = mergeUniqueHints(negativeConstraints, OXIDATION_NEGATIVE_CONSTRAINTS);
    }

    const religiousAug = augmentReligiousFigureConstraints(
      motifs,
      qualityConstraints,
      negativeConstraints
    );
    qualityConstraints = religiousAug.qualityConstraints;
    negativeConstraints = religiousAug.negativeConstraints;

    const inputQuality = estimateInputQuality(trimmed, motifs, productType);
    const inferenceLevel = estimateInferenceLevel(productType, motifs, audience);
    const needsInference = inferenceLevel !== "minimal";

    const styleTokens = normalizeStyleTokens(trimmed);
    const theme: string[] = [];
    const style = [...styleTokens];

    const confidence =
      inputQuality === "high" ? 0.92 : inputQuality === "medium" ? 0.75 : 0.52;

    const ambiguityFlags: string[] = [];
    if (productType === "unknown") ambiguityFlags.push("missing_product_type");

    const wcParse = rawInputWordCount(trimmed);
    const rawNarrative =
      wcParse > 8 && rawInputHasRawNarrativeCue(trimmed) ? trimmed : undefined;

    return {
      rawInput: trimmed,
      ...(rawNarrative !== undefined ? { rawNarrative } : {}),
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
      gemstoneHints: detectGemstoneHints(trimmed),

      compositionHints: detectCompositionHints(trimmed),
      lightingHints,
      cameraHints: [],
      backgroundHints,

      mustHaveElements: [],
      shapeHints: detectShapeHints(trimmed),
      avoidElements: [...DEFAULT_AVOID_ELEMENTS],

      qualityConstraints,
      negativeConstraints,

      inferredFields: [],
      ambiguityFlags,

      confidence,
    };
  }
}

const NARRATIVE_ENRICH_SYSTEM_PROMPT = `Kuyumcu tasarım prompt analistisin.
Kullanıcının tasarım fikrindeki figürleri, motifleri ve kompozisyon ilişkilerini çıkar.
Sadece JSON döndür, başka metin ekleme.
Format:
{
  "motifs": ["figür1 açıklaması", "figür2 açıklaması"],
  "compositionHints": ["figürler arası ilişki"],
  "narrativeHints": ["sahne hikayesi tek cümle"]
}`;

type NarrativeEnrichLlmJson = {
  motifs?: unknown;
  compositionHints?: unknown;
  narrativeHints?: unknown;
};

function normalizeLlmStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
    }
  }
  return [...new Set(out)];
}

const NARRATIVE_ENRICH_TIMEOUT_MS = 5000;

function shouldEnrichIntentFromRawNarrative(
  intent: JewelryIntent,
  mode3DExport?: boolean
): boolean {
  if (mode3DExport === true) return false;
  if (!intent.rawNarrative?.trim()) return false;
  return intent.motifs.length === 0 || intent.compositionHints.length === 0;
}

/**
 * rule-engine sonrası: rawNarrative + eksik motif/kompozisyon varsa GPT ile doldurur.
 * Timeout / ağ / parse hatalarında intent aynı kalır.
 */
export async function enrichIntentFromRawNarrativeOpenAI(
  intent: JewelryIntent,
  apiKey: string,
  mode3DExport?: boolean
): Promise<JewelryIntent> {
  if (!shouldEnrichIntentFromRawNarrative(intent, mode3DExport)) {
    return intent;
  }
  const raw = intent.rawNarrative!.trim();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), NARRATIVE_ENRICH_TIMEOUT_MS);
  try {
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: NARRATIVE_ENRICH_SYSTEM_PROMPT },
          { role: "user", content: raw },
        ],
        response_format: { type: "json_object" },
        max_tokens: 512,
      },
      { signal: abortController.signal }
    );

    const content = res.choices[0]?.message?.content ?? "{}";
    let data: NarrativeEnrichLlmJson;
    try {
      data = JSON.parse(content) as NarrativeEnrichLlmJson;
    } catch {
      return intent;
    }

    const motifsFromLlm = normalizeLlmStringArray(data.motifs);
    const compositionFromLlm = normalizeLlmStringArray(data.compositionHints);
    const narrativeFromLlm = normalizeLlmStringArray(data.narrativeHints);

    let next: JewelryIntent = { ...intent };

    if (intent.motifs.length === 0 && motifsFromLlm.length > 0) {
      next = { ...next, motifs: motifsFromLlm };
    }
    if (intent.compositionHints.length === 0 && compositionFromLlm.length > 0) {
      next = { ...next, compositionHints: compositionFromLlm };
    }
    const noNarrativeHints =
      !intent.narrativeHints || intent.narrativeHints.length === 0;
    if (noNarrativeHints && narrativeFromLlm.length > 0) {
      next = { ...next, narrativeHints: narrativeFromLlm };
    }

    if (
      next.motifs !== intent.motifs ||
      next.compositionHints !== intent.compositionHints ||
      (noNarrativeHints && narrativeFromLlm.length > 0)
    ) {
      next.inputQuality = estimateInputQuality(next.rawInput, next.motifs, next.productType);
      next.inferenceLevel = estimateInferenceLevel(next.productType, next.motifs, next.audience);
      next.needsInference = next.inferenceLevel !== "minimal";
      next.confidence =
        next.inputQuality === "high" ? 0.92 : next.inputQuality === "medium" ? 0.75 : 0.52;
    }

    return next;
  } catch {
    return intent;
  } finally {
    clearTimeout(timeoutId);
  }
}
