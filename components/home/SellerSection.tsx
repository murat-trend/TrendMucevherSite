"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function SellerSection() {
  const { t } = useLanguage();
  return (
    <section className="border-t border-border/60 bg-surface-alt-2 px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt-2">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <div className="aspect-[4/3] rounded-2xl border border-border/70 bg-surface-alt shadow-[0_2px_8px_rgba(30,28,26,0.04)] dark:border-border dark:bg-foreground/[0.04] dark:shadow-none" />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="section-title">{t.seller.title}</h2>
            <p className="section-subtitle max-w-lg">{t.seller.description}</p>
            <ul className="mt-8 space-y-4">
              {[t.seller.item1, t.seller.item2, t.seller.item3].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[14px] leading-[1.6] text-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent/10 text-[10px] font-medium text-accent">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/satici-ol"
              className="mt-10 inline-block rounded-full border border-accent/80 bg-accent/10 px-8 py-3.5 text-sm font-medium text-accent transition-all duration-300 hover:bg-accent hover:text-accent-foreground"
            >
              {t.seller.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
