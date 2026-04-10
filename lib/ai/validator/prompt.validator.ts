import type { JewelryIntent, ValidationResult } from "../types/prompt.types";

export class PromptValidator {
  validate(intent: JewelryIntent): ValidationResult {
    const warnings: string[] = [];
    const missingFields: string[] = [];

    if (intent.productType === "unknown") {
      missingFields.push("productType");
    }

    if (intent.motifs.length === 0) {
      warnings.push(
        intent.language === "tr"
          ? "Motif belirtilmedi — bir figür veya sembol eklerseniz daha özgün sonuç alırsınız."
          : "No motif specified — adding a figure or symbol will produce a more distinctive result."
      );
    }

    if (intent.qualityConstraints.length === 0) {
      missingFields.push("qualityConstraints");
    }

    if (intent.negativeConstraints.length === 0) {
      missingFields.push("negativeConstraints");
    }

    const motifSoftWarningCount = intent.motifs.length === 0 ? 1 : 0;
    const penalizedWarningCount = Math.max(
      0,
      warnings.length - motifSoftWarningCount
    );
    const baseScore = Math.max(
      0,
      100 - missingFields.length * 10 - penalizedWarningCount * 5
    );
    const score = Math.max(0, baseScore * intent.confidence);

    const isValid =
      missingFields.length <= 2 && !missingFields.includes("productType");

    return {
      isValid,
      score,
      warnings,
      missingFields,
    };
  }
}
