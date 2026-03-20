"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAX_NEGATIVE_CHARS } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";
import type { OptimizedPromptResult } from "@/lib/ai/remaura/prompt-optimizer";

export function NegativePromptPanel() {
  const { t } = useLanguage();
  const {
    negativePrompt,
    setNegativePrompt,
    handleKeyDown,
    goldenPrompts,
    setGoldenPrompts,
    GOLDEN_PROMPTS_KEY,
    setOptimizedResult,
    setPrompt,
    handleGenerate,
    isGenerating,
    prompt,
    optimizedResult,
  } = useRemauraApp();

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <h2 className="mb-2 flex items-center gap-2 text-sm text-muted">
        <span aria-hidden>✖</span>
        {t.remauraWorkspace.negativePrompt}
      </h2>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value.slice(0, MAX_NEGATIVE_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder={t.remauraWorkspace.negativePlaceholder}
        className="h-20 w-full resize-none rounded-lg border border-dashed border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-red-900/50 focus:outline-none dark:border-white/10 dark:bg-black/30"
      />

      {goldenPrompts.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            {t.remauraWorkspace.savedBestCommands}
          </h3>
          <ul className="space-y-2">
            {goldenPrompts.slice(0, 5).map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOptimizedResult({ optimizedPrompt: item.prompt } as OptimizedPromptResult);
                    setPrompt(item.prompt.slice(0, 100) + (item.prompt.length > 100 ? "…" : ""));
                  }}
                  className="flex-1 truncate rounded bg-black/20 px-2 py-1.5 text-left text-[11px] text-foreground/90 hover:bg-black/30"
                  title={item.prompt}
                >
                  {item.prompt.slice(0, 80)}…
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = goldenPrompts.filter((_, j) => j !== i);
                    setGoldenPrompts(next);
                    localStorage.setItem(GOLDEN_PROMPTS_KEY, JSON.stringify(next));
                  }}
                  className="shrink-0 rounded p-1 text-muted hover:text-red-500"
                  aria-label={t.remauraWorkspace.remove}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isGenerating || (!prompt.trim() && !optimizedResult?.optimizedPrompt)}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isGenerating ? "animate-btn-glow-soft" : ""}`}
        style={{
          backgroundColor: "#10b981",
          boxShadow: "0 0 0 1px rgba(16,185,129,0.3), 0 0 10px rgba(16,185,129,0.18)",
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.boxShadow =
              "0 0 0 1px rgba(16,185,129,0.4), 0 0 14px rgba(16,185,129,0.25)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 0 1px rgba(16,185,129,0.3), 0 0 10px rgba(16,185,129,0.18)";
        }}
      >
        {isGenerating ? (
          <>
            <span className="flex gap-2" aria-hidden>
              {[
                { color: "#34d399", shadow: "0 0 5px rgba(52,211,153,0.4)" },
                { color: "#22d3ee", shadow: "0 0 5px rgba(34,211,238,0.4)" },
                { color: "#fbbf24", shadow: "0 0 5px rgba(251,191,36,0.4)" },
                { color: "#f472b6", shadow: "0 0 5px rgba(244,114,182,0.4)" },
              ].map(({ color, shadow }, idx) => (
                <span
                  key={idx}
                  className="h-2 w-2 rounded-full animate-dot-glow-color"
                  style={{
                    backgroundColor: color,
                    boxShadow: shadow,
                    animationDelay: `${idx * 180}ms`,
                  }}
                />
              ))}
            </span>
            {t.remauraWorkspace.generating}
          </>
        ) : (
          t.remauraWorkspace.generateImage
        )}
      </button>
      <p className="mt-2 text-center text-[10px] uppercase text-muted">{t.remauraWorkspace.quickGenerate}</p>
    </div>
  );
}
