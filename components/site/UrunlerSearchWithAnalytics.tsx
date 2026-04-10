"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { recordZeroResultSearch } from "@/lib/search/zero-result-searches";
import { useLanguage } from "@/components/i18n/LanguageProvider";

/** Örnek katalog — gerçek API bağlanınca aynı mantık kullanılabilir */
const MOCK_PRODUCTS = [
  { id: "1", name: "Altın Minimal Yüzük — Halo", tags: ["altın", "yüzük", "minimal"] },
  { id: "2", name: "İnci Kolye — Luna", tags: ["inci", "kolye"] },
  { id: "3", name: "Pırlanta Küpe — Solstice", tags: ["pırlanta", "küpe"] },
];

function matches(query: string, product: (typeof MOCK_PRODUCTS)[0]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  return product.tags.some((t) => t.includes(q) || q.includes(t));
}

export function UrunlerSearchWithAnalytics() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          placeholder: "Search product or keyword…",
          ariaLabel: "Search products",
          noResult: "No results found for",
          noResultTail: 'This query is saved in admin under "Zero-result searches".',
          demo: "Demo search — in production this uses real product data.",
        }
      : locale === "de"
        ? {
            placeholder: "Produkt oder Schlüsselwort suchen…",
            ariaLabel: "Produkte suchen",
            noResult: "Keine Ergebnisse für",
            noResultTail: 'Diese Anfrage wird im Adminbereich unter "Suchanfragen ohne Ergebnis" gespeichert.',
            demo: "Demo-Suche — in der Live-Version wird mit echten Produktdaten gearbeitet.",
          }
        : locale === "ru"
          ? {
              placeholder: "Поиск товара или ключевого слова…",
              ariaLabel: "Поиск товаров",
              noResult: "Ничего не найдено по запросу",
              noResultTail: 'Этот запрос сохраняется в админке в разделе "Поиски без результата".',
              demo: "Демо-поиск — на живом сайте будет использоваться реальный каталог товаров.",
            }
          : {
              placeholder: "Ürün veya anahtar kelime ara…",
              ariaLabel: "Ürün ara",
              noResult: "için sonuç bulunamadı.",
              noResultTail: 'Bu sorgu yönetim panelinde "Sonuç vermeyen aramalar" listesine kaydedilir.',
              demo: "Demo arama — canlı sitede aynı kayıt, gerçek ürün verisiyle çalışır.",
            };
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 400);
    return () => window.clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    if (!debounced) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter((p) => matches(debounced, p));
  }, [debounced]);

  useEffect(() => {
    if (!debounced) return;
    if (results.length > 0) return;
    recordZeroResultSearch(debounced);
  }, [debounced, results.length]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.placeholder}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/25 focus:ring-2"
          aria-label={copy.ariaLabel}
        />
      </div>
      {debounced && results.length === 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-[var(--foreground)]">
          {locale === "tr" ? (
            <>
              &quot;{debounced}&quot; {copy.noResult} {copy.noResultTail}
            </>
          ) : (
            <>
              {copy.noResult} &quot;{debounced}&quot;. {copy.noResultTail}
            </>
          )}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {(debounced ? results : MOCK_PRODUCTS).map((p) => (
          <li key={p.id} className="px-4 py-3 text-sm text-[var(--foreground)]">
            {p.name}
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-[var(--muted)]">
        {copy.demo}
      </p>
    </div>
  );
}
