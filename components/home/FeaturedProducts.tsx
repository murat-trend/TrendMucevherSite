"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { type DbProduct3D, mapDbProductToUi } from "@/lib/modeller/supabase";

const featuredModels = [
  { slug: "melek-yuzuk",    name: "Melek Yüzüğü",      price: 1200, tags: ["Yüzük", "Gümüş"], thumbnailUrl: null },
  { slug: "kurt-yuzuk",     name: "Kurt Başı Yüzük",   price: 950,  tags: ["Yüzük", "Altın"], thumbnailUrl: null },
  { slug: "ejderha-kolye",  name: "Ejderha Kolye",     price: 1500, tags: ["Kolye", "Gümüş"], thumbnailUrl: null },
] as const;

export function FeaturedProducts() {
  const { t, locale } = useLanguage();
  const [storedModels, setStoredModels] = useState<ReturnType<typeof mapDbProductToUi>[]>([]);

  useEffect(() => {
    let alive = true;
    const loadModels = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products_3d")
        .select("*")
        .eq("is_published", true)
        .eq("show_on_home", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) {
        console.error("[featured] supabase error", error);
        if (alive) setStoredModels([]);
        return;
      }
      if (!alive) return;
      setStoredModels(((data ?? []) as DbProduct3D[]).map(mapDbProductToUi));
    };
    void loadModels();
    return () => { alive = false; };
  }, []);

  const localeMap: Record<string, string> = {
    tr: "tr-TR", en: "en-US", de: "de-DE", ru: "ru-RU",
  };

  const inspectLabel =
    locale === "en" ? "Review"
    : locale === "de" ? "Ansehen"
    : locale === "ru" ? "Открыть"
    : "İncele";

  const typeLabel = (type: ReturnType<typeof mapDbProductToUi>["jewelryType"]) => {
    if (locale === "en") return type === "Kolye" ? "Pendant" : type === "Bilezik" ? "Bracelet" : type === "Küpe" ? "Earring" : type;
    if (locale === "de") return type === "Kolye" ? "Anhänger" : type === "Bilezik" ? "Armband" : type === "Küpe" ? "Ohrring" : type;
    if (locale === "ru") return type === "Kolye" ? "Кулон" : type === "Bilezik" ? "Браслет" : type === "Küpe" ? "Серьга" : type;
    return type;
  };

  // Supabase'den gelen ürünler — thumbnailUrl dahil
  const featuredFromStorage = storedModels.map((m) => ({
    slug: m.slug,
    name: m.name,
    price: m.price,
    tags: [typeLabel(m.jewelryType)],
    thumbnailUrl: m.thumbnailUrl ?? m.thumbnailViews?.on ?? null,
  }));

  const cards = featuredFromStorage.length > 0 ? featuredFromStorage : featuredModels;

  return (
    <section className="border-t border-border/60 bg-surface-alt-3 px-4 py-24 sm:px-6 lg:px-8 dark:bg-surface-alt-2">
      <div className="mx-auto max-w-6xl">

        {/* Başlık */}
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

        {/* Kartlar */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {cards.map((model) => (
            <Link
              key={model.slug}
              href={`/modeller/${model.slug}`}
              className="group overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_3px_rgba(30,28,26,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_16px_48px_rgba(30,28,26,0.10)] dark:border-border dark:shadow-none dark:hover:border-accent/30 dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.25)]"
            >
              {/* Görsel alanı */}
              <div className="relative aspect-[3/4] overflow-hidden bg-surface-alt-2 dark:bg-foreground/[0.04]">
                {model.thumbnailUrl ? (
                  <>
                    <Image
                      src={model.thumbnailUrl}
                      alt={model.name}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </>
                ) : (
                  /* Görsel yoksa zarif placeholder */
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <div className="h-16 w-16 rounded-full border border-foreground/20 bg-gradient-to-br from-foreground/10 to-transparent" />
                      <span className="text-[10px] tracking-[0.15em] text-muted">GÖRSEL YOK</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Kart bilgileri */}
              <div className="border-t border-border/60 px-6 py-5 transition-colors duration-200 dark:border-border/50">
                <div className="mb-3 flex flex-wrap gap-2">
                  {model.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-display text-lg font-medium tracking-[-0.01em] text-foreground transition-colors duration-200 group-hover:text-accent">
                  {model.name}
                </h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-xl text-accent">
                    ₺{model.price.toLocaleString(localeMap[locale] ?? "tr-TR")}
                  </span>
                  <span className="text-[12px] font-medium tracking-[0.08em] text-accent transition-all duration-300 group-hover:tracking-[0.1em]">
                    {inspectLabel} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
