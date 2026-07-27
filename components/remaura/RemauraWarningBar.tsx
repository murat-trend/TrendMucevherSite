"use client";

/**
 * RemauraWarningBar — süper-admin uyarı şeridi.
 *
 * Yalnızca süper-admin görür (GET /api/remaura/warnings 403 dönerse gizlenir).
 * İki kaynak:
 *   1) Aktif sağlık kontrolü (proaktif): bir sağlayıcı düşük/ölü mü?
 *   2) Canlı hatalar (reaktif): gerçekten patlayan butonlar.
 * Her satır: hangi buton · hangi sağlayıcı · sebep + ödeme linki.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { installRemauraFetchCapture, type ClientCapture } from "@/lib/remaura/warnings/client-capture";

type ProviderMeta = {
  label: string;
  billingUrl: string;
  usedBy: { tool: string; buttons: string[] }[];
};

type LiveWarning = {
  id: string;
  created_at: string;
  tool: string;
  action: string | null;
  provider: string;
  kind: string;
  status: number | null;
  reason: string | null;
  source: string;
};

type HealthItem = {
  provider: string;
  state: "ok" | "warn" | "down" | "unknown";
  kind: string | null;
  detail: string;
  label: string;
  billingUrl: string;
  usedBy: { tool: string; buttons: string[] }[];
};

const KIND_LABEL: Record<string, string> = {
  payment: "ÖDEME GEREKLİ",
  auth: "ANAHTAR SORUNU",
  config: "YAPILANDIRMA",
  rate_limit: "KOTA LİMİTİ",
  timeout: "ZAMAN AŞIMI",
  server: "SERVİS HATASI",
  unknown: "HATA",
};

const WARN_POLL_MS = 60_000;
const HEALTH_POLL_MS = 5 * 60_000;

export function RemauraWarningBar() {
  const [enabled, setEnabled] = useState<boolean | null>(null); // null=bilinmiyor, false=süper-admin değil
  const [warnings, setWarnings] = useState<LiveWarning[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderMeta>>({});
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [captures, setCaptures] = useState<ClientCapture[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const mounted = useRef(true);

  const loadWarnings = useCallback(async () => {
    try {
      const res = await fetch("/api/remaura/warnings", { cache: "no-store", credentials: "same-origin" });
      if (res.status === 403 || res.status === 401) {
        if (mounted.current) setEnabled(false);
        return;
      }
      const j = (await res.json()) as { warnings?: LiveWarning[]; providers?: Record<string, ProviderMeta> };
      if (!mounted.current) return;
      setEnabled(true);
      setWarnings(j.warnings ?? []);
      if (j.providers) setProviders(j.providers);
    } catch {
      /* ağ — sessiz geç */
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/remaura/warnings/health", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const j = (await res.json()) as { health?: HealthItem[] };
      if (mounted.current) setHealth(j.health ?? []);
    } catch {
      /* sessiz */
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadWarnings();
    const wt = setInterval(() => void loadWarnings(), WARN_POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(wt);
    };
  }, [loadWarnings]);

  // Sağlık kontrolü yalnız süper-admin doğrulandıktan sonra (gereksiz dış çağrı yok).
  useEffect(() => {
    if (enabled !== true) return;
    void loadHealth();
    const ht = setInterval(() => void loadHealth(), HEALTH_POLL_MS);
    return () => clearInterval(ht);
  }, [enabled, loadHealth]);

  // Global yakalayıcı: her remaura API hatasını anında şeride düşür (tüm araçlar).
  useEffect(() => {
    if (enabled !== true) return;
    const uninstall = installRemauraFetchCapture((c) => {
      if (!mounted.current) return;
      setCaptures((prev) => {
        const key = `${c.tool}|${c.action}|${c.status}`;
        const rest = prev.filter((p) => `${p.tool}|${p.action}|${p.status}` !== key);
        return [c, ...rest].slice(0, 20);
      });
    });
    return uninstall;
  }, [enabled]);

  const resolve = useCallback(
    async (body: { id?: string; provider?: string; all?: boolean }) => {
      // İyimser: hemen listeden düş
      setWarnings((prev) =>
        prev.filter((w) => {
          if (body.id) return w.id !== body.id;
          if (body.provider) return w.provider !== body.provider;
          return false;
        }),
      );
      try {
        await fetch("/api/remaura/warnings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
      } finally {
        void loadWarnings();
      }
    },
    [loadWarnings],
  );

  if (enabled !== true) return null;

  const healthIssues = health.filter((h) => h.state === "down" || h.state === "warn");
  const totalIssues = healthIssues.length + warnings.length + captures.length;
  if (totalIssues === 0) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-red-500/30 bg-[#140a0c]">
      {/* Başlık */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-[13px] font-semibold text-red-200">
            {totalIssues} uyarı — servis sorunu tespit edildi
          </span>
        </span>
        <span className="text-[11px] uppercase tracking-widest text-red-300/60">
          {collapsed ? "Göster" : "Gizle"}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-px bg-red-500/10 px-px pb-px">
          {/* Aktif sağlık sorunları (proaktif) */}
          {healthIssues.map((h) => (
            <div
              key={`h-${h.provider}`}
              className={`flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                h.state === "down" ? "bg-[#170a0c]" : "bg-[#171009]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                      h.state === "down" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {h.kind ? KIND_LABEL[h.kind] ?? "UYARI" : "UYARI"}
                  </span>
                  <span className="text-[13px] font-semibold text-white">{h.label}</span>
                  <span className="text-[12px] text-red-200/70">— {h.detail}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-white/40">
                  Etkilenen:{" "}
                  {h.usedBy
                    .map((u) => `${u.tool} (${u.buttons.join(", ")})`)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={h.billingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-red-400/30 px-3 py-1.5 text-center text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/10"
              >
                Ödeme / Kredi →
              </a>
            </div>
          ))}

          {/* Anlık yakalananlar (bu oturumda tıkladığın butonlar) */}
          {captures.map((c) => {
            const meta = c.provider ? providers[c.provider] : undefined;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-1.5 bg-[#140a0c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-300">
                      {c.status === 402
                        ? "ÖDEME GEREKLİ"
                        : c.status === 401 || c.status === 403
                        ? "ANAHTAR SORUNU"
                        : c.status === 429
                        ? "KOTA LİMİTİ"
                        : c.status >= 500
                        ? "SERVİS HATASI"
                        : "HATA"}
                    </span>
                    <span className="text-[13px] font-semibold text-white">
                      {c.tool}
                      {c.action ? ` · ${c.action}` : ""}
                    </span>
                    <span className="text-[12px] text-red-200/70">
                      {meta?.label ? `— ${meta.label}` : ""} ({c.status})
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-white/40">{c.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {meta?.billingUrl && (
                    <a
                      href={meta.billingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/10"
                    >
                      Ödeme →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setCaptures((prev) => prev.filter((p) => p.id !== c.id))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            );
          })}

          {/* Canlı hatalar (reaktif, DB'den) */}
          {warnings.map((w) => {
            const meta = providers[w.provider];
            return (
              <div
                key={w.id}
                className="flex flex-col gap-1.5 bg-[#140a0c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-300">
                      {KIND_LABEL[w.kind] ?? "HATA"}
                    </span>
                    <span className="text-[13px] font-semibold text-white">
                      {w.tool}
                      {w.action ? ` · ${w.action}` : ""}
                    </span>
                    <span className="text-[12px] text-red-200/70">
                      — {meta?.label ?? w.provider}
                      {w.status ? ` (${w.status})` : ""}
                    </span>
                  </div>
                  {w.reason && <p className="mt-1 truncate text-[11px] text-white/40">{w.reason}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {meta?.billingUrl && (
                    <a
                      href={meta.billingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/10"
                    >
                      Ödeme →
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void resolve({ id: w.id })}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
                  >
                    Çözüldü
                  </button>
                </div>
              </div>
            );
          })}

          {warnings.length > 1 && (
            <div className="bg-[#140a0c] px-4 py-2 text-right">
              <button
                type="button"
                onClick={() => void resolve({ all: true })}
                className="text-[11px] text-white/40 underline transition-colors hover:text-white/70"
              >
                Tümünü çözüldü işaretle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
