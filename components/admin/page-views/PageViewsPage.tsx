"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye, Globe, Loader2, MapPin, MousePointerClick, RefreshCw } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

const PIE_COLORS = ["#c69575", "#8b9dc3", "#6b9e7d", "#c9a88a", "#a78bfa", "#f472b6", "#94a3b8", "#eab308", "#64748b"];

type PageViewsJson = {
  range?: { days: number; statsFromIso: string; chartFromIso: string };
  totalVisits?: number;
  uniqueIps?: number;
  topPages?: { page_path: string; count: number }[];
  sources?: { source: string; count: number }[];
  countries?: { country: string; count: number }[];
  dailyVisits?: { day: string; count: number }[];
  recentVisits?: {
    ip_address: string | null;
    page_path: string;
    source: string;
    country: string | null;
    created_at: string;
  }[];
  topPageLabel?: string | null;
  topPageCount?: number;
  topSourceLabel?: string | null;
  topSourceCount?: number;
  error?: string | null;
};

function dayTick(isoDay: string) {
  if (isoDay.length < 10) return isoDay;
  return `${isoDay.slice(8, 10)}.${isoDay.slice(5, 7)}`;
}

const COUNTRY_COL = (
  <colgroup>
    <col className="w-[28%]" />
    <col className="w-[18%]" />
  </colgroup>
);

const TOP_PAGES_COL = (
  <colgroup>
    <col className="w-[72%]" />
    <col className="w-[28%]" />
  </colgroup>
);

const RECENT_COL = (
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[32%]" />
    <col className="w-[14%]" />
    <col className="w-[12%]" />
    <col className="w-[24%]" />
  </colgroup>
);

