export const PRODUCT_DEFAULTS: Record<
  "pendant" | "ring" | "earring" | "bracelet" | "medallion" | "unknown",
  {
    compositionHints: string[];
    lightingHints: string[];
    cameraHints: string[];
    backgroundHints: string[];
    mustHaveElements: string[];
  }
> = {
  pendant: {
    compositionHints: ["centered", "slight angle for depth", "chain visible"],
    lightingHints: ["directional key light", "hard edge rim light on metal", "high micro-contrast for relief"],
    cameraHints: ["100mm macro", "deep depth of field, entire piece tack sharp", "f/8–f/11"],
    backgroundHints: ["neutral flat or clean gradient", "no bokeh blur on product"],
    mustHaveElements: ["pendant in focus", "chain detail", "metal reflection"],
  },
  ring: {
    compositionHints: [
      "centered",
      "three-quarter isometric 45°, slightly elevated",
      "table, crown, gallery, outer band and inner shank readable in one frame",
    ],
    lightingHints: ["top-down key", "controlled fill preserving edge sharpness", "crisp speculars on facets"],
    cameraHints: [
      "100mm macro",
      "three-quarter isometric ~45°, camera above ring plane, slightly forward-off-axis",
      "f/8–f/11, full ring tack sharp, zero warping",
    ],
    backgroundHints: ["minimal", "neutral", "clean hard-edge backdrop"],
    mustHaveElements: [
      "ring in sharp focus",
      "stone facets visible",
      "metal band detail",
      "complete closed band with minimum 1.5mm wall thickness",
      "full shank visible — no open or broken band",
      "symmetrical left-right panel construction",
      "structurally supported stone setting with visible prongs or bezel",
      "manufacturable jewelry proportions",
    ],
  },
  earring: {
    compositionHints: ["pair or single", "centered", "symmetry consideration"],
    lightingHints: ["directional studio light", "hard shadow edges", "readable metal reflection"],
    cameraHints: ["100mm macro", "deep focus on jewelry", "f/8–f/11"],
    backgroundHints: ["clean neutral", "flat studio backdrop", "no distraction"],
    mustHaveElements: ["earring in focus", "metal detail", "stone or gem clarity"],
  },
  bracelet: {
    compositionHints: ["curved or flat lay", "centered", "full piece visible"],
    lightingHints: ["directional wrap light", "crisp silhouette", "controlled reflections"],
    cameraHints: ["85–100mm", "deep depth of field on bracelet", "f/8"],
    backgroundHints: ["neutral surface", "clean", "sharp backdrop"],
    mustHaveElements: ["bracelet fully visible", "clasp detail", "metal reflection"],
  },
  medallion: {
    compositionHints: ["centered", "face-up or slight angle", "chain visible"],
    lightingHints: ["directional key", "relief-carving shadows", "metal reflection with hard edges"],
    cameraHints: ["100mm macro", "full medallion tack sharp", "f/8–f/11"],
    backgroundHints: ["neutral gradient", "clean", "luxury feel"],
    mustHaveElements: ["medallion in focus", "engraving or detail visible", "metal reflection"],
  },
  unknown: {
    compositionHints: ["centered", "balanced composition"],
    lightingHints: ["high-contrast studio lighting", "hard edge shadows", "controlled reflections"],
    cameraHints: ["100mm macro", "deep depth of field", "f/8–f/11"],
    backgroundHints: ["neutral", "clean", "minimal"],
    mustHaveElements: ["product in sharp focus", "metal detail", "professional presentation"],
  },
};
