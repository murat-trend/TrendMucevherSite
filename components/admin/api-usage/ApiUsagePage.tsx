"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Cpu, DollarSign, Loader2, RefreshCw, Wallet } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { FinanceScrollTable, FINANCE_TH } from "@/components/admin/finance/FinanceScrollTable";

type ApiUsageJson = {
  range?: { days: number; fromIso: string; toIso: string };
  remauraJobs?: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgDurationMs: number;
    estimatedCostUsdSum: number;
    recent: {
      id: string;
      type: string;
      status: string;
      created_at: string;
      duration_ms: number | null;
      user_id: string | null;
    }[];
    error: string | null;
  };
  billingLedger?: {
    debitsCount: number;
    creditsDebited: number;
    creditsCount: number;
    creditsCredited: number;
    recent: {
      id: string;
      user_id: string;
      amount: number;
      type: string;
      description: string | null;
      created_at: string;
    }[];
    error: string | null;
  };
  error?: string;
};

const JOB_TYPE_TR: Record<string, string> = {
  generate: "Görsel üretim",
  optimize: "Optimize",
  analyze_style: "Stil analizi",
  analyze_jewelry: "Ürün hikayesi",
  unknown: "Diğer",
};

function jobTypeLabel(t: string) {
  return JOB_TYPE_TR[t] ?? t;
}

function statusLabel(s: string) {
  if (s === "ok") return "Tamam";
  if (s === "error") return "Hata";
  return s;
}

const numFmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

const JOB_COL = (
  <colgroup>
    <col className="w-[20%]" />
    <col className="w-[14%]" />
    <col className="w-[12%]" />
    <col className="w-[14%]" />
    <col className="w-[40%]" />
  </colgroup>
);

const LEDGER_COL = (
  <colgroup>
    <col className="w-[18%]" />
    <col className="w-[12%]" />
    <col className="w-[10%]" />
    <col className="w-[12%]" />
    <col className="w-[48%]" />
  </colgroup>
);

