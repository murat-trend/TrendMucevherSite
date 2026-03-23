"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import {
  DEMO_ZERO_RESULT_SEARCHES,
  ZERO_RESULT_SEARCHES_STORAGE_KEY,
  mergeZeroResultSearches,
  type ZeroResultSearchEntry,
} from "@/lib/search/zero-result-searches";

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR").format(n);

function formatSeen(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function ZeroResultSearchesPanel() {
  const [storageRows, setStorageRows] = useState<ZeroResultSearchEntry[] | null>(null);

  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem(ZERO_RESULT_SEARCHES_STORAGE_KEY);
        if (!raw) {
          setStorageRows([]);
          return;
        }
        const parsed = JSON.parse(raw) as ZeroResultSearchEntry[];
        setStorageRows(Array.isArray(parsed) ? parsed : []);
      } catch {
        setStorageRows([]);
      }
    };
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, []);

  const rows = useMemo(
    () => mergeZeroResultSearches(storageRows, DEMO_ZERO_RESULT_SEARCHES).slice(0, 10),
    [storageRows],
  );

  return (
    <section
      aria-labelledby="zero-result-searches-heading"
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6"
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200/90">
            <SearchX className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h2 id="zero-result-searches-heading" className="font-display text-lg font-semibold tracking-tight text-zinc-100">
              Sonuç vermeyen aramalar
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Ürün aramasında eşleşme çıkmayan sorgular (demo veri + site ziyaretçilerinden toplanan kayıtlar).
            </p>
          </div>
        </div>
      </div>

      {storageRows === null ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-sm text-zinc-500">
          Henüz kayıt yok.
        </p>
      ) : (
        <div className="min-h-0 w-full max-w-full overflow-hidden rounded-xl border border-white/[0.06]">
          <div
            role="region"
            aria-label="Sonuç vermeyen aramalar listesi"
            className="admin-scrollbar max-h-[220px] min-h-0 overflow-y-scroll overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]"
          >
            <ul className="divide-y divide-white/[0.06] bg-black/20">
              {rows.map((row) => (
                <li key={row.query} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5 sm:px-3.5">
                  <p className="min-w-0 flex-1 text-sm text-zinc-200">
                    <span className="text-zinc-500">&quot;</span>
                    {row.query}
                    <span className="text-zinc-500">&quot;</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-3 text-[11px] tabular-nums text-zinc-500">
                    <span title="Sonuçsuz arama sayısı">
                      <span className="font-semibold text-zinc-400">{numFmt(row.count)}</span>×
                    </span>
                    <span className="hidden sm:inline" title="Son görülme">
                      {formatSeen(row.lastSeenIso)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
