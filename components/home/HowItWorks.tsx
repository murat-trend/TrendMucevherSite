"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

const STEPS = [
  { step: "01", key: "step1" as const },
  { step: "02", key: "step2" as const },
  { step: "03", key: "step3" as const },
];

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border/60 bg-surface-alt-3 px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt-3">
      <div className="mx-auto max-w-4xl">

        {/* Başlık */}
        <h2 className="section-title text-center">{t.howItWorks.title}</h2>
        <p className="section-subtitle mx-auto max-w-xl text-center">
          {t.howItWorks.subtitle}
        </p>

        {/* Adımlar */}
        <div className="mt-20 space-y-0">
          {STEPS.map((item, i) => (
            <div key={item.step} className="relative flex gap-8 sm:gap-12">

              {/* Sol: Numara + dikey çizgi */}
              <div className="flex flex-col items-center">
                {/* Numara dairesi */}
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.06] dark:border-accent/20 dark:bg-accent/[0.05]">
                  <span className="font-display text-base font-medium text-accent">
                    {item.step}
                  </span>
                </div>
                {/* Bağlantı çizgisi — son adımda yok */}
                {i < STEPS.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-gradient-to-b from-accent/30 to-accent/10" />
                )}
              </div>

              {/* Sağ: İçerik */}
              <div className={`flex-1 pb-12 pt-2 ${i === STEPS.length - 1 ? "pb-0" : ""}`}>
                <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-foreground sm:text-2xl">
                  {t.howItWorks[item.key]}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.75] text-muted">
                  {item.key === "step1" && t.howItWorks.step1Desc}
                  {item.key === "step2" && t.howItWorks.step2Desc}
                  {item.key === "step3" && t.howItWorks.step3Desc}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
