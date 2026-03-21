"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { ResponsiveLayouts } from "react-grid-layout";
import { getChannelContentForPlatform } from "@/lib/remaura/channel-content";
import {
  createInitialWorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState,
  addPanelToAllBreakpoints,
} from "@/lib/remaura/workspace/persistence";
import { panelExistsInLayouts } from "@/lib/remaura/workspace/layout-presets";
import type { RemauraPanelId, WorkspaceMode } from "@/lib/remaura/workspace/types";
import { DEFAULT_VISIBILITY } from "@/lib/remaura/workspace/persistence";
import {
  RemauraAppContext,
  RemauraLayoutContext,
  type RemauraAppContextValue,
  type RemauraLayoutContextValue,
} from "@/components/remaura/workspace/RemauraWorkspaceContexts";
import { RemauraBackgroundRemovalSection } from "@/components/remaura/RemauraBackgroundRemovalSection";
import { RemauraPhotoEditSection } from "@/components/remaura/RemauraPhotoEditSection";
import { RemauraPanelWorkspace } from "@/components/remaura/workspace/RemauraPanelWorkspace";
import type { ChannelTab } from "@/components/remaura/remaura-types";
import type { PlatformFormat } from "@/components/remaura/remaura-types";
import { IMAGE_SIZE_MAP } from "@/components/remaura/remaura-types";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import type { StyleAnalysisResult } from "@/lib/ai/remaura/style-analyzer";
import type { JewelryAnalysisResult } from "@/lib/ai/remaura/jewelry-analyzer";

type RemauraCategory = "jewelry" | "background" | "photoEdit";

type RemauraWorkspaceProps = {
  initialCategory?: RemauraCategory;
};

