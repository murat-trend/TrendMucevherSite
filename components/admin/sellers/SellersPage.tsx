"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Check,
  CircleAlert,
  Eye,
  PauseCircle,
  Plus,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import type { Seller, SellerStatus } from "./types";
import { INITIAL_SELLERS, isHighReturnCount, SELLER_RETURN_WARNING_THRESHOLD } from "./types";
import { SellerStatusBadge } from "./SellerStatusBadge";
import { computeSellerHealthScore, sellerHealthScoreClass } from "@/lib/seller/compute-seller-health-score";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));

type SortKey = "newest" | "sales" | "rating";

export function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SellerStatus>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const summary = useMemo(() => {
    const total = sellers.length;
    const active = sellers.filter((s) => s.status === "active").length;
    const pending = sellers.filter((s) => s.status === "pending").length;
    const suspended = sellers.filter((s) => s.status === "suspended").length;
    return { total, active, pending, suspended };
  }, [sellers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = sellers.filter((s) => {
      const match =
        !q ||
        s.storeName.toLowerCase().includes(q) ||
        s.ownerEmail.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q);
      const statusOk = statusFilter === "all" || s.status === statusFilter;
      return match && statusOk;
    });
    list = [...list].sort((a, b) => {
      if (sort === "newest") return b.registeredAt.localeCompare(a.registeredAt);
      if (sort === "sales") return b.totalSales - a.totalSales;
      if (sort === "rating") return b.rating - a.rating;
      const ha = computeSellerHealthScore({
        returnRate: a.returnRate,
        rating: a.rating,
        orderCount: a.orderCount,
      });
      const hb = computeSellerHealthScore({
        returnRate: b.returnRate,
        rating: b.rating,
        orderCount: b.orderCount,
      });
      return hb - ha;
    });
    return list;
  }, [sellers, search, statusFilter, sort]);

  const updateSeller = useCallback((id: string, patch: Partial<Seller>) => {
    setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSeller = useCallback((id: string) => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleApprove = useCallback(
    (id: string) => {
      updateSeller(id, {
        status: "active",
        rating: 4.5,
      });
    },
    [updateSeller],
  );

  const handleSuspend = useCallback(
    (id: string) => {
      updateSeller(id, { status: "suspended" });
    },
    [updateSeller],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (typeof window !== "undefined" && window.confirm("Bu satıcıyı silmek istediğinize emin misiniz?")) {
        removeSeller(id);
      }
    },
    [removeSeller],
  );

  /** Tamamen engelle — listeden kaldır (API’de ban / soft-delete ile değiştirilebilir) */
  const handleBan = useCallback(
    (id: string, storeName: string) => {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `“${storeName}” satıcısı tamamen engellenecek ve listeden kaldırılacak. Bu işlem geri alınamayabilir. Emin misiniz?`,
        )
      ) {
        removeSeller(id);
      }
    },
    [removeSeller],
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Satıcılar</h1>
          <p className="mt-1 text-sm text-zinc-500">Platformdaki tüm satıcıları yönet</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          Yeni Satıcı Ekle
        </button>
      </header>

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            { label: "Toplam Satıcı", value: summary.total, icon: Store, tone: "neutral" as const },
            { label: "Aktif Satıcı", value: summary.active, icon: Store, tone: "neutral" as const },
            { label: "Bekleyen Başvuru", value: summary.pending, icon: Store, tone: "neutral" as const },
            { label: "Askıya Alınmış", value: summary.suspended, icon: Store, tone: "negative" as const },
          ] as { label: string; value: number; icon: typeof Store; tone: AdminKpiTone }[]
        ).map((card) => (
          <AdminKpiCard key={card.label} label={card.label} value={numFmt(card.value)} icon={card.icon} tone={card.tone} />
        ))}
      </section>

      <section
        aria-label="Filtreler"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <label htmlFor="seller-search" className="sr-only">
              Ara
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              id="seller-search"
              type="search"
              placeholder="Mağaza adı veya e-posta ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 transition-[border,box-shadow] focus:border-[#c69575]/30 focus:ring-2"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-[200px]">
              <label htmlFor="seller-status" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Durum
              </label>
              <select
                id="seller-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 transition-[border,box-shadow] focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="all">Tümü</option>
                <option value="active">Aktif</option>
                <option value="pending">Bekleyen</option>
                <option value="suspended">Askıya Alınmış</option>
              </select>
            </div>
            <div className="min-w-0 flex-1 sm:max-w-[200px]">
              <label htmlFor="seller-sort" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Sırala
              </label>
              <select
                id="seller-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 transition-[border,box-shadow] focus:border-[#c69575]/30 focus:ring-2"
              >
                <option value="newest">En yeni</option>
                <option value="sales">En çok satış</option>
                <option value="rating">En yüksek puan</option>
                <option value="health">En yüksek sağlık puanı</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Satıcı listesi"
        className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      >
        {sellers.length === 0 ? (
          <AdminEmptyState
            message="Henüz satıcı bulunmuyor"
            hint="Yeni satıcı ekleyerek veya başvuruları onaylayarak listeyi doldurabilirsiniz."
            variant="shield"
          />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            message="Sonuç bulunamadı"
            hint="Filtreleri veya arama terimini değiştirmeyi deneyin."
            variant="warning"
          />
        ) : (
          <AdminDataScroll bordered={false}>
            <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-4 py-3.5 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Mağaza Adı</th>
                  <th className={`px-4 py-3.5 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Sahip</th>
                  <th className={`px-4 py-3.5 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                  <th className={`px-4 py-3.5 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Toplam Satış</th>
                  <th className={`px-4 py-3.5 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Puan</th>
                  <th
                    className={`px-4 py-3.5 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}
                    title="Dönem içi iade oranı (sipariş / tutar bazlı özet veri)."
                  >
                    İade %
                  </th>
                  <th
                    className={`px-4 py-3.5 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}
                    title="İade oranı ve müşteri yorum ortalamasından otomatik hesaplanır (0–100)."
                  >
                    Satıcı sağlık puanı
                  </th>
                  <th className={`px-4 py-3.5 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Kayıt Tarihi</th>
                  <th className={`px-4 py-3.5 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Aksiyonlar</th>
                  <th className={`px-4 py-3.5 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((row) => {
                  const health = computeSellerHealthScore({
                    returnRate: row.returnRate,
                    rating: row.rating,
                    orderCount: row.orderCount,
                  });
                  return (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3.5 font-medium text-zinc-100">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate">{row.storeName}</span>
                        {isHighReturnCount(row.returnCount) && (
                          <span
                            className="inline-flex shrink-0 text-rose-500"
                            title={`Yüksek iade: ${row.returnCount} iade (>${SELLER_RETURN_WARNING_THRESHOLD})`}
                          >
                            <CircleAlert className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span className="sr-only">
                              Uyarı: bu satıcının iade sayısı {SELLER_RETURN_WARNING_THRESHOLD} değerini aşıyor
                            </span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-zinc-200">{row.ownerName}</span>
                        <span className="text-xs text-zinc-500">{row.ownerEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <SellerStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-zinc-300">{tryFmt(row.totalSales)}</td>
                    <td className="px-4 py-3.5 tabular-nums text-zinc-300">{row.rating > 0 ? numFmt(row.rating) : "—"}</td>
                    <td
                      className="px-4 py-3.5 tabular-nums text-zinc-300"
                      title={`İade oranı: %${numFmt(row.returnRate)}`}
                    >
                      %{numFmt(row.returnRate)}
                    </td>
                    <td
                      className="px-4 py-3.5 tabular-nums"
                      title={`Otomatik hesap: iade %${numFmt(row.returnRate)} · yorum ort. ${row.rating > 0 ? numFmt(row.rating) : "—"}`}
                    >
                      <span className={`font-semibold ${sellerHealthScoreClass(health)}`}>{health}</span>
                      <span className="text-zinc-600">/100</span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">{dateFmt(row.registeredAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/sellers/${row.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-[#c69575]/25 hover:bg-[#c69575]/10 hover:text-[#f0dcc8]"
                        >
                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                          Görüntüle
                        </Link>
                        {row.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20"
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2} />
                            Onayla
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/18"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          Sil
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-col items-stretch justify-end gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                        {row.status !== "suspended" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                typeof window !== "undefined" &&
                                window.confirm(
                                  `“${row.storeName}” için yeni ürün listelemesi durdurulacak; mevcut siparişler tamamlanabilir. Askıya alınsın mı?`,
                                )
                              ) {
                                handleSuspend(row.id);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400/35 bg-amber-500/[0.12] px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/22"
                          >
                            <PauseCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                            Askıya Al
                          </button>
                        ) : (
                          <span className="text-center text-[11px] text-zinc-600 sm:text-right">Zaten askıda</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBan(row.id, row.storeName)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-500/45 bg-rose-500/[0.14] px-2.5 py-1.5 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/26"
                        >
                          <Ban className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                          Engelle
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminDataScroll>
        )}
      </section>
    </div>
  );
}
