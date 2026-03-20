"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraAICtaButton } from "@/components/ui/RemauraAICtaButton";

export function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="relative flex min-h-[75vh] flex-col items-center justify-center bg-background px-4 py-20 sm:py-24 md:py-28 lg:py-32">
      {/* Subtle background depth - theme-aware radial glow */}
      <div className="hero-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/[0.02] dark:to-foreground/[0.03]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Main brand heading */}
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
          {t.hero.headline}
        </h1>
        <p className="font-display mt-3 text-base font-normal tracking-[0.08em] text-muted sm:mt-4 sm:text-lg md:text-xl">
          by Murat Kaynaroğlu
        </p>

        {/* Body copy - optimal line length for readability */}
        <p className="mx-auto mt-10 max-w-[38ch] text-[15px] leading-[1.75] text-muted sm:mt-12 sm:text-base sm:leading-[1.8] md:max-w-[42ch]">
          {t.hero.subline}
        </p>

        {/* CTA buttons — identical height, padding, cohesive pair */}
        <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:mt-14 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <RemauraAICtaButton
            variant="hero"
            className="h-[44px] w-full shrink-0 px-[22px] sm:w-auto"
          >
            {t.hero.remauraCta}
          </RemauraAICtaButton>
          <Link
            href="/urunler"
            className="flex h-[44px] min-w-0 items-center justify-center rounded-[999px] border border-border bg-transparent px-[22px] text-base font-medium text-foreground transition-all duration-300 ease-out hover:border-border hover:bg-foreground/[0.04]"
          >
            {t.hero.browseProducts}
          </Link>
        </div>

        {/* Trust / value row */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] sm:mt-16 sm:gap-x-12 sm:text-[13px]">
          <span className="text-muted tracking-[0.02em]">{t.hero.trust1}</span>
          <span className="text-muted/80">·</span>
          <span className="text-muted tracking-[0.02em]">{t.hero.trust2}</span>
          <span className="text-muted/80">·</span>
          <span className="text-muted tracking-[0.02em]">{t.hero.trust3}</span>
        </div>
      </div>
    </section>
  );
}