export function RemauraWorkspace({ initialCategory = "jewelry" }: RemauraWorkspaceProps) {
  const { t, locale } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [instaTab, setInstaTab] = useState<ChannelTab>("desc");
  const [tiktokTab, setTiktokTab] = useState<ChannelTab>("desc");
  const [threadsTab, setThreadsTab] = useState<ChannelTab>("desc");
  const [facebookTab, setFacebookTab] = useState<ChannelTab>("desc");
  const [linkedinTab, setLinkedinTab] = useState<ChannelTab>("desc");
  const [pinterestTab, setPinterestTab] = useState<ChannelTab>("desc");
  const [xTab, setXTab] = useState<ChannelTab>("desc");
  const [youtubeTab, setYoutubeTab] = useState<ChannelTab>("desc");
  const [etsyTab, setEtsyTab] = useState<ChannelTab>("desc");
  const [trendyolTab, setTrendyolTab] = useState<ChannelTab>("desc");
  const [ciceksepetiTab, setCiceksepetiTab] = useState<ChannelTab>("desc");
  const [amazonHandmadeTab, setAmazonHandmadeTab] = useState<ChannelTab>("desc");
  const [shopierTab, setShopierTab] = useState<ChannelTab>("desc");
  const [gumroadTab, setGumroadTab] = useState<ChannelTab>("desc");
  const [adobeStockTab, setAdobeStockTab] = useState<ChannelTab>("desc");
  const [shutterstockTab, setShutterstockTab] = useState<ChannelTab>("desc");
  const [creativeMarketTab, setCreativeMarketTab] = useState<ChannelTab>("desc");
  const [nextTab, setNextTab] = useState<ChannelTab>("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const togglePlatform = useCallback((id: string) => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [styleImages, setStyleImages] = useState<(string | null)[]>([null, null, null, null]);
  const [platformFormat, setPlatformFormat] = useState<PlatformFormat>("insta-post");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = useState<string | null>(null);
  const [showApiCommand, setShowApiCommand] = useState(false);
  const GOLDEN_PROMPTS_KEY = "remaura-golden-prompts";
  const [goldenPrompts, setGoldenPrompts] = useState<Array<{ prompt: string; savedAt: string }>>([]);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [lastFormatUsed, setLastFormatUsed] = useState<PlatformFormat | null>(null);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizedPromptResult | null>(null);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysisResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jewelryAnalysis, setJewelryAnalysis] = useState<JewelryAnalysisResult | null>(null);
  const [isAnalyzingJewelry, setIsAnalyzingJewelry] = useState(false);
  const [jewelryAnalysisError, setJewelryAnalysisError] = useState<string | null>(null);
  const [bgRemoverError, setBgRemoverError] = useState<string | null>(null);
  const [remauraCategory, setRemauraCategory] = useState<RemauraCategory>(initialCategory);

  const charCount = prompt.length;

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => createInitialWorkspaceState().workspaceMode);
  const [layoutsFull, setLayoutsFull] = useState<ResponsiveLayouts>(() => createInitialWorkspaceState().layouts);
  const [visibility, setVisibility] = useState<Partial<Record<RemauraPanelId, boolean>>>(() => ({
    ...DEFAULT_VISIBILITY,
    ...createInitialWorkspaceState().visibility,
  }));

  useEffect(() => {
    const s = loadWorkspaceState();
    if (s) {
      setLayoutsFull(s.layouts);
      setVisibility({ ...DEFAULT_VISIBILITY, ...s.visibility });
      setWorkspaceMode(s.workspaceMode);
    }
  }, []);

  useEffect(() => {
    try {
      const rawGolden = localStorage.getItem(GOLDEN_PROMPTS_KEY);
      if (rawGolden) setGoldenPrompts(JSON.parse(rawGolden) as Array<{ prompt: string; savedAt: string }>);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImageZoomOpen(false);
    };
    if (imageZoomOpen) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [imageZoomOpen]);

  const handleOptimize = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/remaura/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          locale,
          mode3DExport: platformFormat === "3d-export",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setOptimizedResult(data);
      const displayTr = data.optimizedPromptTr?.trim();
      const displayEn = data.optimizedPrompt?.trim();
      setPrompt(locale === "tr" ? (displayTr || displayEn || prompt) : (displayEn || displayTr || prompt));
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Optimizasyon başarısız.");
    } finally {
      setIsOptimizing(false);
    }
  }, [prompt, locale, platformFormat]);

  const handleAnalyzeStyle = useCallback(async () => {
    const imagesToSend = styleImages
      .filter((url): url is string => !!url && url.startsWith("data:"))
      .map((url) => {
        const base64 = url.split(",")[1];
        const mimeType = url.includes("png") ? "image/png" : "image/jpeg";
        return { base64, mimeType };
      })
      .filter((img) => !!img.base64);

    if (imagesToSend.length === 0) return;

    setIsAnalyzing(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/remaura/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setStyleAnalysis(data);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Stil analizi başarısız.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [styleImages]);

  const handleGenerate = useCallback(async () => {
    const useNormal = prompt.trim() || optimizedResult?.optimizedPrompt;
    if (!useNormal) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      let effectiveStyleAnalysis = styleAnalysis;
      const imagesToSend = styleImages
        .filter((url): url is string => !!url && url.startsWith("data:"))
        .map((url) => {
          const base64 = url.split(",")[1];
          const mimeType = url.includes("png") ? "image/png" : "image/jpeg";
          return { base64: base64 ?? "", mimeType };
        })
        .filter((img) => !!img.base64);

      if (imagesToSend.length > 0 && !effectiveStyleAnalysis) {
        setIsAnalyzing(true);
        try {
          const analyzeRes = await fetch("/api/remaura/analyze-style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: imagesToSend }),
          });
          const analyzeData = await analyzeRes.json();
          if (analyzeRes.ok) {
            effectiveStyleAnalysis = analyzeData;
            setStyleAnalysis(analyzeData);
          }
        } finally {
          setIsAnalyzing(false);
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || undefined,
          locale,
          negativePrompt: negativePrompt.trim() || undefined,
          format: platformFormat,
          exportMode3D: platformFormat === "3d-export",
          optimizedResult: optimizedResult ?? undefined,
          styleAnalysis: effectiveStyleAnalysis ?? undefined,
          styleImages: imagesToSend.length > 0 ? imagesToSend : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || t.remauraWorkspace.generateError);
        return;
      }
      setGeneratedImage(data.image ?? null);
      setLastPromptUsed(data.promptUsed ?? null);
      setLastFormatUsed(platformFormat);
      setImageDimensions(IMAGE_SIZE_MAP[platformFormat]);
    } catch {
      setGenerateError(t.remauraWorkspace.generateError);
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    negativePrompt,
    platformFormat,
    optimizedResult,
    styleAnalysis,
    styleImages,
    locale,
    t.remauraWorkspace.generateError,
  ]);

  useEffect(() => {
    setJewelryAnalysis(null);
    setJewelryAnalysisError(null);
  }, [generatedImage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("category");
    if (requested === "background") {
      setRemauraCategory("background");
      return;
    }
    if (requested === "jewelry") {
      setRemauraCategory("jewelry");
      return;
    }
    if (requested === "photo-edit") {
      setRemauraCategory("photoEdit");
    }
  }, []);

  const handleAnalyzeJewelry = useCallback(async () => {
    if (!generatedImage || isAnalyzingJewelry) return;
    setIsAnalyzingJewelry(true);
    setJewelryAnalysisError(null);
    try {
      const res = await fetch("/api/remaura/analyze-jewelry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: generatedImage.startsWith("data:") ? generatedImage : `data:image/png;base64,${generatedImage}`,
          prompt: prompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Analiz başarısız.");
      setJewelryAnalysis(data);
    } catch (e) {
      setJewelryAnalysisError(e instanceof Error ? e.message : "Mücevher analizi başarısız.");
    } finally {
      setIsAnalyzingJewelry(false);
    }
  }, [generatedImage, prompt, isAnalyzingJewelry]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate]
  );

  const handleStyleImageUpload = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setStyleImages((prev) => {
        const next = [...prev];
        next[index] = reader.result as string;
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const removeStyleImage = useCallback((index: number) => {
    setStyleImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setStyleAnalysis(null);
  }, []);

  const handleCopy = useCallback(
    (id: string, content: string) => {
      const text = content || t.remauraWorkspace.channelDescPlaceholder;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(() => {});
    },
    [t.remauraWorkspace.channelDescPlaceholder]
  );

  const copyIconDefault =
    "text-[#b76e79] hover:text-[#a65f69] dark:text-[#c4838b] dark:hover:text-[#b76e79]";
  const copyIconCopied = "text-emerald-500";

  const getContentForPlatform = useCallback(
    (copyId: string, tab: ChannelTab) => getChannelContentForPlatform(t as never, jewelryAnalysis, copyId, tab),
    [t, jewelryAnalysis]
  );

  const setWorkspaceModePersist = useCallback(
    (m: WorkspaceMode) => {
      setWorkspaceMode(m);
      saveWorkspaceState({
        version: 2,
        layouts: layoutsFull,
        visibility,
        workspaceMode: m,
      });
    },
    [layoutsFull, visibility]
  );

  const hidePanel = useCallback(
    (id: RemauraPanelId) => {
      setVisibility((prev) => {
        const next = { ...prev, [id]: false };
        saveWorkspaceState({
          version: 2,
          layouts: layoutsFull,
          visibility: next,
          workspaceMode,
        });
        return next;
      });
    },
    [layoutsFull, workspaceMode]
  );

  const addPanel = useCallback(
    (id: RemauraPanelId) => {
      const nextLayouts = addPanelToAllBreakpoints(layoutsFull, id);
      setLayoutsFull(nextLayouts);
      setVisibility((prev) => {
        const next = { ...prev, [id]: true };
        saveWorkspaceState({
          version: 2,
          layouts: nextLayouts,
          visibility: next,
          workspaceMode,
        });
        return next;
      });
    },
    [layoutsFull, workspaceMode]
  );

  const restorePanel = useCallback(
    (id: RemauraPanelId) => {
      let nextLayouts = layoutsFull;
      if (!panelExistsInLayouts(layoutsFull, id)) {
        nextLayouts = addPanelToAllBreakpoints(layoutsFull, id);
        setLayoutsFull(nextLayouts);
      }
      setVisibility((prev) => {
        const next = { ...prev, [id]: true };
        saveWorkspaceState({
          version: 2,
          layouts: nextLayouts,
          visibility: next,
          workspaceMode,
        });
        return next;
      });
    },
    [layoutsFull, workspaceMode]
  );

  const commitLayouts = useCallback(
    (next: ResponsiveLayouts) => {
      setLayoutsFull(next);
      saveWorkspaceState({
        version: 2,
        layouts: next,
        visibility,
        workspaceMode,
      });
    },
    [visibility, workspaceMode]
  );

  const layoutValue: RemauraLayoutContextValue = useMemo(
    () => ({
      workspaceMode,
      setWorkspaceMode: setWorkspaceModePersist,
      effectiveEdit: workspaceMode === "edit",
      layoutsFull,
      setLayoutsFull,
      visibility,
      hidePanel,
      addPanel,
      restorePanel,
      commitLayouts,
    }),
    [workspaceMode, setWorkspaceModePersist, layoutsFull, visibility, hidePanel, addPanel, restorePanel, commitLayouts]
  );

  const appValue: RemauraAppContextValue = {
    t,
    locale,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    charCount,
    instaTab,
    setInstaTab,
    tiktokTab,
    setTiktokTab,
    threadsTab,
    setThreadsTab,
    facebookTab,
    setFacebookTab,
    linkedinTab,
    setLinkedinTab,
    pinterestTab,
    setPinterestTab,
    xTab,
    setXTab,
    youtubeTab,
    setYoutubeTab,
    etsyTab,
    setEtsyTab,
    trendyolTab,
    setTrendyolTab,
    ciceksepetiTab,
    setCiceksepetiTab,
    amazonHandmadeTab,
    setAmazonHandmadeTab,
    shopierTab,
    setShopierTab,
    gumroadTab,
    setGumroadTab,
    adobeStockTab,
    setAdobeStockTab,
    shutterstockTab,
    setShutterstockTab,
    creativeMarketTab,
    setCreativeMarketTab,
    nextTab,
    setNextTab,
    copiedId,
    expandedPlatforms,
    togglePlatform,
    styleImages,
    platformFormat,
    setPlatformFormat,
    generatedImage,
    setGeneratedImage,
    lastPromptUsed,
    showApiCommand,
    setShowApiCommand,
    goldenPrompts,
    setGoldenPrompts,
    GOLDEN_PROMPTS_KEY,
    imageDimensions,
    lastFormatUsed,
    imageZoomOpen,
    setImageZoomOpen,
    isGenerating,
    generateError,
    optimizedResult,
    setOptimizedResult,
    styleAnalysis,
    setStyleAnalysis,
    isOptimizing,
    isAnalyzing,
    jewelryAnalysis,
    jewelryAnalysisError,
    isAnalyzingJewelry,
    bgRemoverError,
    setBgRemoverError,
    handleOptimize,
    handleAnalyzeStyle,
    handleGenerate,
    handleAnalyzeJewelry,
    handleKeyDown,
    handleStyleImageUpload,
    removeStyleImage,
    handleCopy,
    copyIconDefault,
    copyIconCopied,
    getContentForPlatform,
  };

  return (
    <RemauraAppContext.Provider value={appValue}>
      <RemauraLayoutContext.Provider value={layoutValue}>
        <div id="remaura-workspace" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="mb-6 flex flex-col items-center justify-center space-y-2 py-6 sm:mb-10 sm:py-8">
            <div className="mb-3 flex items-center justify-center">
              <div className="icon-2-5d">
                <Image
                  src="/rem-icon-128.png"
                  alt=""
                  width={64}
                  height={64}
                  className="h-14 w-14 sm:h-16 sm:w-16"
                  unoptimized
                />
              </div>
            </div>
            <h1
              className="text-center font-display text-3xl font-light uppercase tracking-[0.4em] text-[#b76e79] sm:text-4xl"
              style={{
                textShadow: "0 0 24px rgba(183,110,121,0.5), 0 0 48px rgba(183,110,121,0.25)",
              }}
            >
              {t.remauraWorkspace.heroTitle} <span className="font-bold">{t.remauraWorkspace.heroAi}</span>
            </h1>
            <div
              className="mt-5 flex flex-wrap items-center justify-center gap-2"
              role="tablist"
              aria-label="Remaura kategorileri"
            >
              <button
                type="button"
                role="tab"
                aria-selected={remauraCategory === "jewelry"}
                onClick={() => setRemauraCategory("jewelry")}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  remauraCategory === "jewelry"
                    ? "border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79]"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20"
                }`}
              >
                {t.remauraWorkspace.categoryJewelryDesign}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={remauraCategory === "background"}
                onClick={() => setRemauraCategory("background")}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  remauraCategory === "background"
                    ? "border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79]"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20"
                }`}
              >
                {t.remauraWorkspace.categoryBackgroundRemoval}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={remauraCategory === "photoEdit"}
                onClick={() => setRemauraCategory("photoEdit")}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  remauraCategory === "photoEdit"
                    ? "border-[#b76e79] bg-[#b76e79]/15 text-[#b76e79]"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20"
                }`}
              >
                {t.remauraWorkspace.categoryPhotoEdit}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="h-px w-8 bg-foreground/10" aria-hidden />
              <span className="text-[9px] font-medium uppercase tracking-[0.6em] text-muted">
                {t.remauraWorkspace.byline}
              </span>
              <span className="h-px w-8 bg-foreground/10" aria-hidden />
            </div>
          </div>

          {remauraCategory === "jewelry" ? (
            <RemauraPanelWorkspace />
          ) : remauraCategory === "background" ? (
            <RemauraBackgroundRemovalSection
              t={{
                removeBackground: t.remauraWorkspace.removeBackground,
                removingBackground: t.remauraWorkspace.removingBackground,
                removeBackgroundHint: t.remauraWorkspace.removeBackgroundHint,
                uploadImage: t.remauraWorkspace.uploadImage,
                uploadImageHint: t.remauraWorkspace.uploadImageHint,
                downloadImage: t.remauraWorkspace.downloadImage,
              }}
            />
          ) : (
            <RemauraPhotoEditSection
              t={{
                title: t.remauraWorkspace.photoEditTitle,
                hint: t.remauraWorkspace.photoEditHint,
                uploadImage: t.remauraWorkspace.uploadImage,
                uploadImageHint: t.remauraWorkspace.uploadImageHint,
                clearImage: t.remauraWorkspace.clearImage,
                downloadImage: t.remauraWorkspace.downloadImage,
                resetAdjustments: t.remauraWorkspace.resetAdjustments,
                noImage: t.remauraWorkspace.noImageSelected,
              }}
            />
          )}
        </div>
      </RemauraLayoutContext.Provider>
    </RemauraAppContext.Provider>
  );
}
