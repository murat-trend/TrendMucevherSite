"use client";

import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAX_STYLE_REFERENCE_SLOTS } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";
import { styleAnalysisIsUsable } from "@/lib/ai/remaura/style-analyzer";

const STYLE_BTN_SURFACE = "rgba(124, 58, 237, 0.42)";
const STYLE_BTN_SURFACE_HOVER = "rgba(124, 58, 237, 0.52)";

export function StylePanel() {
  const { t } = useLanguage();
  const {
    styleImages,
    styleAnalysis,
    handleStyleImageUpload,
    removeStyleImage,
    handleAnalyzeStyle,
    isAnalyzing,
  } = useRemauraApp();

  const slots = styleImages.slice(0, MAX_STYLE_REFERENCE_SLOTS);
  const hasStyleRefs = slots.some(Boolean);
  const formReferenceMissing = !slots[0];
  const styleGuideReady = styleAnalysisIsUsable(styleAnalysis);

  const slotMeta = [
    {
      label: t.remauraWorkspace.styleRefSlot1Label,
      placeholder: t.remauraWorkspace.styleRefSlot1Placeholder,
      tooltip: t.remauraWorkspace.styleRefSlot1Tooltip,
    },
    {
      label: t.remauraWorkspace.styleRefSlot2Label,
      placeholder: t.remauraWorkspace.styleRefSlot2Placeholder,
      tooltip: t.remauraWorkspace.styleRefSlot2Tooltip,
    },
  ] as const;

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <button
        type="button"
        onClick={() => void handleAnalyzeStyle()}
        disabled={!hasStyleRefs || isAnalyzing}
        className="mb-4 flex w-full min-h-[3.75rem] items-center justify-between rounded-xl p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: STYLE_BTN_SURFACE,
          boxShadow: "0 0 0 1px rgba(124,58,237,0.22), 0 0 10px rgba(124,58,237,0.14)",
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = STYLE_BTN_SURFACE_HOVER;
            e.currentTarget.style.boxShadow =
              "0 0 0 1px rgba(124,58,237,0.32), 0 0 12px rgba(124,58,237,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = STYLE_BTN_SURFACE;
          e.currentTarget.style.boxShadow =
            "0 0 0 1px rgba(124,58,237,0.22), 0 0 10px rgba(124,58,237,0.14)";
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25 icon-2-5d-sm">
            <Image src="/rem-icon-64.png" alt="" width={24} height={24} className="opacity-90" unoptimized />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase text-white">{t.remauraWorkspace.styleWindow}</h4>
            {isAnalyzing ? (
              <p className="text-[10px] text-white/85" aria-live="polite">
                {t.remauraWorkspace.analyzingStyle}
              </p>
            ) : null}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-white/95">
          {!isAnalyzing && styleGuideReady ? (
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {t.remauraWorkspace.assistantReady}
            </span>
          ) : null}
          <span aria-hidden>{isAnalyzing ? "…" : "🎨"}</span>
        </span>
      </button>

      {formReferenceMissing ? (
        <p
          role="status"
          className="mb-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100/90"
        >
          {t.remauraWorkspace.styleRefMissingHint}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {slots.map((url, i) => {
          const meta = slotMeta[i]!;
          return (
            <div key={i} className="flex min-w-0 flex-col gap-1">
              <div className="flex items-start gap-1">
                <span className="min-w-0 text-[10px] font-semibold leading-snug text-foreground/90">
                  {meta.label}
                </span>
                <button
                  type="button"
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-amber-600/40 text-[9px] font-bold leading-none text-amber-700 transition-colors hover:bg-amber-500/15 dark:border-amber-400/40 dark:text-amber-300"
                  title={meta.tooltip}
                  aria-label={meta.tooltip}
                >
                  i
                </button>
              </div>
              <div
                className={`relative flex h-32 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-alt text-muted transition-colors hover:border-accent/40 focus-within:border-accent/50 dark:border-white/10 dark:bg-black/30 ${url ? "" : "p-1.5"}`}
              >
                {url ? (
                  <>
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 200px"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeStyleImage(i);
                      }}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-all hover:scale-110 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label={t.remauraWorkspace.remove}
                      title={t.remauraWorkspace.remove}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 transition-colors hover:text-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleStyleImageUpload(i, e)}
                    />
                    <span className="text-[9px] text-center leading-snug text-muted">
                      {meta.placeholder}
                    </span>
                    <span className="text-xs opacity-80">↑</span>
                    <span className="text-[10px] uppercase">{t.remauraWorkspace.upload}</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
