"use client";

import { createContext, useContext } from "react";
import type { ResponsiveLayouts } from "react-grid-layout";
import type { useLanguage } from "@/components/i18n/LanguageProvider";
import type { ChannelTab } from "@/components/remaura/remaura-types";
import type { PlatformFormat } from "@/components/remaura/remaura-types";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import type { StyleAnalysisResult } from "@/lib/ai/remaura/style-analyzer";
import type { JewelryAnalysisResult } from "@/lib/ai/remaura/jewelry-analyzer";
import type { RemauraPanelId, WorkspaceMode } from "@/lib/remaura/workspace/types";

export type RemauraAppContextValue = {
  t: ReturnType<typeof useLanguage>["t"];
  locale: ReturnType<typeof useLanguage>["locale"];
  prompt: string;
  setPrompt: (v: string) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  charCount: number;
  instaTab: ChannelTab;
  setInstaTab: (t: ChannelTab) => void;
  tiktokTab: ChannelTab;
  setTiktokTab: (t: ChannelTab) => void;
  threadsTab: ChannelTab;
  setThreadsTab: (t: ChannelTab) => void;
  facebookTab: ChannelTab;
  setFacebookTab: (t: ChannelTab) => void;
  linkedinTab: ChannelTab;
  setLinkedinTab: (t: ChannelTab) => void;
  pinterestTab: ChannelTab;
  setPinterestTab: (t: ChannelTab) => void;
  xTab: ChannelTab;
  setXTab: (t: ChannelTab) => void;
  youtubeTab: ChannelTab;
  setYoutubeTab: (t: ChannelTab) => void;
  etsyTab: ChannelTab;
  setEtsyTab: (t: ChannelTab) => void;
  trendyolTab: ChannelTab;
  setTrendyolTab: (t: ChannelTab) => void;
  ciceksepetiTab: ChannelTab;
  setCiceksepetiTab: (t: ChannelTab) => void;
  amazonHandmadeTab: ChannelTab;
  setAmazonHandmadeTab: (t: ChannelTab) => void;
  shopierTab: ChannelTab;
  setShopierTab: (t: ChannelTab) => void;
  gumroadTab: ChannelTab;
  setGumroadTab: (t: ChannelTab) => void;
  adobeStockTab: ChannelTab;
  setAdobeStockTab: (t: ChannelTab) => void;
  shutterstockTab: ChannelTab;
  setShutterstockTab: (t: ChannelTab) => void;
  creativeMarketTab: ChannelTab;
  setCreativeMarketTab: (t: ChannelTab) => void;
  nextTab: ChannelTab;
  setNextTab: (t: ChannelTab) => void;
  copiedId: string | null;
  expandedPlatforms: Set<string>;
  togglePlatform: (id: string) => void;
  styleImages: (string | null)[];
  platformFormat: PlatformFormat;
  setPlatformFormat: (f: PlatformFormat) => void;
  generatedImage: string | null;
  setGeneratedImage: (v: string | null) => void;
  lastPromptUsed: string | null;
  showApiCommand: boolean;
  setShowApiCommand: (v: boolean | ((p: boolean) => boolean)) => void;
  goldenPrompts: Array<{ prompt: string; savedAt: string }>;
  setGoldenPrompts: React.Dispatch<
    React.SetStateAction<Array<{ prompt: string; savedAt: string }>>
  >;
  GOLDEN_PROMPTS_KEY: string;
  imageDimensions: { w: number; h: number } | null;
  lastFormatUsed: PlatformFormat | null;
  imageZoomOpen: boolean;
  setImageZoomOpen: (v: boolean) => void;
  isGenerating: boolean;
  generateError: string | null;
  optimizedResult: OptimizedPromptResult | null;
  setOptimizedResult: (v: OptimizedPromptResult | null) => void;
  styleAnalysis: StyleAnalysisResult | null;
  setStyleAnalysis: (v: StyleAnalysisResult | null) => void;
  isOptimizing: boolean;
  isAnalyzing: boolean;
  jewelryAnalysis: JewelryAnalysisResult | null;
  jewelryAnalysisError: string | null;
  isAnalyzingJewelry: boolean;
  bgRemoverError: string | null;
  setBgRemoverError: (v: string | null) => void;
  handleOptimize: () => Promise<void>;
  handleAnalyzeStyle: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  handleAnalyzeJewelry: () => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleStyleImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeStyleImage: (index: number) => void;
  handleCopy: (id: string, content: string) => void;
  copyIconDefault: string;
  copyIconCopied: string;
  getContentForPlatform: (copyId: string, tab: ChannelTab) => string;
};

export type RemauraLayoutContextValue = {
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (m: WorkspaceMode) => void;
  effectiveEdit: boolean;
  layoutsFull: ResponsiveLayouts;
  setLayoutsFull: (l: ResponsiveLayouts) => void;
  visibility: Partial<Record<RemauraPanelId, boolean>>;
  hidePanel: (id: RemauraPanelId) => void;
  addPanel: (id: RemauraPanelId) => void;
  /** Gizlenmiş paneli tekrar göster (yerleşim korunur; grid’de yoksa ekler) */
  restorePanel: (id: RemauraPanelId) => void;
  /** Grid layout commit + localStorage */
  commitLayouts: (next: ResponsiveLayouts) => void;
};

export const RemauraAppContext = createContext<RemauraAppContextValue | null>(null);
export const RemauraLayoutContext = createContext<RemauraLayoutContextValue | null>(null);

export function useRemauraApp() {
  const v = useContext(RemauraAppContext);
  if (!v) throw new Error("useRemauraApp: RemauraWorkspace içinde kullanın");
  return v;
}

export function useRemauraLayout() {
  const v = useContext(RemauraLayoutContext);
  if (!v) throw new Error("useRemauraLayout: RemauraWorkspace içinde kullanın");
  return v;
}
