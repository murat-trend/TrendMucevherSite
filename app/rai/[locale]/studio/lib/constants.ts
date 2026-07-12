import type { RaiDict } from "../../../i18n";

export type RaiCategory = "jewelry" | "background" | "photoEdit" | "mesh3d";
export type RaiFormat = "insta-post" | "story-reels" | "youtube-web" | "portrait";

export type StudioLabelKey = keyof RaiDict["studio"];

export type RaiTool = {
  key: RaiCategory;
  labelKey: Extract<StudioLabelKey, "categoryJewelry" | "categoryBg" | "categoryPhoto" | "category3d">;
  icon: "diamond" | "eraser" | "imagePlus" | "box";
};

export type RaiFormatMeta = {
  // null → marka adı değil, çevrilebilir etiket (dict.studio.formatPortrait)
  label: string | null;
  icon: "monitor" | "smartphone" | "youtube" | "maximize";
  dims: string;
};

export const ALL_TOOLS: RaiTool[] = [
  { key: "jewelry", labelKey: "categoryJewelry", icon: "diamond" },
  { key: "background", labelKey: "categoryBg", icon: "eraser" },
  { key: "photoEdit", labelKey: "categoryPhoto", icon: "imagePlus" },
  { key: "mesh3d", labelKey: "category3d", icon: "box" },
];

export const FORMAT_META: Record<RaiFormat, RaiFormatMeta> = {
  "insta-post": { label: "Instagram", icon: "monitor", dims: "1080 x 1080" },
  "story-reels": { label: "TikTok / Reels", icon: "smartphone", dims: "1080 x 1920" },
  "youtube-web": { label: "YouTube", icon: "youtube", dims: "1920 x 1080" },
  portrait: { label: null, icon: "maximize", dims: "1080 x 1350" },
};
