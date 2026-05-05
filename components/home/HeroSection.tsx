"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy: Record<string, {
  tag: string;
  headline: string;
  byline: string;
  sub: string;
  cta1: string;
  cta2: string;
  trust: string[];
}> = {
  tr: {
    tag: "Kuyumcu Tasarım Koleksiyonu",
    headline: "Mit, tarih ve insan deneyiminden — kuyumcu imalatçıları için özgün 3D tasarım koleksiyonu",
    byline: "by Murat Kaynaroğlu",
    sub: "STL ve GLB formatında. Anında indirin, hemen üretin.",
    cta1: "Koleksiyona Göz At",
    cta2: "Davet Kodumu Kullan",
    trust: ["Özgün Tasarımlar", "STL + GLB Format", "Anında Teslimat"],
  },
  en: {
    tag: "Jewelry Design Collection",
    headline: "From myth, history and human experience — an original 3D design collection for jewelry manufacturers",
    byline: "by Murat Kaynaroğlu",
    sub: "In STL and GLB format. Download instantly, produce right away.",
    cta1: "Browse Collection",
    cta2: "Use My Invite Code",
    trust: ["Original Designs", "STL + GLB Format", "Instant Delivery"],
  },
  de: {
    tag: "Schmuckdesign-Kollektion",
    headline: "Aus Mythos, Geschichte und menschlicher Erfahrung — eine originale 3D-Designkollektion für Schmuckhersteller",
    byline: "by Murat Kaynaroğlu",
    sub: "In STL- und GLB-Format. Sofort herunterladen, sofort produzieren.",
    cta1: "Kollektion ansehen",
    cta2: "Meinen Einladungscode verwenden",
    trust: ["Originaldesigns", "STL + GLB Format", "Sofortige Lieferung"],
  },
  ru: {
    tag: "Коллекция ювелирных дизайнов",
    headline: "Из мифа, истории и человеческого опыта — оригинальная коллекция 3D-дизайнов для ювелирных производителей",
    byline: "by Murat Kaynaroğlu",
    sub: "В форматах STL и GLB. Скачайте мгновенно, производите сразу.",
    cta1: "Смотреть коллекцию",
    cta2: "Использовать код приглашения",
    trust: ["Оригинальные дизайны", "Формат STL + GLB", "Мгновенная доставка"],
  },
};

export function HeroSection() {
  const { locale } = useLanguage();
  const c = copy[locale] ?? copy.tr;

  return (
    <section className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 sm:py-16 md:py-20 lg:py-24">

      <div className="hero-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/[0.03] dark:to-foreground/[0.04]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 dark:block"
        aria-hidden
      >
        <div className="h-px w-[600px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="mt-[180px] h-px w-[400px] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,transparent_0%,var(--background)_100%)] opacity-60"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">

        <div className="mb-8 flex items-center justify-center gap-2 sm:mb-10">
          <span className="h-px w-8 bg-accent/40" />
          <span className="font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-accent/80">
            {c.tag}
          </span>
          <span className="h-px w-8 bg-accent/40" />
        </div>

        <h1 className="font-display text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] xl:leading-[1.05]">
          {c.headline}
        </h1>

        <p className="font-display mt-4 text-sm font-normal tracking-[0.1em] text-muted/70 sm:mt-5 sm:text-base">
          {c.byline}
        </p>

        <p className="mx-auto mt-10 max-w-[38ch] text-[15px] leading-[1.8] text-muted sm:mt-12 sm:text-base md:max-w-[44ch]">
          {c.sub}
        </p>

        <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:mt-14 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Link
            href="/modeller"
            className="flex h-[46px] items-center justify-center rounded-[999px] bg-[#c9a84c] px-7 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {c.cta1}
          </Link>
          <Link
            href="/davet"
            className="flex h-[46px] min-w-0 items-center justify-center rounded-[999px] border border-border/60 bg-transparent px-7 text-[15px] font-medium text-foreground/70 transition-all duration-300 ease-out hover:border-border hover:bg-foreground/[0.04] hover:text-foreground"
          >
            {c.cta2}
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:mt-16 sm:gap-x-10">
          {c.trust.map((item, i) => (
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

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />
    </section>
  );
}
