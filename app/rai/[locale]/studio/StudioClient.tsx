"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Download,
  Eraser,
  FileText,
  Gem,
  ImagePlus,
  Layers,
  Loader2,
  Maximize2,
  Menu,
  Monitor,
  Palette,
  Save,
  Share2,
  Smartphone,
  Sparkles,
  Upload,
  Wand2,
  X,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ALL_TOOLS, FORMAT_META, type RaiCategory, type RaiFormat } from "./lib/constants";
import { raiPost } from "../../lib/api";
import { useRai } from "../../i18n/RaiI18nProvider";
import { LanguageSwitcher } from "../../i18n/LanguageSwitcher";

const TOOL_ICONS: Record<string, LucideIcon> = {
  diamond: Diamond,
  eraser: Eraser,
  imagePlus: ImagePlus,
  box: Box,
};

const FORMAT_ICONS: Record<string, LucideIcon> = {
  monitor: Monitor,
  smartphone: Smartphone,
  youtube: Youtube,
  maximize: Maximize2,
};

type ProductData = {
  title: string;
  desc: string;
  tags: string[];
  hashtags: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StudioClient() {
  const { dict } = useRai();
  const T = dict.studio;
  const [category, setCategory] = useState<RaiCategory>("jewelry");
  const [format, setFormat] = useState<RaiFormat>("insta-post");
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<RaiFormat | null>(null);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);
  const [styleImages, setStyleImages] = useState<(string | null)[]>([null, null]);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [styleResult, setStyleResult] = useState<string | null>(null);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [credits, setCredits] = useState(100);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
        setHamburgerOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Optimize / stil analizi / ürün analizi henüz MOCK — sırayla API'ye bağlanacak.
  const handleOptimize = async () => {
    if (!prompt.trim() || isOptimizing) return;
    setIsOptimizing(true);
    await sleep(1200);
    setOptimizedPrompt(
      `Hyper-realistic jewelry photography, ${prompt.trim()}, 100mm macro lens, 8k resolution.`
    );
    setIsOptimizing(false);
  };

  // GERÇEK üretim — /api/v1/studio/generate (HTTP; ada motor import etmez).
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setRightOpen(true);
    setGeneratedImage(null);
    setProductData(null);
    setGenerateError(null);
    try {
      const data = await raiPost<{ image: string }>("/api/v1/studio/generate", {
        prompt,
        negative,
        format,
        styleImages: styleImages.filter(Boolean),
      });
      setGeneratedImage(data.image);
      setLastFormat(format);
      setCredits((c) => c - 5);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : T.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStyleAnalyze = async () => {
    if (!styleImages.some(Boolean) || isAnalyzingStyle) return;
    setIsAnalyzingStyle(true);
    await sleep(800);
    setStyleResult(
      "Vintage Art Deco stili tespit edildi: geometrik desenler, milgrain kenarlar, baget kesim accent taşlar."
    );
    setIsAnalyzingStyle(false);
  };

  const handleProductAnalyze = async () => {
    if (!generatedImage || isAnalyzingProduct) return;
    setIsAnalyzingProduct(true);
    await sleep(1000);
    setProductData({
      title: "18K Altın Pırlanta Yüzük - Vintage Art Deco",
      desc: "Zarif 18 ayar altın şerit üzerine geometrik Art Deco desenleriyle süslenmiş lüks yüzük. Merkezinde parlak brilliant kesim pırlanta.",
      tags: ["18k altın", "pırlanta yüzük", "art deco", "vintage mücevher", "nişan yüzüğü"],
      hashtags: ["#altinyuzuk", "#pirlanta", "#mucevhertasarim", "#artdeco"],
    });
    setCredits((c) => c - 1);
    setIsAnalyzingProduct(false);
  };

  const handleStyleUpload = (idx: number, file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      setStyleImages((prev) => {
        const next = [...prev];
        next[idx] = r.result as string;
        return next;
      });
    };
    r.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `remaura-${Date.now()}.png`;
    a.click();
  };

  const activeTool = ALL_TOOLS.find((t) => t.key === category);
  const CsIcon = TOOL_ICONS[activeTool?.icon ?? "eraser"];

  return (
    <div className="relative h-screen flex flex-col overflow-hidden bg-[var(--rai-bg)] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[rgba(212,175,55,0.015)] blur-[180px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[rgba(212,175,55,0.01)] blur-[150px]" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header
          className="shrink-0 border-b border-white/[0.06] backdrop-blur-xl"
          style={{ background: "rgba(10,8,18,0.95)" }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              {/* Hamburger */}
              <div className="relative" ref={hamburgerRef}>
                <button
                  onClick={() => setHamburgerOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: hamburgerOpen ? "rgba(155,127,212,0.4)" : "rgba(255,255,255,0.1)",
                    background: hamburgerOpen ? "rgba(155,127,212,0.1)" : "transparent",
                  }}
                >
                  <Menu className="w-4 h-4 text-[var(--rai-purple)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--rai-purple)]">
                    {T.tools}
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--rai-gold)]" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--rai-gold)]" />
                  </span>
                </button>
                {hamburgerOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: "rgba(10,8,18,0.98)" }}
                  >
                    <div className="p-3 space-y-1">
                      <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                        {T.allTools}
                      </p>
                      {ALL_TOOLS.map((tool) => {
                        const Icon = TOOL_ICONS[tool.icon];
                        const isActive = category === tool.key;
                        return (
                          <button
                            key={tool.key}
                            onClick={() => {
                              setCategory(tool.key);
                              setHamburgerOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative"
                            style={{ background: isActive ? "rgba(155,127,212,0.12)" : "transparent" }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: isActive ? "var(--rai-purple)" : "var(--rai-text-muted)" }}
                            />
                            <span
                              className="text-xs font-medium"
                              style={{ color: isActive ? "#fff" : "var(--rai-text-sec)" }}
                            >
                              {T[tool.labelKey]}
                            </span>
                            {isActive && (
                              <span className="absolute right-3 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[var(--rai-gold)]" />
                                <span
                                  className="relative inline-flex rounded-full h-2 w-2 bg-[var(--rai-gold)]"
                                  style={{ boxShadow: "0 0 8px var(--rai-gold)" }}
                                />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-white/[0.08]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rai/mascot.png"
                alt="REMAURA"
                className="h-9 w-9 object-contain"
                style={{ filter: "drop-shadow(0 0 8px rgba(155,127,212,0.3))" }}
              />
              <div className="h-6 w-px bg-white/[0.08]" />
              <span className="text-xs uppercase tracking-wider text-[var(--rai-text-muted)]">
                {T.studio}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <span className="text-xs text-[var(--rai-text-muted)]">
                {T.credit}: <span className="font-bold text-[var(--rai-gold)]">{credits}</span>
              </span>
            </div>
          </div>
        </header>

        {category !== "jewelry" ? (
          /* Coming soon */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(155,127,212,0.1)" }}
              >
                <CsIcon className="w-10 h-10 text-[var(--rai-purple)]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{activeTool ? T[activeTool.labelKey] : ""}</h2>
              <p className="mb-6 text-[var(--rai-text-sec)]">{T.comingSoon}</p>
              <button
                onClick={() => setCategory("jewelry")}
                className="rai-btn-generate inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white"
              >
                <Diamond className="w-4 h-4" /> {T.comingSoonBack}
              </button>
            </div>
          </div>
        ) : (
          /* Workspace */
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT SIDEBAR */}
            <div
              className="shrink-0 border-r border-white/[0.06] transition-all duration-300 overflow-y-auto bg-[var(--rai-card)]"
              style={{ width: leftOpen ? "20rem" : 0, overflowX: "hidden" }}
            >
              <div className="p-4 space-y-5 w-80">
                {/* Format */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-3.5 h-3.5 text-[var(--rai-purple)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                      {T.formatLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FORMAT_META) as RaiFormat[]).map((key) => {
                      const meta = FORMAT_META[key];
                      const Icon = FORMAT_ICONS[meta.icon];
                      const isActive = format === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setFormat(key)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            isActive ? "shadow-lg" : "border-white/5 bg-white/[0.02] hover:border-white/10"
                          }`}
                          style={
                            isActive
                              ? {
                                  background: "rgba(155,127,212,0.08)",
                                  borderColor: "rgba(155,127,212,0.5)",
                                  boxShadow: "0 0 20px rgba(155,127,212,0.1)",
                                }
                              : undefined
                          }
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: isActive ? "var(--rai-purple)" : "var(--rai-text-muted)" }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            {meta.label ?? T.formatPortrait}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--rai-text-muted)]">{meta.dims}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--rai-purple)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                      {T.promptLabel}
                    </span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setOptimizedPrompt(null);
                    }}
                    placeholder={T.promptPlaceholder}
                    className="w-full h-24 resize-none rounded-xl border border-white/[0.08] px-3 py-2.5 text-xs text-white placeholder:text-[var(--rai-text-muted)] focus:outline-none focus:border-[rgba(155,127,212,0.4)] transition-all bg-white/[0.03]"
                  />
                  <p className="text-[9px] mt-1 text-[var(--rai-text-muted)]">{T.promptHelp}</p>
                  {optimizedPrompt && (
                    <div
                      className="mt-2 p-2.5 rounded-lg border"
                      style={{ background: "rgba(155,127,212,0.08)", borderColor: "rgba(155,127,212,0.2)" }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-[var(--rai-purple)]">
                        {T.optimizedTitle}
                      </p>
                      <p className="text-[10px] leading-relaxed text-[var(--rai-text-sec)]">{optimizedPrompt}</p>
                    </div>
                  )}
                  <button
                    onClick={handleOptimize}
                    disabled={!prompt.trim() || isOptimizing}
                    className="mt-2 flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(155,127,212,0.15)",
                      borderColor: "rgba(155,127,212,0.3)",
                      color: "var(--rai-purple-light)",
                    }}
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> {T.optimizing}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" /> {T.optimizeBtn}
                      </>
                    )}
                  </button>
                </div>

                {/* Negative */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-3.5 h-3.5 text-[var(--rai-text-muted)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                      {T.negativeLabel}
                    </span>
                  </div>
                  <textarea
                    value={negative}
                    onChange={(e) => setNegative(e.target.value)}
                    placeholder={T.negativePlaceholder}
                    className="w-full h-16 resize-none rounded-xl border border-white/[0.08] px-3 py-2.5 text-xs text-white placeholder:text-[var(--rai-text-muted)] focus:outline-none focus:border-[rgba(155,127,212,0.4)] transition-all bg-white/[0.03]"
                  />
                </div>

                {/* Style reference */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-3.5 h-3.5 text-[var(--rai-purple)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                      {T.styleLabel}
                    </span>
                  </div>
                  <p className="text-[9px] mb-2 text-[var(--rai-text-muted)]">{T.styleHint}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.02]"
                      >
                        {styleImages[i] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={styleImages[i]!} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() =>
                                setStyleImages((prev) => {
                                  const next = [...prev];
                                  next[i] = null;
                                  return next;
                                })
                              }
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-full cursor-pointer text-[var(--rai-text-muted)]">
                            <Upload className="w-5 h-5 mb-1" />
                            <span className="text-[9px] uppercase tracking-wider">{T.styleUpload}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleStyleUpload(i, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                  {styleImages.some(Boolean) && (
                    <button
                      onClick={handleStyleAnalyze}
                      disabled={isAnalyzingStyle}
                      className="mt-2 flex items-center gap-1.5 w-full justify-center py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: "rgba(155,127,212,0.1)",
                        borderColor: "rgba(155,127,212,0.25)",
                        color: "var(--rai-purple)",
                      }}
                    >
                      {isAnalyzingStyle ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> {T.styleAnalyzing}
                        </>
                      ) : (
                        <>
                          <Palette className="w-3 h-3" /> {T.styleAnalyzeBtn}
                        </>
                      )}
                    </button>
                  )}
                  {styleResult && (
                    <p
                      className="mt-2 text-[10px] leading-relaxed p-2 rounded-lg border text-[var(--rai-purple)]"
                      style={{ background: "rgba(155,127,212,0.05)", borderColor: "rgba(155,127,212,0.1)" }}
                    >
                      {styleResult}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Toggle left */}
            <button
              onClick={() => setLeftOpen((o) => !o)}
              className="shrink-0 w-6 flex items-center justify-center border-r border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              {leftOpen ? (
                <ChevronLeft className="w-3 h-3 text-[var(--rai-text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--rai-text-muted)]" />
              )}
            </button>

            {/* CENTER */}
            <div className="flex-1 flex flex-col relative bg-[var(--rai-bg)]">
              <div className="shrink-0 px-4 py-2 text-center border-b border-white/[0.04]">
                <p className="text-[9px] tracking-wider text-[var(--rai-text-muted)]">{T.disclaimer}</p>
              </div>

              <div className="flex-1 flex items-center justify-center p-6 relative overflow-y-auto">
                {generatedImage ? (
                  <div className="relative max-w-full max-h-full rai-anim-fade-in-up">
                    <button onClick={() => setZoomOpen(true)} className="group relative cursor-pointer p-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generatedImage}
                        alt="AI ile üretilmiş mücevher tasarımı"
                        className="max-w-full max-h-[calc(100vh-220px)] rounded-2xl object-contain transition-transform group-hover:scale-[1.01]"
                        style={{ boxShadow: "0 0 60px rgba(155,127,212,0.15)" }}
                      />
                      <span className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
                        <Gem className="w-3 h-3 text-[var(--rai-gold)]" />
                        <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--rai-gold)]">
                          REMAURA AI
                        </span>
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                          {T.zoomHint}
                        </span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center max-w-md">
                    <div className="relative mx-auto mb-6" style={{ width: 120, height: 120 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/rai/mascot.png"
                        alt="REMAURA AI"
                        className="w-full h-full object-contain rai-anim-float"
                        style={{ filter: "drop-shadow(0 0 20px rgba(155,127,212,0.4))" }}
                      />
                      <span
                        className="absolute top-0 right-2 w-2.5 h-2.5 rounded-full rai-anim-tool-glow bg-[var(--rai-gold)]"
                        style={{ boxShadow: "0 0 8px var(--rai-gold), 0 0 16px rgba(212,175,55,0.4)" }}
                      />
                      <span
                        className="absolute bottom-4 left-0 w-1.5 h-1.5 rounded-full bg-[var(--rai-cyan)]"
                        style={{
                          boxShadow: "0 0 6px var(--rai-cyan)",
                          animation: "rai-tool-glow 2.5s ease-in-out infinite 0.5s",
                        }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{T.emptyTitle}</h3>
                    <p className="text-sm mb-8 text-[var(--rai-text-sec)]">{T.emptyDesc}</p>
                    <div className="flex items-center justify-center gap-6">
                      {[
                        { Icon: Layers, label: T.emptyStep1, delay: "0s" },
                        { Icon: Sparkles, label: T.emptyStep2, delay: "0.15s" },
                        { Icon: Zap, label: T.emptyStep3, delay: "0.3s" },
                      ].map(({ Icon, label, delay }) => (
                        <div
                          key={label}
                          className="flex flex-col items-center gap-2"
                          style={{ animation: `rai-float 3s ease-in-out infinite ${delay}` }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl border border-white/[0.06] flex items-center justify-center text-[var(--rai-purple)]"
                            style={{ background: "rgba(155,127,212,0.08)" }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] uppercase tracking-wider text-[var(--rai-text-muted)]">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Generate bar */}
              <div className="shrink-0 p-4 border-t border-white/[0.06] bg-[var(--rai-card)]">
                {generateError && (
                  <p className="mb-2 text-center text-[11px] text-[var(--rai-error)]">
                    {generateError}
                  </p>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="rai-btn-generate w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="relative flex items-center justify-center w-8 h-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/rai/mascot.png"
                          alt=""
                          className="w-7 h-7 object-contain rai-anim-bounce"
                          style={{ filter: "drop-shadow(0 0 8px rgba(155,127,212,0.5))" }}
                        />
                        <span
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: "rgba(155,127,212,0.3)", animationDuration: "1.5s" }}
                        />
                      </span>
                      {T.generating}
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> {T.generateBtn}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Toggle right */}
            <button
              onClick={() => setRightOpen((o) => !o)}
              className="shrink-0 w-6 flex items-center justify-center border-l border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              {rightOpen ? (
                <ChevronRight className="w-3 h-3 text-[var(--rai-text-muted)]" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-[var(--rai-text-muted)]" />
              )}
            </button>

            {/* RIGHT SIDEBAR */}
            <div
              className="shrink-0 border-l border-white/[0.06] transition-all duration-300 overflow-y-auto bg-[var(--rai-card)]"
              style={{ width: rightOpen ? "20rem" : 0, overflowX: "hidden" }}
            >
              {rightOpen && (
                <div className="p-4 space-y-5 w-80">
                  {/* Analysis */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-3.5 h-3.5 text-[var(--rai-purple)]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                        {T.analysisTitle}
                      </span>
                    </div>
                    {!generatedImage && (
                      <p className="text-[10px] leading-relaxed text-[var(--rai-text-muted)]">{T.analysisDesc}</p>
                    )}
                    {generatedImage && !productData && (
                      <button
                        onClick={handleProductAnalyze}
                        disabled={isAnalyzingProduct}
                        className="w-full py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        style={{
                          background: "rgba(155,127,212,0.08)",
                          borderColor: "rgba(155,127,212,0.2)",
                          color: "var(--rai-purple-light)",
                        }}
                      >
                        {isAnalyzingProduct ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> {T.analyzing}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" /> {T.analyzeBtn}
                          </>
                        )}
                      </button>
                    )}
                    {productData && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-[var(--rai-purple)]">
                            {T.resultTitle}
                          </p>
                          <p className="text-xs text-white">{productData.title}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-[var(--rai-purple)]">
                            {T.resultDesc}
                          </p>
                          <p className="text-[11px] leading-relaxed text-[var(--rai-text-sec)]">{productData.desc}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-2 text-[var(--rai-purple)]">
                            {T.resultTags}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {productData.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[9px] px-2 py-1 rounded-full border text-[var(--rai-purple)]"
                                style={{
                                  background: "rgba(155,127,212,0.1)",
                                  borderColor: "rgba(155,127,212,0.2)",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-2 text-[var(--rai-purple)]">
                            {T.resultHashtags}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {productData.hashtags.map((h) => (
                              <span
                                key={h}
                                className="text-[9px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[var(--rai-text-sec)]"
                              >
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Export */}
                  {generatedImage && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Share2 className="w-3.5 h-3.5 text-[var(--rai-purple)]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--rai-text-muted)]">
                          {T.exportTitle}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={handleDownload}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80 text-[var(--rai-gold)]"
                          style={{ background: "rgba(212,175,55,0.1)", borderColor: "rgba(212,175,55,0.2)" }}
                        >
                          <Download className="w-3.5 h-3.5" /> {T.downloadBtn}
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80 text-[var(--rai-text-sec)]">
                          <Save className="w-3.5 h-3.5" /> {T.saveBtn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Format info */}
                  {generatedImage && lastFormat && (
                    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-[var(--rai-text-muted)]">
                        {T.formatLabel}
                      </p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const fm = FORMAT_META[lastFormat];
                          const Icon = FORMAT_ICONS[fm.icon];
                          return (
                            <>
                              <Icon className="w-4 h-4 text-[var(--rai-purple)]" />
                              <span className="text-xs text-white">{fm.label ?? T.formatPortrait}</span>
                              <span className="text-[9px] font-mono ml-auto text-[var(--rai-text-muted)]">
                                {fm.dims}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Zoom modal */}
      {zoomOpen && generatedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.9)" }}
          onClick={() => setZoomOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImage}
              alt="AI ile üretilmiş mücevher tasarımı"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
            />
            <button className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1">
              <X className="w-4 h-4" /> {T.zoomClose}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
