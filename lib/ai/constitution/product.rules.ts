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
    lightingHints: ["soft key light", "fill to reduce harsh shadows", "rim light for metal edges"],
    cameraHints: ["100mm macro", "shallow depth of field", "f/2.8–f/4"],
    backgroundHints: ["neutral gradient", "clean", "soft bokeh"],
    mustHaveElements: ["pendant in focus", "chain detail", "metal reflection"],
  },
  ring: {
    compositionHints: ["centered", "slight tilt for stone visibility", "finger or stand"],
    lightingHints: ["top-down key", "soft fill", "specular highlights on stone"],
    cameraHints: ["100mm macro", "close focus", "f/2.8"],
    backgroundHints: ["minimal", "neutral", "soft gradient"],
    mustHaveElements: ["ring in sharp focus", "stone facets visible", "metal band detail"],
  },
  earring: {
    compositionHints: ["pair or single", "centered", "symmetry consideration"],
    lightingHints: ["even diffused light", "soft shadows", "metal reflection"],
    cameraHints: ["100mm macro", "shallow depth of field", "f/3.5"],
    backgroundHints: ["clean neutral", "soft gradient", "no distraction"],
    mustHaveElements: ["earring in focus", "metal detail", "stone or gem clarity"],
  },
  bracelet: {
    compositionHints: ["curved or flat lay", "centered", "full piece visible"],
    lightingHints: ["soft wrap-around", "controlled reflections", "even exposure"],
    cameraHints: ["85–100mm", "moderate depth of field", "f/4"],
    backgroundHints: ["neutral surface", "clean", "soft bokeh"],
    mustHaveElements: ["bracelet fully visible", "clasp detail", "metal reflection"],
  },
  medallion: {
    compositionHints: ["centered", "face-up or slight angle", "chain visible"],
    lightingHints: ["soft key light", "fill to reduce shadows", "metal reflection"],
    cameraHints: ["100mm macro", "shallow depth of field", "f/2.8"],
    backgroundHints: ["neutral gradient", "clean", "luxury feel"],
    mustHaveElements: ["medallion in focus", "engraving or detail visible", "metal reflection"],
  },
  unknown: {
    compositionHints: ["centered", "balanced composition"],
    lightingHints: ["studio lighting", "soft shadows", "controlled reflections"],
    cameraHints: ["100mm macro", "shallow depth of field", "f/2.8–f/4"],
    backgroundHints: ["neutral", "clean", "minimal"],
    mustHaveElements: ["product in sharp focus", "metal detail", "professional presentation"],
  },
};
