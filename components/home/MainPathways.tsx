"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const PATHWAYS = [
  { href: "/urunler", key: "shop" as const, icon: "◆" },
  { href: "/ozel-siparis", key: "customOrder" as const, icon: "◇" },
  { href: "/satici-ol", key: "sell" as const, icon: "▣" },
  { href: "/remaura", key: "remaura" as const, icon: "✦" },
];

export function MainPathways() {
  const { t } = useLanguage();
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
            {t.pathways.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] text-muted">
            {t.pathways.subtitle}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PATHWAYS.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:shadow-lg"
            >
              <span className="mb-4 text-2xl text-accent">{path.icon}</span>
              <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent">
                {t.pathways[path.key]}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted">
                {path.key === "shop" && t.pathways.shopDesc}
                {path.key === "customOrder" && t.pathways.customOrderDesc}
                {path.key === "sell" && t.pathways.sellDesc}
                {path.key === "remaura" && t.pathways.remauraDesc}
              </p>
              <span className="mt-4 text-sm font-medium text-accent">
                {t.pathways.explore} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
