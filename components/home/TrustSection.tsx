"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

const TRUST_KEYS = [
  { titleKey: "craft" as const, descKey: "craftDesc" as const, icon: "◇" },
  { titleKey: "quality" as const, descKey: "qualityDesc" as const, icon: "◆" },
  { titleKey: "payment" as const, descKey: "paymentDesc" as const, icon: "▣" },
];

export function TrustSection() {
  const { t } = useLanguage();
  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">
        <h2 className="section-title text-center">{t.trust.title}</h2>
        <p className="section-subtitle mx-auto max-w-xl text-center">
          {t.trust.subtitle}
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-3 lg:gap-10">
          {TRUST_KEYS.map((item) => (
            <div
              key={item.titleKey}
              className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-[0_1px_3px_rgba(30,28,26,0.04)] transition-all duration-300 hover:border-accent/30 dark:border-border dark:shadow-none dark:hover:border-accent/25"
            >
              <span className="mb-5 inline-block text-[1.5rem] text-accent/70">
                {item.icon}
              </span>
              <h3 className="font-display text-lg font-medium tracking-[-0.02em] text-foreground">
                {t.trust[item.titleKey]}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                {t.trust[item.descKey]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
