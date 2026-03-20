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
        <h2 className="section-title text-center">{t.howItWorks.title}</h2>
        <p className="section-subtitle mx-auto max-w-xl text-center">
          {t.howItWorks.subtitle}
        </p>

        <div className="relative mt-20">
          {/* Vertical connector line 01 → 02 → 03 */}
          <div className="absolute left-[0.6rem] top-4 bottom-4 w-px bg-gradient-to-b from-accent/55 via-accent/40 to-accent/55 sm:left-8 md:left-8" />
          <div className="space-y-0">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:gap-10 sm:py-10 md:pl-4"
              >
                <span className="font-display text-3xl font-light text-accent/60 sm:text-4xl">
                  {item.step}
                </span>
                <div className="flex-1 sm:pt-0.5">
                  <h3 className="font-display text-xl font-medium tracking-[-0.01em] text-foreground">
                    {t.howItWorks[item.key]}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted">
                    {item.key === "step1" && t.howItWorks.step1Desc}
                    {item.key === "step2" && t.howItWorks.step2Desc}
                    {item.key === "step3" && t.howItWorks.step3Desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
