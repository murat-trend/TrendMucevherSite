"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import type { AdminOrderRow } from "@/app/api/admin/orders/route";
import { Download, Loader2, Package, RefreshCw, Search, Truck } from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function hasDownloadToken(row: AdminOrderRow): boolean {
  return typeof row.download_token === "string" && row.download_token.trim().length > 0;
}

function licenseLabel(raw: string | null | undefined): string {
  const s = (raw ?? "").toLowerCase();
  if (s === "commercial") return "Ticari";
  if (s === "personal") return "Kişisel";
  return raw && raw.trim() !== "" ? raw : "—";
}

export function AdminShippingPage() {
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/orders?payment_status=paid", { credentials: "include" });
      const data = (await res.json()) as { orders?: AdminOrderRow[]; error?: string };
      if (!res.ok) {
        setLoadError(data.error ?? "Siparişler yüklenemedi.");
        setRows([]);
        return;
      }
      setRows(data.orders ?? []);
    } catch {
      setLoadError("Ağ hatası.");
      setRows([]);
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
      const orderNo = r.id.length >= 8 ? r.id.slice(0, 8) : r.id;
      const email = typeof r.customer_email === "string" ? r.customer_email : "";
      const hay = [
        orderNo,
        r.id,
        r.buyer_name,
        r.seller_name,
        r.product_title,
        r.customer_name ?? "",
        r.product_name ?? "",
        email,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const withToken = useMemo(() => filtered.filter((r) => hasDownloadToken(r)).length, [filtered]);
  const totalTry = useMemo(
    () => filtered.reduce((s, r) => s + (Number.isFinite(Number(r.amount)) ? Number(r.amount) : 0), 0),
    [filtered],
  );

  const exportCsv = () => {
    const headers = [
      "SiparisNo",
      "SiparisId",
      "Tarih",
      "Musteri",
      "Eposta",
      "Satici",
      "Urun",
      "Lisans",
      "Tutar",
      "IndirmeTokeniVar",
    ];
    const lines = [
      headers.join(","),
      ...filtered.map((r) => {
        const orderNo = r.id.length >= 8 ? r.id.slice(0, 8) : r.id;
        return [
          csvEscape(orderNo),
          csvEscape(r.id),
          csvEscape(r.created_at),
          csvEscape(r.buyer_name),
          csvEscape(typeof r.customer_email === "string" ? r.customer_email : ""),
          csvEscape(r.seller_name),
          csvEscape(r.product_title),
          csvEscape(licenseLabel(r.license_type)),
          csvEscape(String(r.amount ?? "")),
          csvEscape(hasDownloadToken(r) ? "evet" : "hayir"),
        ].join(",");
      }),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teslimat-odenmis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Kargo &amp; teslimat</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="text-zinc-400">payment_status = paid</span> siparişler (dijital ürün: indirme token durumu). Fiziksel kargo
            takip numarası için veritabanına alan eklendiğinde bu ekran genişletilebilir.
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

      <section aria-label="Teslimat özeti" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AdminKpiCard
          label="Ödenmiş sipariş"
          value={String(filtered.length)}
          sub={search.trim() ? "Filtre sonrası (max 200)" : "Liste (max 200)"}
          icon={Truck}
          tone="info"
        />
        <AdminKpiCard
          label="İndirme linki oluşmuş"
          value={String(withToken)}
          sub="download_token dolu kayıt"
          icon={Package}
          tone="positive"
        />
        <AdminKpiCard
          label={search.trim() ? "Tutar (filtre)" : "Ciro (liste)"}
          value={tryFmt(totalTry)}
          sub="TRY — görünen satırlar"
          icon={Truck}
          tone="neutral"
        />
      </section>

      <section
        aria-label="Arama"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="relative max-w-xl">
          <label htmlFor="shipping-search" className="sr-only">
            Ara
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
          <input
            id="shipping-search"
            type="search"
            placeholder="Sipariş no, müşteri, e-posta, satıcı veya ürün…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
          />
        </div>
      </section>

      <section
        aria-label="Ödenmiş sipariş listesi"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Teslime hazır (ödeme alındı)</h2>
          <Link href="/admin/orders" className="text-xs font-medium text-[#c69575] underline-offset-2 hover:underline">
            Tüm siparişler
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            {rows.length === 0 ? "Ödenmiş sipariş yok." : "Aramanızla eşleşen kayıt yok."}
          </p>
        ) : (
          <AdminDataScroll maxHeightClass="max-h-[min(65vh,560px)]">
            <table className="w-full min-w-[1020px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>No</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Tarih</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Müşteri</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>E-posta</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Ürün</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>Lisans</th>
                  <th className={`px-3 py-3 text-right ${ADMIN_TABLE_TH_STICKY}`}>Tutar</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`}>İndirme</th>
                  <th className={`px-3 py-3 ${ADMIN_TABLE_TH_STICKY}`} />
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {filtered.map((r) => {
                  const orderNo = r.id.length >= 8 ? r.id.slice(0, 8) : r.id;
                  const amt = Number(r.amount ?? 0);
                  const tokenOk = hasDownloadToken(r);
                  const email = typeof r.customer_email === "string" ? r.customer_email.trim() : "";
                  return (
                    <tr key={r.id} className="border-t border-white/[0.06]">
                      <td className="px-3 py-3 font-mono text-xs text-zinc-400">{orderNo}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-400">{dateFmt(r.created_at)}</td>
                      <td className="max-w-[140px] truncate px-3 py-3" title={r.buyer_name}>
                        {r.buyer_name}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-xs text-zinc-400" title={email}>
                        {email || "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-3" title={r.seller_name}>
                        {r.seller_name}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-3" title={r.product_title}>
                        {r.product_title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-400">{licenseLabel(r.license_type)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{tryFmt(Number.isFinite(amt) ? amt : 0)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            tokenOk
                              ? "inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300/90"
                              : "inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200/90"
                          }
                        >
                          {tokenOk ? "Token var" : "Token yok"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/orders/${encodeURIComponent(r.id)}`}
                          className="text-xs font-medium text-[#c69575] underline-offset-2 hover:underline"
                        >
                          Detay
                        </Link>
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
