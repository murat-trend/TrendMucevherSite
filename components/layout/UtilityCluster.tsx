"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type UtilityClusterProps = {
  variant?: "default" | "glass";
};

export function UtilityCluster({ variant = "default" }: UtilityClusterProps) {
  const { locale, setLocale } = useLanguage();

  const isGlass = variant === "glass";

  return (
    <div
      className={
        isGlass
          ? "flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-1 py-1"
          : "flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 px-1 py-1"
      }
    >
      {/* TR / EN */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setLocale("tr")}
          aria-label="Türkçe"
          className={
            isGlass
              ? `rounded-md px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  locale === "tr"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white"
                }`
              : `rounded-md px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  locale === "tr"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted hover:text-foreground"
                }`
          }
        >
          TR
        </button>
        <span className={isGlass ? "h-3 w-px bg-white/30" : "h-3 w-px bg-border/80"} />
        <button
          type="button"
          onClick={() => setLocale("en")}
          aria-label="English"
          className={
            isGlass
              ? `rounded-md px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  locale === "en"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white"
                }`
              : `rounded-md px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  locale === "en"
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted hover:text-foreground"
                }`
          }
        >
          EN
        </button>
      </div>
      <span className={isGlass ? "h-4 w-px bg-white/30" : "h-4 w-px bg-border/80"} />
      <ThemeToggle compact invert={isGlass} />
    </div>
  );
}
