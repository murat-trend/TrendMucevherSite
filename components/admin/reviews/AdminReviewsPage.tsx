"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import type { AdminReviewRow } from "@/app/api/admin/reviews/route";
import { Loader2, MessageSquareQuote, RefreshCw, Search, Star, Trash2 } from "lucide-react";

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function clampRating(n: number | null | undefined): number {
  const v = Math.round(Number(n ?? 0));
  if (!Number.isFinite(v)) return 0;
  return Math.min(5, Math.max(0, v));
}

function StarRow({ rating }: { rating: number }) {
  const r = clampRating(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${r} üzerinden 5 yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < r ? "fill-amber-400/90 text-amber-400/90" : "text-zinc-600"}`}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1.5 tabular-nums text-xs text-zinc-400">{r}</span>
    </div>
  );
}

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/reviews", { credentials: "include" });
      const data = (await res.json()) as { reviews?: AdminReviewRow[]; error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Yorumlar yüklenemedi.");
        setReviews([]);
        return;
      }
      setReviews(data.reviews ?? []);
    } catch {
      setLoadError("Ağ hatası.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      const rNum = clampRating(r.rating);
      const starOk =
        ratingFilter === "all" || String(rNum) === ratingFilter;
      const text = `${r.product_title} ${r.comment ?? ""}`.toLowerCase();
      const searchOk = !q || text.includes(q);
      return starOk && searchOk;
    });
  }, [reviews, search, ratingFilter]);

  const kpi = useMemo(() => {
    const n = reviews.length;
    if (n === 0) {
      return {
        total: 0,
        avg: 0,
        five: 0,
        low: 0,
      };
    }
    let sum = 0;
    let five = 0;
    let low = 0;
    for (const r of reviews) {
      const rv = clampRating(r.rating);
      sum += rv;
      if (rv === 5) five += 1;
      if (rv === 1 || rv === 2) low += 1;
    }
    return {
      total: n,
      avg: sum / n,
      five,
      low,
    };
  }, [reviews]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu yorumu kalıcı olarak silmek istiyor musunuz?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Silinemedi.");
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      window.alert("Ağ hatası.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Değerlendirmeler</h1>
          <p className="mt-1 text-sm text-zinc-500">Son 200 yorum — ürün ve alıcı bilgisi Supabase ile zenginleştirildi.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.18]"
        >
          <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
          Yenile
        </button>
      </header>

      {loadError && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{loadError}</div>
      )}

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Toplam yorum"
          value={String(kpi.total)}
          sub="Yüklenen kayıt"
          icon={MessageSquareQuote}
          tone="info"
        />
        <AdminKpiCard
          label="Ortalama puan"
          value={kpi.total > 0 ? kpi.avg.toFixed(2) : "—"}
          sub="1–5 ölçeği"
          icon={Star}
          tone="revenue"
        />
        <AdminKpiCard
          label="5 yıldız"
          value={String(kpi.five)}
          sub="Tam puan"
          icon={Star}
          tone="positive"
        />
        <AdminKpiCard
          label="1–2 yıldız"
          value={String(kpi.low)}
          sub="Düşük puanlı"
          icon={Star}
          tone="negative"
        />
      </section>

      <section
        aria-label="Filtreler"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="relative lg:col-span-7">
            <label htmlFor="reviews-search" className="sr-only">
              Ara
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              id="reviews-search"
              type="search"
              placeholder="Ürün adı veya yorum metni…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
            />
          </div>
          <div className="lg:col-span-5">
            <label htmlFor="reviews-rating" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Puan
            </label>
            <select
              id="reviews-rating"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
              className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
            >
              <option value="all">Tümü</option>
              <option value="5">5 yıldız</option>
              <option value="4">4 yıldız</option>
              <option value="3">3 yıldız</option>
              <option value="2">2 yıldız</option>
              <option value="1">1 yıldız</option>
            </select>
          </div>
        </div>
      </section>

      <section
        aria-label="Yorum listesi"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Yorumlar</h2>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            {reviews.length === 0 ? "Henüz yorum yok." : "Filtreyle eşleşen yorum yok."}
          </p>
        ) : (
          <AdminDataScroll maxHeightClass="max-h-[min(65vh,560px)]">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Ürün</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Müşteri</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Puan</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Yorum</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                  <th className={`px-3 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`} />
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-white/[0.06]">
                    <td className="max-w-[200px] truncate px-3 py-3 font-medium" title={r.product_title}>
                      {r.product_title}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-3 text-zinc-400" title={r.buyer_display}>
                      {r.buyer_display}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <StarRow rating={clampRating(r.rating)} />
                    </td>
                    <td className="max-w-[min(360px,40vw)] px-3 py-3">
                      <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300" title={r.comment ?? ""}>
                        {r.comment?.trim() ? r.comment : "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-xs text-zinc-400">{dateFmt(r.created_at)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-rose-200/95 transition-colors hover:border-rose-400/45 hover:bg-rose-500/[0.14] disabled:opacity-50"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminDataScroll>
        )}
      </section>
    </div>
  );
}
