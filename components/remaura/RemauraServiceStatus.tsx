"use client";

/**
 * RemauraServiceStatus — /admin/remauraai panelinde HER ZAMAN görünür servis durumu.
 *
 * Araç sayfalarındaki şeritten farkı: sorun olmasa da görünür ("çalışıyor ✓").
 * 6 sağlayıcının canlı durumu + kayıtlı aktif uyarılar tek kartta.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

type HealthItem = {
  provider: string;
  state: "ok" | "warn" | "down" | "unknown";
  kind: string | null;
  detail: string;
  label: string;
  billingUrl: string;
  usedBy: { tool: string; buttons: string[] }[];
};

type Warning = {
  id: string;
  created_at: string;
  tool: string;
  action: string | null;
  provider: string;
  kind: string;
  status: number | null;
  reason: string | null;
};

type ProviderMeta = { label: string; billingUrl: string };

const KIND_LABEL: Record<string, string> = {
  payment: "ÖDEME GEREKLİ",
  auth: "ANAHTAR SORUNU",
  config: "YAPILANDIRMA",
  rate_limit: "KOTA LİMİTİ",
  timeout: "ZAMAN AŞIMI",
  server: "SERVİS HATASI",
  unknown: "HATA",
};

function StateIcon({ state }: { state: HealthItem["state"] }) {
  if (state === "ok") return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (state === "warn") return <AlertTriangle size={16} className="text-amber-400" />;
  if (state === "down") return <XCircle size={16} className="text-red-400" />;
  return <HelpCircle size={16} className="text-zinc-500" />;
}

export function RemauraServiceStatus() {
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string>("");

  const loadWarnings = useCallback(async () => {
    const res = await fetch("/api/remaura/warnings", { cache: "no-store", credentials: "same-origin" });
    if (res.status === 403 || res.status === 401) {
      setForbidden(true);
      return;
    }
    const j = (await res.json()) as {
      warnings?: Warning[];
      providers?: Record<string, ProviderMeta>;
      dbReady?: boolean;
    };
    setWarnings(j.warnings ?? []);
    if (j.providers) setProviders(j.providers);
    setDbReady(j.dbReady !== false);
  }, []);

  const loadHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/remaura/warnings/health", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const j = (await res.json()) as { health?: HealthItem[] };
      setHealth(j.health ?? []);
      setCheckedAt(new Date().toLocaleTimeString("tr-TR"));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadWarnings();
      await loadHealth();
      setLoading(false);
    })();
  }, [loadWarnings, loadHealth]);

  const resolve = useCallback(
    async (body: { id?: string; all?: boolean }) => {
      setWarnings((prev) => (body.all ? [] : prev.filter((w) => w.id !== body.id)));
      await fetch("/api/remaura/warnings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      void loadWarnings();
    },
    [loadWarnings],
  );

  if (forbidden) return null;

  const anyProblem =
    health.some((h) => h.state === "down" || h.state === "warn") || warnings.length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Servis Durumu & Uyarılar</h2>
          {!loading &&
            (anyProblem ? (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300">
                Sorun var
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                Tüm servisler çalışıyor ✓
              </span>
            ))}
        </div>
        <button
          type="button"
          onClick={() => void loadHealth()}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
        >
          {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={22} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <>
          {/* Sağlayıcı durumları */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((h) => (
              <div
                key={h.provider}
                className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <StateIcon state={h.state} />
                  <span className="text-[13px] font-medium text-zinc-100">{h.label}</span>
                </div>
                <p className="text-[11px] text-zinc-400">{h.detail}</p>
                {(h.state === "down" || h.state === "warn") && (
                  <a
                    href={h.billingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 w-fit text-[11px] font-medium text-red-300 underline hover:text-red-200"
                  >
                    Ödeme / Kredi →
                  </a>
                )}
              </div>
            ))}
          </div>

          {checkedAt && (
            <p className="text-[10px] text-zinc-600">Son kontrol: {checkedAt}</p>
          )}

          {/* Kayıtlı uyarılar */}
          <div className="mt-1 border-t border-zinc-800 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Aktif Uyarılar {warnings.length > 0 && `(${warnings.length})`}
              </h3>
              {warnings.length > 1 && (
                <button
                  type="button"
                  onClick={() => void resolve({ all: true })}
                  className="text-[11px] text-zinc-500 underline hover:text-zinc-300"
                >
                  Tümünü çözüldü işaretle
                </button>
              )}
            </div>

            {warnings.length === 0 ? (
              <p className="text-[12px] text-zinc-500">
                {dbReady
                  ? "Kayıtlı aktif uyarı yok ✓"
                  : "Kayıt tablosu (remaura_warnings) henüz uygulanmadı — canlı durum yukarıda çalışıyor."}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {warnings.map((w) => {
                  const meta = providers[w.provider];
                  return (
                    <div
                      key={w.id}
                      className="flex flex-col gap-1 rounded-lg border border-red-500/20 bg-red-950/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                            {KIND_LABEL[w.kind] ?? "HATA"}
                          </span>
                          <span className="text-[12px] font-medium text-zinc-100">
                            {w.tool}
                            {w.action ? ` · ${w.action}` : ""}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {meta?.label ?? w.provider}
                            {w.status ? ` (${w.status})` : ""}
                          </span>
                        </div>
                        {w.reason && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{w.reason}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {meta?.billingUrl && (
                          <a
                            href={meta.billingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-red-300 underline hover:text-red-200"
                          >
                            Ödeme →
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void resolve({ id: w.id })}
                          className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                        >
                          Çözüldü
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
