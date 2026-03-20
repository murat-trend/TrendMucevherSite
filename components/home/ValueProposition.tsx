"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export function ValueProposition() {
  const { t } = useLanguage();
  return (
    <section className="border-y border-border/60 bg-surface-alt-2 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 dark:bg-surface-alt-2">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="section-title">{t.valueProp.title}</h2>
        <p className="section-subtitle mx-auto max-w-2xl">
          {t.valueProp.description}
        </p>
        <div className="mx-auto mt-10 h-px w-20 bg-accent/50" aria-hidden />
      </div>
    </section>
  );
}
