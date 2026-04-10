"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraAICtaButton } from "@/components/ui/RemauraAICtaButton";

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 sm:py-16 md:py-20 lg:py-24">

      {/* ── Arka plan katmanları ── */}

      {/* 1. Ana radial glow — merkeze odaklı, tema uyumlu */}
      <div className="hero-overlay pointer-events-none absolute inset-0" aria-hidden />

      {/* 2. Altın ton glow — dark modda belirginleşir */}
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />

      {/* 3. Alt fade */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/[0.03] dark:to-foreground/[0.04]"
        aria-hidden
      />

      {/* 4. Dekoratif ince çizgi — yatay eksen, sadece dark modda */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 dark:block"
        aria-hidden
      >
        <div className="h-px w-[600px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="mt-[180px] h-px w-[400px] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      {/* 5. Köşe derinlik efekti */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,transparent_0%,var(--background)_100%)] opacity-60"
        aria-hidden
      />

      {/* ── İçerik ── */}
      <div className="relative mx-auto max-w-4xl text-center">

        {/* Üst etiket */}
        <div className="mb-8 flex items-center justify-center gap-2 sm:mb-10">
          <span className="h-px w-8 bg-accent/40" />
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-accent/80">
            Yapay Zeka Destekli Mücevher
          </span>
          <span className="h-px w-8 bg-accent/40" />
        </div>

        {/* Ana başlık */}
        <h1 className="font-display text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] xl:leading-[1.05]">
          {t.hero.headline}
        </h1>

        {/* Alt imza */}
        <p className="font-display mt-4 text-sm font-normal tracking-[0.1em] text-muted/70 sm:mt-5 sm:text-base">
          by Murat Kaynaroğlu
        </p>

        {/* Açıklama metni */}
        <p className="mx-auto mt-10 max-w-[38ch] text-[15px] leading-[1.8] text-muted sm:mt-12 sm:text-base md:max-w-[44ch]">
          {t.hero.subline}
        </p>

        {/* ── CTA Butonları ── */}
        <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:mt-14 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          {/* Birincil CTA — daha belirgin */}
          <RemauraAICtaButton
            variant="hero"
            className="h-[46px] w-full shrink-0 px-7 text-[15px] font-medium sm:w-auto"
          >
            {t.hero.remauraCta}
          </RemauraAICtaButton>

          {/* İkincil CTA — daha geri planda */}
          <Link
            href="/modeller"
            className="flex h-[46px] min-w-0 items-center justify-center rounded-[999px] border border-border/60 bg-transparent px-7 text-[15px] font-medium text-foreground/70 transition-all duration-300 ease-out hover:border-border hover:bg-foreground/[0.04] hover:text-foreground"
          >
            {t.hero.browseProducts}
          </Link>
        </div>

        {/* ── Trust satırı ── */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-16 sm:gap-x-10">
          {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
              )}
              <span className="text-[12px] tracking-[0.04em] text-muted/80 sm:text-[13px]">
                {item}
              </span>
            </span>
          ))}
        </div>

      </div>

      {/* Alt kenar solma */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />
    </section>
  );
}
