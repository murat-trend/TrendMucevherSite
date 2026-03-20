"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraAICtaButton } from "@/components/ui/RemauraAICtaButton";

export function RemauraSection() {
  const { t } = useLanguage();
  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
              {t.remaura.label}
            </p>
            <h2 className="mt-5 font-display text-2xl font-medium tracking-[-0.03em] text-foreground sm:text-3xl lg:text-4xl">
              {t.remaura.title}
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-[1.75] text-muted">
              {t.remaura.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <RemauraAICtaButton variant="primary">
                {t.remaura.discover}
              </RemauraAICtaButton>
              <Link
                href="/fiyatlandirma"
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:bg-foreground/[0.03]"
              >
                {t.remaura.pricing}
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card to-surface-alt-2 shadow-[0_8px_40px_rgba(30,28,26,0.06)] dark:border-border/60 dark:from-card/90 dark:to-surface-alt-2 dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_85%_at_50%_50%,rgba(139,105,20,0.14),transparent_75%)] dark:bg-[radial-gradient(ellipse_85%_85%_at_50%_50%,rgba(201,162,39,0.12),transparent_75%)]" />
              <div className="absolute h-36 w-36 animate-[pulse_4s_ease-in-out_infinite] rounded-full bg-accent/25 blur-3xl sm:h-48 sm:w-48 sm:blur-[40px] dark:bg-accent/20" />
              <span className="relative text-7xl text-accent/55 sm:text-8xl dark:text-accent/45">✦</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
