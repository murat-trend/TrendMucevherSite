"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const PLACEHOLDER_PRODUCTS = [{ id: 1 }, { id: 2 }, { id: 3 }];

export function FeaturedProducts() {
  const { t } = useLanguage();
  return (
    <section className="border-t border-border/60 bg-surface-alt-3 px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt-2">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2 className="section-title">{t.featured.title}</h2>
            <p className="section-subtitle max-w-md">{t.featured.subtitle}</p>
          </div>
          <Link
            href="/urunler"
            className="text-[13px] font-medium tracking-[0.04em] text-accent transition-all duration-300 hover:tracking-[0.06em] hover:text-accent/90"
          >
            {t.featured.viewAll} →
          </Link>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {PLACEHOLDER_PRODUCTS.map((product) => (
            <Link
              key={product.id}
              href="/urunler"
              className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_3px_rgba(30,28,26,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_40px_rgba(30,28,26,0.08)] dark:border-border dark:shadow-none dark:hover:border-accent/30 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
            >
              {/* Image container - boutique framing */}
              <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt-2 dark:bg-foreground/[0.04]">
                <div className="absolute inset-4 flex items-center justify-center sm:inset-6">
                  <div className="aspect-square w-full max-w-[70%] rounded-full border border-border/60 bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] transition-transform duration-500 ease-out group-hover:scale-[1.04] dark:border-border/50 dark:from-foreground/[0.05] dark:to-transparent" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
              {/* Single minimal label - luxury gallery feel */}
              <div className="border-t border-border/60 px-6 py-5 text-center transition-colors duration-200 dark:border-border/50">
                <h3 className="font-display text-lg font-medium tracking-[-0.01em] text-foreground transition-colors duration-200 group-hover:text-accent">
                  {t.featured.collection}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
