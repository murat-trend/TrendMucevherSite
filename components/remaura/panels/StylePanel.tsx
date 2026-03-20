"use client";

import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useRemauraApp } from "@/components/remaura/workspace/RemauraWorkspaceContexts";

export function StylePanel() {
  const { t } = useLanguage();
  const {
    styleImages,
    handleStyleImageUpload,
    removeStyleImage,
    handleAnalyzeStyle,
    isAnalyzing,
  } = useRemauraApp();

  return (
    <div className="rounded-none border-0 bg-transparent p-0">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm text-muted">
          <span aria-hidden>🎨</span>
          {t.remauraWorkspace.styleWindow}
        </h2>
        {styleImages.some(Boolean) && (
          <button
            type="button"
            onClick={() => void handleAnalyzeStyle()}
            disabled={isAnalyzing}
            className="rounded px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? t.remauraWorkspace.analyzingStyle : t.remauraWorkspace.analyzeStyle}
          </button>
        )}
      </div>
      <p className="mb-3 text-[10px] text-muted/80">{t.remauraWorkspace.styleWindowHint}</p>
      <div className="grid grid-cols-2 gap-3">
        {styleImages.map((url, i) => (
          <div
            key={i}
            className="relative flex h-24 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted transition-colors hover:border-foreground/20 dark:border-white/10 dark:hover:border-white/20"
          >
            {url ? (
              <>
                <Image src={url} alt="" fill className="object-cover" unoptimized sizes="96px" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeStyleImage(i);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-all hover:bg-red-600 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500"
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
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 transition-colors hover:text-foreground">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleStyleImageUpload(i, e)}
                />
                <span className="text-xs">↑</span>
                <span className="text-[10px] uppercase">{t.remauraWorkspace.upload}</span>
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
