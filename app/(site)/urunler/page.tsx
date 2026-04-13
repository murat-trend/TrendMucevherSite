"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function UrunlerPage() {
  const { t } = useLanguage();
  const p = t.products;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{p.subtitle}</p>

      <div className="mt-8 flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{p.filterAll}</span>
          <select
            className="min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            defaultValue="all"
            aria-label={p.filterAll}
          >
            <option value="all">{p.filterAll}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{p.sortLabel}</span>
          <select
            className="min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            defaultValue="newest"
            aria-label={p.sortLabel}
          >
            <option value="newest">{p.sortNewest}</option>
            <option value="price">{p.sortPrice}</option>
          </select>
        </label>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/modeller" className="text-[#c9a84c] underline-offset-4 hover:underline">
          {p.ctaModels}
        </Link>
      </p>
    </main>
  );
}
