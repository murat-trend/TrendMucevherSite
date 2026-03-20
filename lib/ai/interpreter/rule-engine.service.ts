import { JEWELRY_CONSTITUTION } from "../constitution/jewelry.constitution";
import { PRODUCT_DEFAULTS } from "../constitution/product.rules";
import type { JewelryIntent } from "../types/prompt.types";

function mergeUnique(base: string[], extra: string[]): string[] {
  const seen = new Set(base);
  const result = [...base];
  for (const item of extra) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

export class RuleEngineService {
  apply(intent: JewelryIntent): JewelryIntent {
    const productDefaults = PRODUCT_DEFAULTS[intent.productType];
    const inferredFields = [...intent.inferredFields];

    const compositionHints =
      intent.compositionHints.length === 0
        ? [...productDefaults.compositionHints]
        : mergeUnique(intent.compositionHints, productDefaults.compositionHints);
    if (intent.compositionHints.length === 0) {
      inferredFields.push("compositionHints");
    }

    const wantsDramaticLighting = intent.lightingHints.some(
      (h) => /high contrast|chiaroscuro|dramatic/i.test(h)
    );
    const lightingHints =
      intent.lightingHints.length === 0
        ? [...productDefaults.lightingHints]
        : wantsDramaticLighting
          ? intent.lightingHints
          : mergeUnique(intent.lightingHints, productDefaults.lightingHints);
    if (intent.lightingHints.length === 0) {
      inferredFields.push("lightingHints");
    }

    const cameraHints =
      intent.cameraHints.length === 0
        ? [...productDefaults.cameraHints]
        : mergeUnique(intent.cameraHints, productDefaults.cameraHints);
    if (intent.cameraHints.length === 0) {
      inferredFields.push("cameraHints");
    }

    const backgroundHints =
      intent.backgroundHints.length === 0
        ? [...productDefaults.backgroundHints]
        : mergeUnique(intent.backgroundHints, productDefaults.backgroundHints);
    if (intent.backgroundHints.length === 0) {
      inferredFields.push("backgroundHints");
    }

    const mustHaveElements =
      intent.mustHaveElements.length === 0
        ? [...productDefaults.mustHaveElements]
        : mergeUnique(intent.mustHaveElements, productDefaults.mustHaveElements);
    if (intent.mustHaveElements.length === 0) {
      inferredFields.push("mustHaveElements");
    }

    const qualityConstraints = mergeUnique(
      intent.qualityConstraints,
      [...JEWELRY_CONSTITUTION.defaultQualityConstraints]
    );

    const negativeConstraints = mergeUnique(
      intent.negativeConstraints,
      [...JEWELRY_CONSTITUTION.defaultNegativeConstraints]
    );

    return {
      ...intent,
      compositionHints,
      lightingHints,
      cameraHints,
      backgroundHints,
      mustHaveElements,
      qualityConstraints,
      negativeConstraints,
      inferredFields: [...new Set(inferredFields)],
    };
  }
}
