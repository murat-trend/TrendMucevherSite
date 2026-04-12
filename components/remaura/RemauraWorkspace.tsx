"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
import { Remaura3DAISection } from "@/components/remaura/Remaura3DAISection";
import { RemauraRingRailResizeSection } from "@/components/remaura/RemauraRingRailResizeSection";
import { RemauraPanelWorkspace } from "@/components/remaura/workspace/RemauraPanelWorkspace";
import type { ChannelTab } from "@/components/remaura/remaura-types";
import type { PlatformFormat } from "@/components/remaura/remaura-types";
import {
  IMAGE_SIZE_MAP,
  JEWELRY_DESIGN_EXCLUDED_FORMATS,
  MAX_STYLE_REFERENCE_SLOTS,
} from "@/components/remaura/remaura-types";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";
import { styleAnalysisIsUsable, type StyleAnalysisResult } from "@/lib/ai/remaura/style-analyzer";
import { styleDataUrlsToPayload } from "@/lib/remaura/data-url";
import type { JewelryAnalysisResult, JewelryPlatformTarget } from "@/lib/ai/remaura/jewelry-analyzer";
import { createClient } from "@/utils/supabase/client";
import {
  RemauraBillingModalProvider,
  remauraHandleBillingApiResponse,
  useRemauraBillingModal,
} from "@/components/remaura/RemauraBillingModalProvider";
import { useRemauraCreditsCheck } from "@/hooks/useRemauraCreditsCheck";

type RemauraCategory = "jewelry" | "background" | "photoEdit" | "mesh3d" | "ringRail";

type RemauraWorkspaceProps = {
  initialCategory?: RemauraCategory;
  /** false: üst bileşen (ör. sayfa) zaten RemauraBillingModalProvider ile sarılı olmalı */
  embedBillingProvider?: boolean;
};

export function RemauraWorkspace({ embedBillingProvider = true, ...props }: RemauraWorkspaceProps) {
  const inner = <RemauraWorkspaceInner {...props} />;
  if (!embedBillingProvider) return inner;
  return <RemauraBillingModalProvider>{inner}</RemauraBillingModalProvider>;
}

function mapFormatToAnalysisPlatform(format: PlatformFormat): JewelryPlatformTarget {
  if (format === "story-reels") return "tiktok";
  if (format === "youtube-web") return "youtube";
  if (format === "3d-export") return "next";
  if (format === "portrait") return "instagram";
  return "instagram";
}