export function PageViewsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<PageViewsJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/page-views?days=${days}`, { credentials: "include" });
      const j = (await res.json()) as PageViewsJson;
      if (!res.ok) {
        setErr((j as { error?: string }).error ?? "Veri alınamadı.");
        setData(null);
        return;
      }
      setData(j);
    } catch {
      setErr("Ağ hatası.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const pieData =
    data?.sources?.map((s) => ({
      name: s.source,
      value: s.count,
    })) ?? [];

  const topPageTitle = data?.topPageLabel ? (data.topPageLabel.length > 36 ? `${data.topPageLabel.slice(0, 36)}…` : data.topPageLabel) : "—";

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Ziyaretçiler</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              <span className="text-zinc-500">page_views</span> tablosu — site geneli izleme ve ürün sayfaları. Grafik son 30 gün; özet
              kartları seçilen döneme göre.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-500">
              Dönem
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
                className="min-w-[10rem] rounded-lg border border-white/[0.12] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c69575]/50"
              >
                <option value={7}>Son 7 gün</option>
                <option value={30}>Son 30 gün</option>
                <option value={90}>Son 90 gün</option>
              </select>
            </label>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-4 w-4" strokeWidth={1.5} />}
              Yenile
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">{err}</div>
        )}

        {data?.error ? (
          <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-100/90">
            Uyarı: {data.error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : (
          <section aria-label="Özet" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminKpiCard
              label="Toplam ziyaret"
              value={numFmt(data?.totalVisits ?? 0)}
              sub={`Seçilen ${days} gün`}
              icon={Eye}
              tone="revenue"
            />
            <AdminKpiCard
              label="Benzersiz IP"
              value={numFmt(data?.uniqueIps ?? 0)}
              sub="ip_address (dolu kayıtlar)"
              icon={Globe}
              tone="neutral"
            />
            <AdminKpiCard
              label="En popüler sayfa"
              value={topPageTitle}
              sub={`${numFmt(data?.topPageCount ?? 0)} görüntülenme`}
              icon={MapPin}
              tone="neutral"
            />
            <AdminKpiCard
              label="En çok kaynak"
              value={data?.topSourceLabel ?? "—"}
              sub={`${numFmt(data?.topSourceCount ?? 0)} ziyaret`}
              icon={MousePointerClick}
              tone="neutral"
            />
          </section>
        )}
      </div>

      {!loading || data ? (
        <>
          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-zinc-100">Günlük ziyaret (son 30 gün)</h2>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.dailyVisits ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={dayTick}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={40} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#14161d",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v) => String(v)}
                  />
                  <Line type="monotone" dataKey="count" name="Ziyaret" stroke="#c69575" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-zinc-100">Trafik kaynakları</h2>
            {pieData.length === 0 ? (
              <p className="text-sm text-zinc-500">Bu dönemde kaynak verisi yok.</p>
            ) : (
              <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-center">
                <div className="h-[260px] w-full max-w-md">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} stroke="none">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#14161d",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <div className="mb-4 border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">En çok ziyaret edilen sayfalar</h2>
              <p className="mt-1 text-xs text-zinc-500">Seçilen dönem — ilk 15</p>
            </div>
            {!data?.topPages?.length ? (
              <p className="text-sm text-zinc-500">Kayıt yok.</p>
            ) : (
              <FinanceScrollTable
                minWidthPx={480}
                colgroup={TOP_PAGES_COL}
                bodyMaxHeightClass="max-h-[280px]"
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>Sayfa</th>
                    <th className={`${FINANCE_TH} text-right tabular-nums`}>Ziyaret</th>
                  </>
                }
                bodyRows={
                  <>
                    {data.topPages.map((p) => (
                      <tr key={p.page_path} className="text-zinc-200">
                        <td className="max-w-0 truncate px-3.5 py-2.5 text-sm text-zinc-300" title={p.page_path}>
                          {p.page_path}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{numFmt(p.count)}</td>
                      </tr>
                    ))}
                  </>
                }
              />
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <div className="mb-4 border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Ülke dağılımı</h2>
              <p className="mt-1 text-xs text-zinc-500">Üretimde Vercel üzerinden country header ile dolar; boşsa &quot;—&quot;</p>
            </div>
            {!data?.countries?.length ? (
              <p className="text-sm text-zinc-500">Kayıt yok.</p>
            ) : (
              <FinanceScrollTable
                minWidthPx={360}
                colgroup={COUNTRY_COL}
                bodyMaxHeightClass="max-h-[280px]"
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>Ülke</th>
                    <th className={`${FINANCE_TH} text-right tabular-nums`}>Ziyaret</th>
                  </>
                }
                bodyRows={
                  <>
                    {data.countries.map((c) => (
                      <tr key={c.country} className="text-zinc-200">
                        <td className="px-3.5 py-2.5 text-sm text-zinc-300">{c.country}</td>
                        <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{numFmt(c.count)}</td>
                      </tr>
                    ))}
                  </>
                }
              />
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <div className="mb-4 border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Son ziyaretler</h2>
              <p className="mt-1 text-xs text-zinc-500">Seçilen dönemde en yeni 50 kayıt</p>
            </div>
            {!data?.recentVisits?.length ? (
              <p className="text-sm text-zinc-500">Kayıt yok.</p>
            ) : (
              <FinanceScrollTable
                minWidthPx={720}
                colgroup={RECENT_COL}
                bodyMaxHeightClass="max-h-[360px]"
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>IP</th>
                    <th className={`${FINANCE_TH} text-left`}>Sayfa</th>
                    <th className={`${FINANCE_TH} text-left`}>Kaynak</th>
                    <th className={`${FINANCE_TH} text-left`}>Ülke</th>
                    <th className={`${FINANCE_TH} text-left`}>Tarih</th>
                  </>
                }
                bodyRows={
                  <>
                    {data.recentVisits.map((r, idx) => (
                      <tr key={`${r.created_at}-${idx}`} className="text-zinc-200">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-zinc-400">{r.ip_address ?? "—"}</td>
                        <td className="max-w-[220px] truncate px-3.5 py-2.5 text-xs text-zinc-300" title={r.page_path}>
                          {r.page_path}
                        </td>
                        <td className="px-3.5 py-2.5 text-sm text-zinc-400">{r.source}</td>
                        <td className="px-3.5 py-2.5 text-sm text-zinc-400">{r.country ?? "—"}</td>
                        <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-zinc-500">
                          {r.created_at ? r.created_at.slice(0, 19).replace("T", " ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </>
                }
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
