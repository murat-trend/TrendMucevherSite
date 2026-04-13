"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export function FAQSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-border/60 bg-surface-alt-2 px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt-2">
      <div className="mx-auto max-w-2xl">
        <h2 className="section-title text-center">{t.home.faqTitle}</h2>

        <div className="mt-16 space-y-3">
          {FAQ_KEYS.map((key, index) => (
            <div
              key={key}
              className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_3px_rgba(30,28,26,0.03)] transition-all duration-300 dark:border-border dark:shadow-none"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-surface-alt/60 dark:hover:bg-foreground/[0.02]"
              >
                <span className="text-[15px] font-medium leading-snug text-foreground">
                  {t.faq[key]}
                </span>
                <span
                  className={`ml-2 shrink-0 text-muted transition-transform duration-300 ease-out ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border/80 px-6 py-5">
                    <p className="text-[14px] leading-[1.7] text-muted">
                      {t.faq[`a${key.slice(1)}` as keyof typeof t.faq]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
