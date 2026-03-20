"use client";

import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAX_CHARS } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";
export function PromptPanel() {
  const { t } = useLanguage();
  const {
    prompt,
    setPrompt,
    charCount,
    handleOptimize,
    isOptimizing,
    handleKeyDown,
    setOptimizedResult,
  } = useRemauraApp();

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <button
        type="button"
        onClick={() => void handleOptimize()}
        disabled={isOptimizing || !prompt.trim()}
        className="mb-4 flex w-full items-center justify-between rounded-xl p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="text-[10px] text-white/85">{t.remauraWorkspace.assistantDesc}</p>
          </div>
        </div>
        <span className="text-white/95" aria-hidden>
          {isOptimizing ? "…" : "✨"}
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
    </div>
  );
}
