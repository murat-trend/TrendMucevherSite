"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const PATHWAYS = [
  {
    href: "/urunler",
    titleKey: "products" as const,
    descKey: "productsDesc" as const,
    ctaKey: "productsCta" as const,
  },
  {
    href: "/ozel-siparis",
    titleKey: "customOrder" as const,
    descKey: "customOrderDesc" as const,
    ctaKey: "customOrderCta" as const,
  },
  {
    href: "/remaura",
    titleKey: "remaura" as const,
    descKey: "remauraDesc" as const,
    ctaKey: "remauraCta" as const,
  },
];

export function PathwaysSection() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-20 sm:px-6 sm:py-24 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {PATHWAYS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group flex flex-col rounded-2xl border border-border/80 bg-card p-8 shadow-[0_1px_3px_rgba(30,28,26,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_8px_30px_rgba(30,28,26,0.08)] dark:border-border dark:shadow-none dark:hover:border-accent/40 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] sm:p-9"
            >
              <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-foreground sm:text-[1.35rem]">
                {t.pathways[path.titleKey]}
              </h3>
              <p className="mt-4 flex-1 text-[14px] leading-[1.7] text-muted">
                {t.pathways[path.descKey]}
              </p>
              <span className="mt-6 inline-flex items-center text-[13px] font-medium tracking-[0.03em] text-accent transition-all duration-300 group-hover:tracking-[0.05em]">
                {t.pathways[path.ctaKey]}
                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
