"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { recordZeroResultSearch } from "@/lib/search/zero-result-searches";

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
          placeholder="Ürün veya anahtar kelime ara…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none ring-[var(--accent)]/25 focus:ring-2"
          aria-label="Ürün ara"
        />
      </div>
      {debounced && results.length === 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-[var(--foreground)]">
          &quot;{debounced}&quot; için sonuç bulunamadı. Bu sorgu yönetim panelinde &quot;Sonuç vermeyen aramalar&quot;
          listesine kaydedilir.
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
        Demo arama — canlı sitede aynı kayıt, gerçek ürün verisiyle çalışır.
      </p>
    </div>
  );
}
