"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";
import {
  MAX_PRODUCT_STORY_COMBINED_CHARS,
  MIN_PRODUCT_STORY_COMBINED_CHARS,
} from "@/lib/remaura/product-story-bounds";

const STORY_BTN_SURFACE = "rgba(96, 165, 250, 0.45)";
const STORY_BTN_SURFACE_HOVER = "rgba(96, 165, 250, 0.55)";

function Section({
  title,
  text,
  emphasize,
}: {
  title: string;
  text: string;
  emphasize?: boolean;
}) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <p
        className={`whitespace-pre-wrap text-left leading-relaxed text-foreground/90 ${
          emphasize ? "text-[12px] font-medium" : "text-[11px]"
        }`}
      >
        {trimmed}
      </p>
    </section>
  );
}

export function ProductStoryPanel() {
  const { t } = useLanguage();
  const { jewelryAnalysis, jewelryAnalysisError, isAnalyzingJewelry } = useRemauraApp();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!jewelryAnalysis) setOpen(false);
  }, [jewelryAnalysis]);

  const canOpen = Boolean(jewelryAnalysis);

  const storyCharTotal = useMemo(() => {
    if (!jewelryAnalysis) return 0;
    return (
      jewelryAnalysis.analiz.length +
      jewelryAnalysis.sembolizm.length +
      jewelryAnalysis.hediyeNotu.length
    );
  }, [jewelryAnalysis]);

  const charMeterText = jewelryAnalysis
    ? t.remauraWorkspace.productStoryCharMeter
        .replace("{current}", String(storyCharTotal))
        .replace("{max}", String(MAX_PRODUCT_STORY_COMBINED_CHARS))
    : "";

  const charMeterTone =
    storyCharTotal > MAX_PRODUCT_STORY_COMBINED_CHARS
      ? "text-amber-600 dark:text-amber-400"
      : storyCharTotal > 0 && storyCharTotal < MIN_PRODUCT_STORY_COMBINED_CHARS
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted";

  return (
    <div className="flex min-h-0 flex-col rounded-none border-0 bg-transparent p-0 text-left">
      {jewelryAnalysisError && (
        <p className="mb-3 shrink-0 text-[11px] text-red-600 dark:text-red-400">{jewelryAnalysisError}</p>
      )}

      <button
        type="button"
        disabled={!canOpen || isAnalyzingJewelry}
        onClick={() => canOpen && setOpen(true)}
        aria-busy={isAnalyzingJewelry}
        className="mb-4 flex w-full min-h-[3.75rem] shrink-0 items-center justify-between rounded-xl p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: STORY_BTN_SURFACE,
          boxShadow: "0 0 0 1px rgba(96,165,250,0.2), 0 0 10px rgba(96,165,250,0.15)",
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = STORY_BTN_SURFACE_HOVER;
            e.currentTarget.style.boxShadow =
              "0 0 0 1px rgba(96,165,250,0.3), 0 0 12px rgba(96,165,250,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = STORY_BTN_SURFACE;
          e.currentTarget.style.boxShadow =
            "0 0 0 1px rgba(96,165,250,0.2), 0 0 10px rgba(96,165,250,0.15)";
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25 icon-2-5d-sm">
            <Image src="/rem-icon-64.png" alt="" width={24} height={24} className="opacity-90" unoptimized />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase text-white">{t.remauraWorkspace.productStoryPanelTitle}</h4>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-white/95">
          {canOpen && !isAnalyzingJewelry ? (
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {t.remauraWorkspace.assistantReady}
            </span>
          ) : null}
          <span aria-hidden>{isAnalyzingJewelry ? "…" : "📖"}</span>
        </span>
      </button>

      {open && jewelryAnalysis && (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/60 p-4 pb-10 pt-10 backdrop-blur-[2px] sm:pt-14"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-story-dialog-title"
        >
          <div
            className="relative flex max-h-[min(90dvh,880px)] w-full max-w-xl flex-col rounded-xl border border-border/80 bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
              <h2 id="product-story-dialog-title" className="text-sm font-semibold text-foreground">
                {t.remauraWorkspace.productStoryPanelTitle}
              </h2>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-muted hover:bg-muted/30 hover:text-foreground"
                aria-label={t.remauraWorkspace.closeModal}
              >
                {t.remauraWorkspace.closeModal}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              <Section
                title={t.remauraWorkspace.productStorySectionMana}
                text={jewelryAnalysis.sembolizm}
                emphasize
              />
              <Section title={t.remauraWorkspace.productStorySectionAnaliz} text={jewelryAnalysis.analiz} />
              <Section title={t.remauraWorkspace.productStorySectionHediye} text={jewelryAnalysis.hediyeNotu} />
            </div>
            <p
              className={`mt-3 shrink-0 border-t border-border/60 pt-2 text-[10px] tabular-nums ${charMeterTone}`}
              aria-live="polite"
            >
              {charMeterText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
