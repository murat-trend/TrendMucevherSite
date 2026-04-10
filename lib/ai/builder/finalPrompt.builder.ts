import type { BuiltPrompt, JewelryIntent } from "../types/prompt.types";
import { JEWELRY_CONSTITUTION } from "../constitution/jewelry.constitution";

function joinParts(parts: string[]): string {
  return parts.filter((p) => p.trim().length > 0).join(", ");
}

const PRODUCT_TR_MAP: Record<JewelryIntent["productType"], string> = {
  pendant: "lüks kolye ucu",
  ring: "lüks yüzük",
  earring: "lüks küpe",
  bracelet: "lüks bileklik",
  medallion: "lüks madalyon",
  unknown: "lüks takı parçası",
};

export class FinalPromptBuilder {
  build(intent: JewelryIntent, mode3DExport: boolean = false): BuiltPrompt {
    const finalPromptEn = this.buildEn(intent, mode3DExport);
    const finalPromptTr = this.buildTr(intent);
    const negativePrompt = mode3DExport
      ? joinParts([...JEWELRY_CONSTITUTION.mode3DExport.negativeConstraints])
      : joinParts(intent.negativeConstraints);
    const imagePromptEn = this.buildImagePromptEn(intent, mode3DExport);

    return {
      finalPromptEn,
      finalPromptTr,
      negativePrompt,
      imagePromptEn,
    };
  }

  /**
   * Görsel API (gpt-image) için kısa, konu-odaklı prompt.
   * OpenAI: subject first → composition → lighting → quality.
   */
  private buildImagePromptEn(intent: JewelryIntent, mode3DExport: boolean = false): string {
    const productStr =
      intent.productType === "unknown" ? "jewelry piece" : intent.productType;
    const styleStr = intent.style.slice(0, 2).join(" ");
    const motifStr = intent.motifs.slice(0, 2).join(", ");
    const shapeStr = intent.shapeHints?.slice(0, 2).join(", ") ?? "";
    const materialStr =
      intent.materialHints.length > 0 ? intent.materialHints[0] : "premium metal";

    const subjectParts: string[] = [];
    if (styleStr) subjectParts.push(styleStr);
    if (shapeStr) subjectParts.push(`${shapeStr}`);
    if (motifStr) subjectParts.push(motifStr);
    subjectParts.push(productStr);

    const subject = subjectParts.join(" ");
    const quality = mode3DExport
      ? JEWELRY_CONSTITUTION.mode3DExport.imageQualitySuffix
      : JEWELRY_CONSTITUTION.imageQualitySuffix;
    const wantsFrontView = intent.compositionHints.some(
      (h) => h.toLowerCase().includes("front") || h === "front view"
    );
    const composition = wantsFrontView ? "centered, front view" : "centered composition";
    const dramaticLighting = intent.lightingHints.find((h) =>
      /high contrast|chiaroscuro|dramatic/i.test(h)
    );
    const lightingStr = mode3DExport
      ? "directional studio lighting with crisp silhouette edges and readable relief separation"
      : dramaticLighting ?? (intent.lightingHints[0] || "high-contrast directional studio lighting, hard edge definition");
    const bgHint = mode3DExport ? " Plain white or light gray background, no strong reflections." : "";
    const bgFromIntent =
      !mode3DExport && intent.backgroundHints.length > 0
        ? ` Background: ${intent.backgroundHints[0]}`
        : "";
    return `Professional product photograph of a ${subject} in ${materialStr}. Single jewelry piece as main subject, ${composition}. ${lightingStr}, ${quality}. No blur, no watermark, no distortion.${bgHint}${bgFromIntent}`;
  }

  private buildEn(intent: JewelryIntent, mode3DExport: boolean = false): string {
    const productStr =
      intent.productType === "unknown" ? "jewelry piece" : intent.productType;
    const subjectParts = [
      intent.style.length > 0 ? intent.style.join(", ") : "",
      intent.shapeHints?.length ? intent.shapeHints.join(", ") : "",
      intent.motifs.length > 0 ? intent.motifs.join(", ") : "",
      productStr,
    ];
    const subject = joinParts(subjectParts);

    const restParts = [
      ...intent.materialHints,
      ...intent.mustHaveElements,
      ...intent.qualityConstraints,
      ...intent.compositionHints,
      ...intent.cameraHints,
      ...intent.lightingHints,
      ...intent.backgroundHints,
    ];

    let out = joinParts([subject, ...restParts]);
    if (!mode3DExport && intent.rawNarrative?.trim()) {
      out = `${out}, Composition scene: ${intent.rawNarrative.trim()}`;
    }
    return out;
  }

  private buildTr(intent: JewelryIntent): string {
    const productStr = this.translateProduct(intent);
    const subject =
      intent.motifs.length > 0
        ? `${intent.motifs.join(", ")} motifli ${productStr}`
        : productStr;

    const restParts = [
      ...intent.materialHints,
      ...intent.mustHaveElements,
      ...intent.qualityConstraints,
      ...intent.compositionHints,
      ...intent.cameraHints,
      ...intent.lightingHints,
      ...intent.backgroundHints,
    ];

    return joinParts([subject, ...restParts]);
  }

  private translateProduct(intent: JewelryIntent): string {
    return PRODUCT_TR_MAP[intent.productType];
  }
}
