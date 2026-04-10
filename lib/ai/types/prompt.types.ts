export type SupportedLanguage = "tr" | "en" | "de" | "ru";

export type ProductType =
  | "pendant"
  | "ring"
  | "earring"
  | "bracelet"
  | "medallion"
  | "unknown";

export type AudienceType = "male" | "female" | "unisex" | "unknown";

export type InputQuality = "high" | "medium" | "low";
export type InferenceLevel = "minimal" | "moderate" | "high";

export type RawUserPrompt = {
  rawPrompt: string;
  language?: SupportedLanguage;
};

export type JewelryIntent = {
  rawInput: string;
  /** Uzun, ilişki/aksiyon içeren tasarım metni — LLM ve Composition scene için */
  rawNarrative?: string;
  language: SupportedLanguage;

  inputQuality: InputQuality;
  needsInference: boolean;
  inferenceLevel: InferenceLevel;

  productType: ProductType;
  subType?: string | null;

  audience: AudienceType;

  theme: string[];
  motifs: string[];
  style: string[];
  mood: string[];

  materialHints: string[];
  gemstoneHints: string[];

  compositionHints: string[];
  /** Ham anlatıdan çıkarılan sahne ipuçları */
  narrativeHints?: string[];
  lightingHints: string[];
  cameraHints: string[];
  backgroundHints: string[];

  mustHaveElements: string[];
  shapeHints: string[];
  avoidElements: string[];

  qualityConstraints: string[];
  negativeConstraints: string[];

  inferredFields: string[];
  ambiguityFlags: string[];

  confidence: number;
};

export type ValidationResult = {
  isValid: boolean;
  score: number;
  warnings: string[];
  missingFields: string[];
};

export type BuiltPrompt = {
  finalPromptEn: string;
  finalPromptTr: string;
  negativePrompt: string;
  /** Görsel API için kısa, konu-odaklı prompt (gpt-image uyumlu) */
  imagePromptEn?: string;
};
