"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAX_CHARS } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";

/** Yüzük/Kolye: buton seçimi; metin kutusuna ürün adı yazılmaz (sunucuda yüzük için Görüntü A kuralı birleştirilir). */
const QUICK_TAG_BTN_BASE =
  "rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-[box-shadow,background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b76e79]/50";
const QUICK_TAG_BTN_IDLE = `${QUICK_TAG_BTN_BASE} border-[#b76e79]/40 bg-[#b76e79]/10 text-[#b76e79] hover:border-[#b76e79]/70 hover:bg-[#b76e79]/20`;
const QUICK_TAG_BTN_ACTIVE = `${QUICK_TAG_BTN_BASE} border-[#b76e79] bg-[#b76e79]/30 text-[#fde8ec] shadow-[0_0_14px_rgba(183,110,121,0.55),0_0_28px_rgba(183,110,121,0.35),inset_0_0_12px_rgba(255,255,255,0.12)]`;

export function PromptPanel() {
  const { t } = useLanguage();
  const {
    prompt,
    setPrompt,
    charCount,
    handleOptimize,
    isOptimizing,
    optimizedResult,
    handleKeyDown,
    setOptimizedResult,
    setApplyRingThreeQuarterView,
  } = useRemauraApp();

  const [activeQuickTag, setActiveQuickTag] = useState<"ring" | "kolye" | null>(null);

  const selectRingQuickTag = useCallback(() => {
    setActiveQuickTag("ring");
    setApplyRingThreeQuarterView(true);
    setOptimizedResult(null);
  }, [setOptimizedResult, setApplyRingThreeQuarterView]);

  const selectKolyeQuickTag = useCallback(() => {
    setActiveQuickTag("kolye");
    setApplyRingThreeQuarterView(false);
    setOptimizedResult(null);
  }, [setOptimizedResult, setApplyRingThreeQuarterView]);

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <button
        type="button"
        onClick={() => void handleOptimize()}
        disabled={isOptimizing || !prompt.trim()}
        className="mb-4 flex w-full min-h-[3.75rem] items-center justify-between rounded-xl p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: "rgba(96, 165, 250, 0.45)",
          boxShadow: "0 0 0 1px rgba(96,165,250,0.2), 0 0 10px rgba(96,165,250,0.15)",
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = "rgba(96, 165, 250, 0.55)";
            e.currentTarget.style.boxShadow =
              "0 0 0 1px rgba(96,165,250,0.3), 0 0 12px rgba(96,165,250,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(96, 165, 250, 0.45)";
          e.currentTarget.style.boxShadow =
            "0 0 0 1px rgba(96,165,250,0.2), 0 0 10px rgba(96,165,250,0.15)";
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25 icon-2-5d-sm">
            <Image src="/rem-icon-64.png" alt="" width={24} height={24} className="opacity-90" unoptimized />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-white">{t.remauraWorkspace.assistantTitle}</h4>
            {isOptimizing ? (
              <p className="text-[10px] text-white/85" aria-live="polite">
                {t.remauraWorkspace.assistantOptimizing}
              </p>
            ) : null}
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-white/95">
          {!isOptimizing && optimizedResult?.optimizedPrompt?.trim() ? (
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {t.remauraWorkspace.assistantReady}
            </span>
          ) : null}
          <span aria-hidden>{isOptimizing ? "…" : "✨"}</span>
        </span>
      </button>

      <h2 className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span aria-hidden>✎</span>
        {t.remauraWorkspace.visualDesc}
      </h2>
      <textarea
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value.slice(0, MAX_CHARS));
          setOptimizedResult(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={t.remauraWorkspace.visualPlaceholder}
        className="h-32 w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-accent/50 focus:outline-none dark:border-white/10 dark:bg-black/30"
      />
      <div className="mt-1 flex items-center justify-end">
        <span className="text-[10px] text-muted">
          {charCount} / {MAX_CHARS}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={activeQuickTag === "ring"}
          onClick={() => selectRingQuickTag()}
          className={activeQuickTag === "ring" ? QUICK_TAG_BTN_ACTIVE : QUICK_TAG_BTN_IDLE}
        >
          Yüzük
        </button>
        <button
          type="button"
          aria-pressed={activeQuickTag === "kolye"}
          onClick={() => selectKolyeQuickTag()}
          className={activeQuickTag === "kolye" ? QUICK_TAG_BTN_ACTIVE : QUICK_TAG_BTN_IDLE}
        >
          Kolye
        </button>
      </div>
    </div>
  );
}