export function ApiUsagePage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiUsageJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/api-usage?days=${days}`, { credentials: "include" });
      const j = (await res.json()) as ApiUsageJson;
      if (!res.ok) {
        setErr(j.error ?? "Veri alınamadı.");
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

  const jobs = data?.remauraJobs;
  const led = data?.billingLedger;
  const rangeDays = data?.range?.days ?? days;

  const typeEntries = jobs ? Object.entries(jobs.byType).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-8 pb-10">
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">API kullanımı</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Remaura iş kuyruğu (<span className="text-zinc-500">remaura_jobs</span>) ve kredi hareketleri (
              <span className="text-zinc-500">billing_ledger</span>) — seçilen gün aralığında özetlenir.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-500">
              Dönem (gün)
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="min-w-[8rem] rounded-lg border border-white/[0.12] bg-[#0e1015] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c69575]/50"
              >
                <option value={7}>Son 7 gün</option>
                <option value={30}>Son 30 gün</option>
                <option value={90}>Son 90 gün</option>
                <option value={365}>Son 365 gün</option>
              </select>
            </label>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="h-4 w-4" strokeWidth={1.5} />}
              Yenile
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">
            {err}
          </div>
        )}

        {loading && !data ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" strokeWidth={1.5} />
            Yükleniyor…
          </div>
        ) : (
          <>
            <section aria-label="Özet" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpiCard
                label="Remaura işleri"
                value={numFmt(jobs?.total ?? 0)}
                sub={`Son ${rangeDays} gün · remaura_jobs`}
                icon={Cpu}
                tone="neutral"
              />
              <AdminKpiCard
                label="Ort. süre"
                value={jobs?.avgDurationMs ? `${numFmt(jobs.avgDurationMs)} ms` : "—"}
                sub="Tamamlanan işler (duration_ms)"
                icon={Activity}
                tone="neutral"
              />
              <AdminKpiCard
                label="Tahmini maliyet (USD)"
                value={jobs?.estimatedCostUsdSum != null ? `$${jobs.estimatedCostUsdSum}` : "—"}
                sub="estimated_cost_usd toplamı (yaklaşık)"
                icon={DollarSign}
                tone="neutral"
              />
              <AdminKpiCard
                label="Kredi düşümü"
                value={numFmt(led?.creditsDebited ?? 0)}
                sub={`${numFmt(led?.debitsCount ?? 0)} debit satırı`}
                icon={Wallet}
                tone="revenue"
              />
            </section>

            {(jobs?.error || led?.error) && (
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-100/90">
                {jobs?.error ? <p>remaura_jobs: {jobs.error}</p> : null}
                {led?.error ? <p>billing_ledger: {led.error}</p> : null}
              </div>
            )}
          </>
        )}
      </div>

      {!loading || data ? (
        <>
          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-zinc-100">İş türü dağılımı</h2>
            {typeEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">Bu dönemde kayıt yok.</p>
            ) : (
              <ul className="space-y-2">
                {typeEntries.map(([t, c]) => (
                  <li
                    key={t}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-[#07080a]/80 px-4 py-2.5 text-sm"
                  >
                    <span className="text-zinc-300">{jobTypeLabel(t)}</span>
                    <span className="tabular-nums text-zinc-100">{numFmt(c)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <div className="mb-4 border-b border-white/[0.06] pb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Son işler</h2>
              <p className="mt-1 text-xs text-zinc-500">remaura_jobs — en yeni 40 kayıt</p>
            </div>
            {!jobs?.recent?.length ? (
              <p className="text-sm text-zinc-500">Kayıt yok.</p>
            ) : (
              <FinanceScrollTable
                minWidthPx={640}
                colgroup={JOB_COL}
                bodyMaxHeightClass="max-h-[320px]"
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>Zaman</th>
                    <th className={`${FINANCE_TH} text-left`}>Tür</th>
                    <th className={`${FINANCE_TH} text-left`}>Durum</th>
                    <th className={`${FINANCE_TH} text-right tabular-nums`}>Süre (ms)</th>
                    <th className={`${FINANCE_TH} text-left`}>Kullanıcı</th>
                  </>
                }
                bodyRows={
                  <>
                    {jobs.recent.map((r) => (
                      <tr key={r.id} className="text-zinc-200">
                        <td className="px-3.5 py-2.5 text-xs text-zinc-400">{r.created_at.slice(0, 19).replace("T", " ")}</td>
                        <td className="px-3.5 py-2.5 text-sm text-zinc-200">{jobTypeLabel(r.type)}</td>
                        <td className="px-3.5 py-2.5 text-sm text-zinc-300">{statusLabel(r.status)}</td>
                        <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-300">
                          {r.duration_ms != null ? numFmt(Number(r.duration_ms)) : "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-3.5 py-2.5 font-mono text-[11px] text-zinc-500" title={r.user_id ?? ""}>
                          {r.user_id ? `${r.user_id.slice(0, 8)}…` : "—"}
                        </td>
                      </tr>
                    ))}
                  </>
                }
              />
            )}
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">Kredi defteri</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Yüklenen: {numFmt(led?.creditsCredited ?? 0)} kredi ({numFmt(led?.creditsCount ?? 0)} credit) · Düşen:{" "}
                  {numFmt(led?.creditsDebited ?? 0)} kredi ({numFmt(led?.debitsCount ?? 0)} debit)
                </p>
              </div>
            </div>
            {!led?.recent?.length ? (
              <p className="text-sm text-zinc-500">Kayıt yok.</p>
            ) : (
              <FinanceScrollTable
                minWidthPx={720}
                colgroup={LEDGER_COL}
                bodyMaxHeightClass="max-h-[320px]"
                headerCells={
                  <>
                    <th className={`${FINANCE_TH} text-left`}>Zaman</th>
                    <th className={`${FINANCE_TH} text-left`}>Tür</th>
                    <th className={`${FINANCE_TH} text-right tabular-nums`}>Tutar</th>
                    <th className={`${FINANCE_TH} text-left`}>Kullanıcı</th>
                    <th className={`${FINANCE_TH} text-left`}>Açıklama</th>
                  </>
                }
                bodyRows={
                  <>
                    {led.recent.map((r) => (
                      <tr key={r.id} className="text-zinc-200">
                        <td className="px-3.5 py-2.5 text-xs text-zinc-400">{r.created_at.slice(0, 19).replace("T", " ")}</td>
                        <td className="px-3.5 py-2.5 text-sm text-zinc-300">{r.type}</td>
                        <td className="px-3.5 py-2.5 text-right text-sm tabular-nums text-zinc-100">{numFmt(r.amount)}</td>
                        <td className="max-w-[100px] truncate px-3.5 py-2.5 font-mono text-[11px] text-zinc-500" title={r.user_id}>
                          {r.user_id ? `${r.user_id.slice(0, 8)}…` : "—"}
                        </td>
                        <td className="max-w-[280px] truncate px-3.5 py-2.5 text-xs text-zinc-500" title={r.description ?? ""}>
                          {r.description ?? "—"}
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
