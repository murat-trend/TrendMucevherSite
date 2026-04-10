"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraAICtaButton } from "@/components/ui/RemauraAICtaButton";

const FEATURES = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
      </svg>
    ),
    tr: "Yapay zeka ile anında görsel üretimi",
    en: "Instant AI-powered image generation",
    de: "Sofortige KI-Bildgenerierung",
    ru: "Мгновенная генерация изображений с ИИ",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    tr: "Görselden 3D modele tek adımda dönüşüm",
    en: "One-step image to 3D model conversion",
    de: "Ein-Schritt Bild-zu-3D-Konvertierung",
    ru: "Конвертация изображения в 3D за один шаг",
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
    tr: "STL & GLB formatlarında profesyonel çıktı",
    en: "Professional output in STL & GLB formats",
    de: "Professionelle Ausgabe in STL & GLB",
    ru: "Профессиональный вывод в форматах STL и GLB",
  },
];

export function RemauraSection() {
  const { t, locale } = useLanguage();

  const convertLabel =
    locale === "en" ? "3D Converter"
    : locale === "de" ? "3D Konverter"
    : locale === "ru" ? "3D Конвертер"
    : "3D Dönüştürücü";

  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">

          {/* Sol: Metin */}
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

            {/* Özellik listesi */}
            <ul className="mt-8 space-y-4">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.06] text-accent dark:border-accent/15 dark:bg-accent/[0.05]">
                    {f.icon}
                  </span>
                  <span className="text-[14px] leading-[1.6] text-muted">
                    {locale === "en" ? f.en : locale === "de" ? f.de : locale === "ru" ? f.ru : f.tr}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA butonları */}
            <div className="mt-10 flex flex-wrap gap-3">
              <RemauraAICtaButton variant="primary">
                {t.remaura.discover}
              </RemauraAICtaButton>
              <Link
                href="/fiyatlandirma"
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:bg-foreground/[0.03]"
              >
                {t.remaura.pricing}
              </Link>
              <Link
                href="/convert"
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:border-accent/40 hover:bg-foreground/[0.03]"
              >
                {convertLabel}
              </Link>
            </div>
          </div>

          {/* Sağ: Görsel panel */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="relative flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card to-surface-alt-2 shadow-[0_8px_40px_rgba(30,28,26,0.06)] dark:border-border/60 dark:from-card/90 dark:to-surface-alt-2 dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">

              {/* Arka plan glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_85%_at_50%_50%,rgba(139,105,20,0.12),transparent_75%)] dark:bg-[radial-gradient(ellipse_85%_85%_at_50%_50%,rgba(201,162,39,0.10),transparent_75%)]" />
              <div className="absolute h-40 w-40 animate-[pulse_4s_ease-in-out_infinite] rounded-full bg-accent/20 blur-3xl dark:bg-accent/15" />

              {/* Merkez yıldız */}
              <span className="relative z-10 text-7xl text-accent/50 sm:text-8xl dark:text-accent/40">✦</span>

              {/* Köşe detayları — mini özellik rozetleri */}
              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm dark:border-border/50 dark:bg-card/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium text-muted">AI Görsel</span>
              </div>

              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm dark:border-border/50 dark:bg-card/60">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-[11px] font-medium text-muted">STL & GLB</span>
              </div>

              <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 backdrop-blur-sm dark:border-border/50 dark:bg-card/60">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="text-[11px] font-medium text-muted">3D Model</span>
              </div>

              {/* Bağlantı çizgileri — dekoratif */}
              <div className="pointer-events-none absolute inset-0">
                <svg width="100%" height="100%" className="opacity-[0.06]">
                  <line x1="50%" y1="50%" x2="15%" y2="12%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="50%" y1="50%" x2="15%" y2="88%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="50%" y1="50%" x2="85%" y2="88%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
