// AI CREATIVE STUDIO — üretim prompt'ları (sunucu tarafı).
// Sektör + platform + mod → pazarlama görseli / thumbnail reçetesi.
// Servis adları ve iç süreç UI'a asla sızmaz (ticari sır kuralı).

import type { GenerateRequest, IndustryKey, PlatformKey, VideoModeKey } from "./types";

const INDUSTRY_BRIEF: Record<IndustryKey, string> = {
  jewelry: "fine jewelry product, macro detail, polished metal and gemstones",
  fashion: "fashion apparel product, fabric texture visible, editorial styling",
  cosmetics: "cosmetics product, clean beauty aesthetic, soft glossy surfaces",
  electronics: "consumer electronics product, sleek industrial design, crisp edges",
  home: "home & living product, cozy interior context, natural materials",
  furniture: "furniture piece, room-scale staging, warm ambient light",
  food: "food & beverage product, appetizing presentation, fresh ingredients",
  digital: "digital product mockup on device screens, modern flat presentation",
};

const MODE_BRIEF: Record<VideoModeKey, string> = {
  basic: "clean neutral studio backdrop, single product hero shot",
  showcase: "professional studio lighting, seamless backdrop, product pedestal",
  luxury: "dramatic low-key lighting, dark premium backdrop, rich reflections",
  lifestyle: "real-life scene, natural light, product in authentic use context",
  "ai-motion": "creative cinematic scene, dynamic composition, artistic freedom",
};

const PLATFORM_RATIO: Record<PlatformKey, string> = {
  instagram: "4:5",
  facebook: "1:1",
  tiktok: "9:16",
  youtube: "16:9",
  etsy: "1:1",
  shopify: "1:1",
  woocommerce: "1:1",
  pinterest: "2:3",
  amazon: "1:1",
};

export function aspectRatioFor(platform: PlatformKey, type: GenerateRequest["type"]): string {
  if (type === "thumbnail" && platform === "youtube") return "16:9";
  return PLATFORM_RATIO[platform] ?? "1:1";
}

export function buildImagePrompt(req: GenerateRequest): string {
  const lines = [
    "Professional e-commerce marketing photograph.",
    `Subject: ${INDUSTRY_BRIEF[req.industry]}.`,
    `Scene: ${MODE_BRIEF[req.videoMode ?? "showcase"]}.`,
    req.productImage
      ? "CRITICAL: preserve the uploaded product EXACTLY — same shape, material, proportions and details. Only change environment, lighting and composition."
      : "",
    req.prompt.trim() ? `Client request: ${req.prompt.trim()}` : "",
    req.type === "thumbnail"
      ? "This is a cover/thumbnail: bold focal point, high contrast, instantly readable at small sizes, generous negative space for title text."
      : "Photorealistic, sharp focus on product, no text, no watermark, no logos.",
  ];
  return lines.filter(Boolean).join("\n");
}