function RemauraWorkspaceInner({ initialCategory = "jewelry" }: RemauraWorkspaceProps) {
  const { t, locale } = useLanguage();
  const billingUi = useRemauraBillingModal();
  const { checkCredits } = useRemauraCreditsCheck();

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
  const [selectedDistributionPlatform, setSelectedDistributionPlatform] = useState<JewelryPlatformTarget | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set());
  const togglePlatform = useCallback((id: string) => {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const [styleImages, setStyleImages] = useState<(string | null)[]>(() =>
    Array.from({ length: MAX_STYLE_REFERENCE_SLOTS }, () => null)
  );
  const [platformFormat, setPlatformFormat] = useState<PlatformFormat>("insta-post");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [debugPayload, setDebugPayload] = useState<Record<string, unknown> | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [lastFormatUsed, setLastFormatUsed] = useState<PlatformFormat | null>(null);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizedPromptResult | null>(null);
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysisResult | null>(null);
  const styleAnalyzeAbortRef = useRef<AbortController | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jewelryAnalysis, setJewelryAnalysis] = useState<JewelryAnalysisResult | null>(null);
  const [isAnalyzingJewelry, setIsAnalyzingJewelry] = useState(false);
  const [jewelryAnalysisError, setJewelryAnalysisError] = useState<string | null>(null);
  const [relaxedProductClaims, setRelaxedProductClaims] = useState(false);
  const [billingUserId, setBillingUserId] = useState<string>("");
  const [billingCredits, setBillingCredits] = useState<number>(0);
  const [billingCheckoutUrl, setBillingCheckoutUrl] = useState<string | null>(null);
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
    const supabase = createClient();
    const syncWallet = () => {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        const id = user?.id ?? "";
        setBillingUserId(id);
        if (!id) {
          setBillingCredits(0);
          return;
        }
        void fetch(`/api/billing/wallet?userId=${encodeURIComponent(id)}`)
          .then((r) => r.json())
          .then((data) => {
            const credits = Number(data?.wallet?.balanceCredits ?? 0);
            if (Number.isFinite(credits)) setBillingCredits(credits);
          })
          .catch(() => {});
      });
    };
    syncWallet();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => syncWallet());
    return () => subscription.unsubscribe();
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
    if (
      !(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))
    ) {
      return;
    }
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
          userId: billingUserId || undefined,
        }),
      });
      if (await remauraHandleBillingApiResponse(res, billingUi)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setOptimizedResult(data);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Optimizasyon başarısız.");
    } finally {
      setIsOptimizing(false);
    }
  }, [prompt, locale, platformFormat, billingUserId, billingUi, checkCredits]);

  const runStyleAnalysis = useCallback(async () => {
    const imagesToSend = styleDataUrlsToPayload(styleImages);
    if (imagesToSend.length === 0) return;

    if (
      !(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))
    ) {
      return;
    }

    styleAnalyzeAbortRef.current?.abort();
    const ac = new AbortController();
    styleAnalyzeAbortRef.current = ac;

    setIsAnalyzing(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/remaura/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesToSend, userId: billingUserId || undefined }),
        signal: ac.signal,
      });
      if (await remauraHandleBillingApiResponse(res, billingUi)) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setStyleAnalysis(data);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStyleAnalysis(null);
      setGenerateError(e instanceof Error ? e.message : "Stil analizi başarısız.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [styleImages, billingUserId, billingUi, checkCredits]);

  const handleAnalyzeStyle = useCallback(() => runStyleAnalysis(), [runStyleAnalysis]);

  useEffect(() => {
    const payload = styleDataUrlsToPayload(styleImages);
    if (payload.length === 0) return;
    const id = window.setTimeout(() => {
      void runStyleAnalysis();
    }, 550);
    return () => {
      window.clearTimeout(id);
    };
  }, [styleImages, runStyleAnalysis]);

  useEffect(() => {
    return () => {
      styleAnalyzeAbortRef.current?.abort();
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    const useNormal = prompt.trim() || optimizedResult?.optimizedPrompt;
    if (!useNormal) return;

    const imagesToSendPre = styleDataUrlsToPayload(styleImages);
    const needsStyleFirst =
      imagesToSendPre.length > 0 && !styleAnalysisIsUsable(styleAnalysis);
    const minCreditsForGenerate = needsStyleFirst ? 6 : 5;
    if (
      !(await checkCredits(
        minCreditsForGenerate,
        billingUi.openUnauthorized,
        billingUi.openInsufficientCredits
      ))
    ) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    try {
      let effectiveStyleAnalysis = styleAnalysis;
      const imagesToSend = imagesToSendPre;

      if (imagesToSend.length > 0 && !effectiveStyleAnalysis) {
        setIsAnalyzing(true);
        try {
          const analyzeRes = await fetch("/api/remaura/analyze-style", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images: imagesToSend, userId: billingUserId || undefined }),
          });
          if (await remauraHandleBillingApiResponse(analyzeRes, billingUi)) {
            setIsGenerating(false);
            return;
          }
          const analyzeData = await analyzeRes.json();
          if (!analyzeRes.ok) {
            throw new Error(analyzeData?.error ?? "Stil analizi başarısız.");
          }
          effectiveStyleAnalysis = analyzeData;
          setStyleAnalysis(analyzeData);
        } catch (e) {
          setGenerateError(e instanceof Error ? e.message : "Stil analizi başarısız.");
          setIsGenerating(false);
          return;
        } finally {
          setIsAnalyzing(false);
        }
      }

      if (imagesToSend.length > 0 && !styleAnalysisIsUsable(effectiveStyleAnalysis)) {
        setGenerateError(t.remauraWorkspace.styleAnalysisInsufficient);
        setIsGenerating(false);
        return;
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
          userId: billingUserId || undefined,
        }),
      });
      if (await remauraHandleBillingApiResponse(res, billingUi)) {
        setIsGenerating(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || t.remauraWorkspace.generateError);
        return;
      }
      setGeneratedImage(data.image ?? null);
      setDebugPayload(data._debug ?? null);
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
    billingUserId,
    t.remauraWorkspace.generateError,
    t.remauraWorkspace.styleAnalysisInsufficient,
    billingUi,
    checkCredits,
  ]);

  useEffect(() => {
    setJewelryAnalysis(null);
    setJewelryAnalysisError(null);
  }, [generatedImage]);

  useEffect(() => {
    if (remauraCategory !== "jewelry") return;
    if (JEWELRY_DESIGN_EXCLUDED_FORMATS.includes(platformFormat)) {
      setPlatformFormat("insta-post");
    }
  }, [remauraCategory, platformFormat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("category");
    if (requested === "mesh-ai" || requested === "meshAI") {
      setRemauraCategory("jewelry");
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("category");
        window.history.replaceState({}, "", u.pathname + u.search + u.hash);
      } catch {
        /* ignore */
      }
      return;
    }
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
      return;
    }
    if (requested === "mesh3d") {
      setRemauraCategory("mesh3d");
      return;
    }
    if (requested === "ring-rail") {
      setRemauraCategory("ringRail");
    }
  }, []);

  const handleAnalyzeJewelry = useCallback(async () => {
    if (!generatedImage || isAnalyzingJewelry) return;
    if (
      !(await checkCredits(1, billingUi.openUnauthorized, billingUi.openInsufficientCredits))
    ) {
      return;
    }
    setIsAnalyzingJewelry(true);
    setJewelryAnalysisError(null);
    try {
      const selectedPlatform = selectedDistributionPlatform ?? mapFormatToAnalysisPlatform(platformFormat);
      const res = await fetch("/api/remaura/analyze-jewelry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: generatedImage.startsWith("data:") ? generatedImage : `data:image/png;base64,${generatedImage}`,
          prompt: prompt.trim() || undefined,
          selectedPlatform,
          userId: billingUserId,
          relaxedProductClaims,
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data?.code === "UNAUTHORIZED") {
        billingUi.openUnauthorized();
        throw new Error("Giriş gerekli.");
      }
      if (res.status === 402 && data?.code === "INSUFFICIENT_CREDITS") {
        billingUi.openInsufficientCredits();
        throw new Error("Yetersiz kredi.");
      }
      if (res.status === 402 && data?.checkoutUrl) {
        setBillingCheckoutUrl(data.checkoutUrl);
        const credits = Number(data?.wallet?.balanceCredits ?? 0);
        if (Number.isFinite(credits)) setBillingCredits(credits);
        throw new Error("Kredi yetersiz. Odeme adimina gecin.");
      }
      if (!res.ok) throw new Error(data?.error ?? "Analiz başarısız.");
      const { remauraUnmetered: _unmetered, ...jewelryPayload } = data as JewelryAnalysisResult & {
        remauraUnmetered?: boolean;
      };
      setJewelryAnalysis(jewelryPayload);
      setBillingCheckoutUrl(null);
      if (!_unmetered) {
        setBillingCredits((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      setJewelryAnalysisError(e instanceof Error ? e.message : "Ürün hikayesi oluşturulamadı.");
    } finally {
      setIsAnalyzingJewelry(false);
    }
  }, [
    generatedImage,
    prompt,
    isAnalyzingJewelry,
    platformFormat,
    selectedDistributionPlatform,
    billingUserId,
    relaxedProductClaims,
    billingUi,
    checkCredits,
  ]);

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
      setStyleAnalysis(null);
      setGenerateError(null);
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

  const handleCopy = useCallback((id: string, content: string) => {
    void navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {});
  }, []);

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
    selectedDistributionPlatform,
    setSelectedDistributionPlatform,
    styleImages,
    platformFormat,
    setPlatformFormat,
    generatedImage,
    setGeneratedImage,
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
    relaxedProductClaims,
    setRelaxedProductClaims,
    billingUserId,
    billingCredits,
    billingCheckoutUrl,
    setBillingCheckoutUrl,
    debugPayload,
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
              <button
                type="button"
                role="tab"
                aria-selected={remauraCategory === "mesh3d"}
                onClick={() => setRemauraCategory("mesh3d")}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  remauraCategory === "mesh3d"
                    ? "border-teal-400 bg-teal-500/15 text-teal-300"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20"
                }`}
              >
                REMAURA 3D AI
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={remauraCategory === "ringRail"}
                onClick={() => setRemauraCategory("ringRail")}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  remauraCategory === "ringRail"
                    ? "border-amber-400 bg-amber-500/15 text-amber-300"
                    : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20"
                }`}
              >
                RING RAIL RESIZE
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
          ) : remauraCategory === "mesh3d" ? (
            <Remaura3DAISection />
          ) : remauraCategory === "ringRail" ? (
            <RemauraRingRailResizeSection />
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
