"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import type { AdminCustomerRow } from "@/app/api/admin/customers/route";
import { Download, Loader2, RefreshCw, Search, Users } from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function AdminCustomersPage() {
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [scannedOrders, setScannedOrders] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/customers", { credentials: "include" });
      const data = (await res.json()) as { customers?: AdminCustomerRow[]; scanned_orders?: number; error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Müşteriler yüklenemedi.");
        setRows([]);
        setScannedOrders(null);
        return;
      }
      setRows(data.customers ?? []);
      setScannedOrders(typeof data.scanned_orders === "number" ? data.scanned_orders : null);
    } catch {
      setLoadError("Ağ hatası.");
      setRows([]);
      setScannedOrders(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.buyer_id, r.display_name, r.email, r.profile_store_name ?? ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const totalPaidTry = useMemo(
    () => filtered.reduce((s, r) => s + (Number.isFinite(r.paid_total_try) ? r.paid_total_try : 0), 0),
    [filtered],
  );
  const totalOrders = useMemo(() => filtered.reduce((s, r) => s + r.order_count, 0), [filtered]);

  const exportCsv = () => {
    const headers = ["AliciId", "Ad", "Eposta", "SiparisSayisi", "OdenenSiparis", "OdenenToplamTRY", "SonSiparis", "ProfilMagaza"];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          csvEscape(r.buyer_id),
          csvEscape(r.display_name),
          csvEscape(r.email),
          csvEscape(String(r.order_count)),
          csvEscape(String(r.paid_order_count)),
          csvEscape(String(r.paid_total_try)),
          csvEscape(r.last_order_at),
          csvEscape(r.profile_store_name ?? ""),
        ].join(","),
      ),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Müşteri listesi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sipariş veren alıcılar; son {scannedOrders != null ? `${scannedOrders.toLocaleString("tr-TR")} ` : ""}
            sipariş kaydına göre gruplanır (en fazla {8000} satır taranır). Profilde mağaza adı varsa isim yanında kullanılır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.18]"
          >
            <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Yenile
          </button>
          <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" strokeWidth={1.5} />
            CSV dışa aktar
          </button>
        </div>
      </header>

      {loadError && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{loadError}</div>
      )}

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminKpiCard
          label="Benzersiz alıcı"
          value={String(filtered.length)}
          sub={search.trim() ? "Filtre sonrası" : "Siparişi olan kullanıcı"}
          icon={Users}
          tone="info"
        />
        <AdminKpiCard
          label="Sipariş (görünen)"
          value={String(totalOrders)}
          sub="Satır sipariş adedi toplamı"
          icon={Users}
          tone="neutral"
        />
        <AdminKpiCard
          label="Ödenen ciro (görünen)"
          value={tryFmt(totalPaidTry)}
          sub="paid siparişlerin tutar toplamı"
          icon={Users}
          tone="revenue"
        />
      </section>

      <section
        aria-label="Arama"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="relative max-w-xl">
          <label htmlFor="customers-search" className="sr-only">
            Ara
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
          <input
            id="customers-search"
            type="search"
            placeholder="Ad, e-posta, kullanıcı id veya mağaza adı…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
          />
        </div>
      </section>

      <section
        aria-label="Müşteri tablosu"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Alıcılar</h2>
          <Link href="/admin/orders" className="text-xs font-medium text-[#c69575] underline-offset-2 hover:underline">
            Siparişlere git
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            {rows.length === 0 ? "Henüz sipariş kaydından alıcı çıkarılamadı." : "Aramanızla eşleşen kayıt yok."}
          </p>
        ) : (
          <AdminDataScroll maxHeightClass="max-h-[min(65vh,560px)]">
            <table className="w-full min-w-[920px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Müşteri</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>E-posta</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Profil mağaza</th>
                  <th className={`px-3 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Sipariş</th>
                  <th className={`px-3 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Ödenen</th>
                  <th className={`px-3 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Ödenen toplam</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Son sipariş</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Kullanıcı</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {filtered.map((r) => (
                  <tr key={r.buyer_id} className="border-t border-white/[0.06]">
                    <td className="max-w-[200px] truncate px-3 py-3 font-medium" title={r.display_name}>
                      {r.display_name}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-xs text-zinc-400" title={r.email}>
                      {r.email}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-3 text-zinc-400" title={r.profile_store_name ?? ""}>
                      {r.profile_store_name?.trim() ? r.profile_store_name : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{r.order_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-400">{r.paid_order_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{tryFmt(r.paid_total_try)}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-zinc-400">{dateFmt(r.last_order_at)}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[11px] text-zinc-500" title={r.buyer_id}>
                        {r.buyer_id.slice(0, 8)}…
                      </span>
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
