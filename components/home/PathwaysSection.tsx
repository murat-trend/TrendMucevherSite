"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const PATHWAYS = [
  {
    href: "/modeller",
    titleKey: "products" as const,
    descKey: "productsDesc" as const,
    ctaKey: "productsCta" as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    featured: false,
  },
  {
    href: "/ozel-siparis",
    titleKey: "customOrder" as const,
    descKey: "customOrderDesc" as const,
    ctaKey: "customOrderCta" as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    featured: false,
  },
  {
    href: "/remaura",
    titleKey: "remaura" as const,
    descKey: "remauraDesc" as const,
    ctaKey: "remauraCta" as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
      </svg>
    ),
    featured: true,
  },
];

export function PathwaysSection() {
  const { t } = useLanguage();

  return (
    <section className="border-t border-border/60 bg-surface-alt px-4 py-20 sm:px-6 sm:py-24 lg:px-8 dark:bg-surface-alt">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {PATHWAYS.map((path, i) => (
            <Link
              key={path.href}
              href={path.href}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-300 ease-out hover:-translate-y-1 sm:p-9 ${
                path.featured
                  ? "border-accent/30 bg-gradient-to-br from-accent/[0.06] via-card to-card shadow-[0_2px_20px_rgba(201,162,39,0.08)] hover:border-accent/50 hover:shadow-[0_12px_40px_rgba(201,162,39,0.12)] dark:from-accent/[0.08] dark:via-card dark:to-card dark:shadow-[0_2px_20px_rgba(201,162,39,0.06)] dark:hover:shadow-[0_12px_40px_rgba(201,162,39,0.10)]"
                  : "border-border/80 bg-card shadow-[0_1px_3px_rgba(30,28,26,0.04)] hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(30,28,26,0.08)] dark:border-border dark:shadow-none dark:hover:border-accent/25 dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
              }`}
            >
              {/* Sıra numarası */}
              <span className="absolute right-6 top-6 font-display text-[11px] tracking-[0.12em] text-muted/30">
                0{i + 1}
              </span>

              {/* İkon */}
              <div className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl border transition-colors duration-300 ${
                path.featured
                  ? "border-accent/30 bg-accent/10 text-accent group-hover:bg-accent/15 dark:border-accent/25 dark:bg-accent/[0.08]"
                  : "border-border/80 bg-surface-alt text-muted group-hover:border-accent/30 group-hover:text-accent dark:border-border dark:bg-foreground/[0.04]"
              }`}>
                {path.icon}
              </div>

              {/* Başlık */}
              <h3 className={`font-display text-xl font-medium tracking-[-0.02em] sm:text-[1.35rem] ${
                path.featured ? "text-accent" : "text-foreground"
              }`}>
                {t.pathways[path.titleKey]}
              </h3>

              {/* Açıklama */}
              <p className="mt-4 flex-1 text-[14px] leading-[1.75] text-muted">
                {t.pathways[path.descKey]}
              </p>

              {/* CTA */}
              <span className={`mt-7 inline-flex items-center gap-2 text-[13px] font-medium tracking-[0.03em] transition-all duration-300 group-hover:gap-3 ${
                path.featured ? "text-accent" : "text-accent/80 group-hover:text-accent"
              }`}>
                {t.pathways[path.ctaKey]}
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
              </span>

              {/* Featured arka plan efekti */}
              {path.featured && (
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/[0.06] blur-2xl" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
