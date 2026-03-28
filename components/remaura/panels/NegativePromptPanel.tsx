"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { MAX_NEGATIVE_CHARS } from "@/components/remaura/remaura-types";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";

export function NegativePromptPanel() {
  const { t } = useLanguage();
  const {
    negativePrompt,
    setNegativePrompt,
    handleKeyDown,
    handleGenerate,
    isGenerating,
    prompt,
    optimizedResult,
  } = useRemauraApp();

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={isGenerating || (!prompt.trim() && !optimizedResult?.optimizedPrompt)}
        className={`mb-4 flex w-full min-h-[3.75rem] items-center justify-center gap-2 rounded-xl p-3 text-center text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isGenerating ? "animate-btn-glow-soft" : ""}`}
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

      <h2 className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span aria-hidden>✖</span>
        {t.remauraWorkspace.negativePrompt}
      </h2>
      <textarea
        value={negativePrompt}
        onChange={(e) => setNegativePrompt(e.target.value.slice(0, MAX_NEGATIVE_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder={t.remauraWorkspace.negativePlaceholder}
        className="h-32 w-full resize-none rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-accent/50 focus:outline-none dark:border-white/10 dark:bg-black/30"
      />
      <div className="mt-1 flex items-center justify-end">
        <span className="text-[10px] text-muted">
          {negativePrompt.length} / {MAX_NEGATIVE_CHARS}
        </span>
      </div>
    </div>
  );
}
