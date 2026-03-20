export type ChannelTab = "desc" | "tags" | "hash";

export type PlatformFormat =
  | "insta-post"
  | "story-reels"
  | "youtube-web"
  | "portrait"
  | "3d-export";

export const FORMAT_IDS: PlatformFormat[] = [
  "insta-post",
  "story-reels",
  "youtube-web",
  "portrait",
  "3d-export",
];

export const IMAGE_SIZE_MAP: Record<PlatformFormat, { w: number; h: number }> = {
  "insta-post": { w: 1024, h: 1024 },
  "story-reels": { w: 1024, h: 1536 },
  "youtube-web": { w: 1536, h: 1024 },
  portrait: { w: 1024, h: 1536 },
  "3d-export": { w: 1024, h: 1024 },
};

export const MAX_CHARS = 1000;
export const MAX_NEGATIVE_CHARS = 500;

export type MainBlockId = "image" | "bgRemover" | "apiCommand" | "depthMap" | "jewelry";

export const MAIN_CONTENT_BLOCK_ORDER: MainBlockId[] = [
  "image",
  "bgRemover",
  "apiCommand",
  "depthMap",
  "jewelry",
];
