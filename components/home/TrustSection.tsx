"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

const TRUST_KEYS = [
  {
    titleKey: "craft" as const,
    descKey: "craftDesc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L9.5 8.5H3l5.5 4-2 6.5L12 15l5.5 4-2-6.5L21 8.5h-6.5Z" />
      </svg>
    ),
  },
  {
    titleKey: "quality" as const,
    descKey: "qualityDesc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    titleKey: "payment" as const,
    descKey: "paymentDesc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h2M10 15h4" />
      </svg>
    ),
  },
];

export function TrustSection() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">

        {/* Başlık */}
        <h2 className="section-title text-center">{t.trust.title}</h2>
        <p className="section-subtitle mx-auto max-w-xl text-center">
          {t.trust.subtitle}
        </p>

        {/* Kartlar */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3 lg:gap-8">
          {TRUST_KEYS.map((item, i) => (
            <div
              key={item.titleKey}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-8 text-center shadow-[0_1px_3px_rgba(30,28,26,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(30,28,26,0.08)] dark:border-border dark:shadow-none dark:hover:border-accent/25 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
            >
              {/* Arka plan hover efekti */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* İkon */}
              <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.06] text-accent transition-colors duration-300 group-hover:border-accent/30 group-hover:bg-accent/[0.09] dark:border-accent/15 dark:bg-accent/[0.05]">
                {item.icon}
              </div>

              {/* Başlık */}
              <h3 className="font-display text-lg font-medium tracking-[-0.02em] text-foreground">
                {t.trust[item.titleKey]}
              </h3>

              {/* Açıklama */}
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                {t.trust[item.descKey]}
              </p>

              {/* Alt ince accent çizgisi */}
              <div className="mx-auto mt-6 h-px w-8 bg-accent/20 transition-all duration-300 group-hover:w-14 group-hover:bg-accent/40" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
