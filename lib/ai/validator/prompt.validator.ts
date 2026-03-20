import type { JewelryIntent, ValidationResult } from "../types/prompt.types";

export class PromptValidator {
  validate(intent: JewelryIntent): ValidationResult {
    const warnings: string[] = [];
    const missingFields: string[] = [];

    if (intent.productType === "unknown") {
      warnings.push("Product type could not be confidently detected.");
      missingFields.push("productType");
    }

    if (intent.motifs.length === 0) {
      warnings.push("No motif detected. Prompt may be too generic.");
      missingFields.push("motifs");
    }

    if (intent.cameraHints.length === 0) {
      warnings.push("Camera hints are missing.");
      missingFields.push("cameraHints");
    }

    if (intent.lightingHints.length === 0) {
      warnings.push("Lighting hints are missing.");
      missingFields.push("lightingHints");
    }

    if (intent.qualityConstraints.length === 0) {
      warnings.push("Quality constraints are missing.");
      missingFields.push("qualityConstraints");
    }

    if (intent.negativeConstraints.length === 0) {
      warnings.push("Negative constraints are missing.");
      missingFields.push("negativeConstraints");
    }

    const score = Math.max(
      0,
      100 - missingFields.length * 12 - warnings.length * 3
    );

    const isValid = missingFields.length <= 2;

    return {
      isValid,
      score,
      warnings,
      missingFields,
    };
  }
}
