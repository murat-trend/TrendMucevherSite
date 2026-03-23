"use client";

import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAIN_CONTENT_BLOCK_ORDER } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";
import { BackgroundRemoverPanel } from "@/components/remaura/BackgroundRemoverPanel";
import { DepthMapPanel } from "@/components/remaura/DepthMapPanel";

export function PreviewPanel() {
  const { t } = useLanguage();
  const app = useRemauraApp();
  const {
    generatedImage,
    platformFormat,
    lastFormatUsed,
    imageDimensions,
    setImageZoomOpen,
    bgRemoverError,
    setGeneratedImage,
    setBgRemoverError,
    lastPromptUsed,
    showApiCommand,
    setShowApiCommand,
    goldenPrompts,
    setGoldenPrompts,
    GOLDEN_PROMPTS_KEY,
    jewelryAnalysisError,
    handleAnalyzeJewelry,
    isAnalyzingJewelry,
    jewelryAnalysis,
    billingCredits,
    billingCheckoutUrl,
    isGenerating,
    generateError,
    handleGenerate,
    imageZoomOpen,
  } = app;

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
      {generatedImage ? (
        <>
          <div className="flex w-full max-w-md flex-col items-center gap-4 overflow-hidden">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] text-muted">{t.remauraWorkspace.visualFormat}</span>
            </div>
            {MAIN_CONTENT_BLOCK_ORDER.map((blockId) =>
              blockId === "image" ? (
                <div key="image" className="w-full">
                  <button
                    type="button"
                    className="relative w-full min-h-0 overflow-hidden rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#b76e79]/50"
                    style={{
                      maxHeight:
                        (lastFormatUsed ?? platformFormat) === "story-reels" ||
                        (lastFormatUsed ?? platformFormat) === "portrait"
                          ? "75vh"
                          : (lastFormatUsed ?? platformFormat) === "youtube-web"
                            ? "60vh"
                            : "70vh",
                      maxWidth: "100%",
                    }}
                    onClick={() => setImageZoomOpen(true)}
                    aria-label={t.remauraWorkspace.zoomImage}
                  >
                    <Image
                      src={generatedImage}
                      alt=""
                      width={imageDimensions?.w ?? 1024}
                      height={imageDimensions?.h ?? 1024}
                      className="h-full w-full object-contain cursor-zoom-in"
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 512px"
                    />
                    <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                        <path d="M11 8v6" />
                        <path d="M8 11h6" />
                      </svg>
                    </span>
                  </button>
                </div>
              ) : blockId === "bgRemover" ? (
                <div key="bgRemover" className="mt-4 w-full">
                  <div className="w-full">
                    {bgRemoverError && (
                      <p className="mb-2 text-xs text-red-600 dark:text-red-400">{bgRemoverError}</p>
                    )}
                    <BackgroundRemoverPanel
                      imageSrc={generatedImage}
                      onRemoved={(newImage) => {
                        setGeneratedImage(newImage);
                        setBgRemoverError(null);
                      }}
                      onError={setBgRemoverError}
                      t={t.remauraWorkspace}
                    />
                  </div>
                </div>
              ) : blockId === "apiCommand" ? (
                <div key="apiCommand" className="mt-4 w-full">
                  <div className="w-full rounded-xl border border-border bg-white/[0.02] p-3 dark:border-white/5">
                    {lastPromptUsed && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowApiCommand((p) => !p)}
                          className="flex w-full items-center justify-between gap-2 text-left"
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            {t.remauraWorkspace.apiCommandSent}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`shrink-0 text-muted transition-transform ${showApiCommand ? "rotate-180" : ""}`}
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        {showApiCommand && (
                          <div className="mt-3 space-y-3">
                            <pre className="max-h-40 overflow-auto rounded-lg bg-black/20 p-3 text-[11px] leading-relaxed text-foreground/90">
                              {lastPromptUsed}
                            </pre>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(lastPromptUsed ?? "").catch(() => {});
                                }}
                                className="rounded-lg border border-[#b76e79]/40 bg-[#b76e79]/10 px-3 py-1.5 text-[11px] font-bold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
                              >
                                {t.remauraWorkspace.copyCommand}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!lastPromptUsed) return;
                                  const entry = { prompt: lastPromptUsed, savedAt: new Date().toISOString() };
                                  const next = [entry, ...goldenPrompts.filter((p) => p.prompt !== lastPromptUsed)].slice(
                                    0,
                                    20
                                  );
                                  setGoldenPrompts(next);
                                  localStorage.setItem(GOLDEN_PROMPTS_KEY, JSON.stringify(next));
                                }}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                              >
                                {t.remauraWorkspace.saveAsBestCommand}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : blockId === "depthMap" ? (
                <div key="depthMap" className="mt-4 w-full">
                  <div className="w-full">
                    <DepthMapPanel imageSrc={generatedImage} t={t.remauraWorkspace} />
                  </div>
                </div>
              ) : (
                <div key="jewelry" className="mt-4 w-full">
                  <div className="w-full">
                    <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px]">
                      <span className="text-foreground/80">Icerik kredisi</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{billingCredits}</span>
                    </div>
                    {jewelryAnalysisError && (
                      <p className="mb-2 text-xs text-red-600 dark:text-red-400">{jewelryAnalysisError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleAnalyzeJewelry()}
                      disabled={isAnalyzingJewelry}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-60 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400 dark:hover:bg-amber-400/20"
                    >
                      {isAnalyzingJewelry ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          {t.remauraWorkspace.analyzingJewelry}
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                          </svg>
                          {t.remauraWorkspace.analyzeJewelry}
                        </>
                      )}
                    </button>
                    {billingCheckoutUrl && (
                      <a
                        href={billingCheckoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#b76e79]/40 bg-[#b76e79]/10 px-4 py-2.5 text-xs font-semibold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
                      >
                        30 TL ile kredi yukle
                      </a>
                    )}
                    {jewelryAnalysis && (
                      <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400">
                        ✓ Platform içerikleri güncellendi
                      </p>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {imageZoomOpen && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-auto bg-black/90 p-4"
              onClick={() => setImageZoomOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Görsel büyütme"
            >
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <a
                  href={generatedImage ?? undefined}
                  download="remaura-jewelry.png"
                  className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  {t.remauraWorkspace.downloadImage}
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageZoomOpen(false);
                  }}
                  className="flex h-10 items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-medium text-white hover:bg-white/30"
                  aria-label={t.remauraWorkspace.closeModal}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  {t.remauraWorkspace.closeModal}
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 */}
              <img
                src={generatedImage ?? ""}
                alt=""
                className="object-contain"
                style={{
                  maxHeight: "75vh",
                  maxWidth: "min(90vw, 1200px)",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      ) : isGenerating ? (
        <>
          <div className="mb-4 flex h-16 w-16 items-center justify-center animate-pulse opacity-40" aria-hidden>
            <Image src="/rem-icon-64.png" alt="" width={64} height={64} unoptimized />
          </div>
          <p className="text-sm text-muted">{t.remauraWorkspace.generating}</p>
        </>
      ) : generateError ? (
        <>
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{generateError}</p>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90"
            style={{
              backgroundColor: "#10b981",
              boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 0 10px rgba(16,185,129,0.18)",
            }}
          >
            {t.remauraWorkspace.generateImage}
          </button>
        </>
      ) : (
        <div
          className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border/80 bg-white/[0.02] p-8 dark:bg-transparent"
          role="status"
        >
          <div className="mb-1 flex h-14 w-14 items-center justify-center opacity-40" aria-hidden>
            <Image src="/rem-icon-64.png" alt="" width={56} height={56} unoptimized />
          </div>
          <h3 className="text-lg font-medium text-foreground">{t.remauraWorkspace.readyTitle}</h3>
          <p className="mx-auto max-w-xs text-sm text-muted">{t.remauraWorkspace.readyDesc}</p>
        </div>
      )}
    </div>
  );
}
