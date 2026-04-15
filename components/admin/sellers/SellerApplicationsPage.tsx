"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

type AppStatus = "pending" | "approved" | "rejected";

type ApplicationRow = {
  id: string;
  email: string;
  full_name: string;
  store_name: string;
  phone: string;
  tax_number: string;
  description: string;
  status: AppStatus;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type FilterTab = "pending" | "approved" | "rejected" | "all";

const STATUS_LABEL: Record<AppStatus, { label: string; cls: string }> = {
  pending:  { label: "Bekliyor",   cls: "bg-amber-500/15  text-amber-300  border-amber-500/30" },
  approved: { label: "Onaylandı", cls: "bg-green-500/15  text-green-300  border-green-500/30" },
  rejected: { label: "Reddedildi", cls: "bg-red-500/15    text-red-300    border-red-500/30"   },
};

export function SellerApplicationsPage() {
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fetchApplications = useCallback(async (status: FilterTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/seller-applications?status=${status}`);
      const json = await res.json() as { applications?: ApplicationRow[]; error?: string };
      setRows(json.applications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(filter); }, [filter, fetchApplications]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && rejectingId !== id) {
      setRejectingId(id);
      setRejectReason("");
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/seller-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reject" ? { rejection_reason: rejectReason } : {}),
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { showToast(`Hata: ${json.error ?? "Bilinmeyen hata"}`); return; }

      showToast(action === "approve" ? "Başvuru onaylandı, email gönderildi." : "Başvuru reddedildi, email gönderildi.");
      setRejectingId(null);
      setExpandedId(null);
      await fetchApplications(filter);
    } finally {
      setActionLoading(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "pending",  label: "Bekleyenler" },
    { key: "approved", label: "Onaylananlar" },
    { key: "rejected", label: "Reddedilenler" },
    { key: "all",      label: "Tümü" },
  ];

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-white/10 bg-zinc-900 px-5 py-3 text-sm text-zinc-100 shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/sellers"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#c9a88a] transition-colors hover:text-[#e8d4c4]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Satıcı listesi
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">
            Satıcı başvuruları
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Mağaza kayıt talepleri</p>
        </div>
        <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS}>
          <Layers className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          Dışa aktar
        </button>
      </header>

      {/* Filtre tabları */}
      <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === t.key
                ? "bg-white/[0.09] text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <section
        className="overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
        aria-label="Başvuru listesi"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          </div>
        ) : rows.length === 0 ? (
          <AdminEmptyState
            message="Başvuru bulunamadı."
            hint="Bu filtreye ait kayıt yok."
            variant="shield"
            size="comfortable"
            className="rounded-2xl border-0 bg-transparent"
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              const isRejecting = rejectingId === row.id;
              const busy = actionLoading === row.id;
              const st = STATUS_LABEL[row.status];

              return (
                <li key={row.id}>
                  {/* Satır başlığı */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-zinc-200">{row.store_name}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {row.full_name} · {row.email} · {fmt(row.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="shrink-0 rounded-lg border border-[#c69575]/35 bg-[#c69575]/10 px-3 py-1.5 text-xs font-medium text-[#eecdb8] transition-colors hover:bg-[#c69575]/18 inline-flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      İncele
                    </button>
                  </div>

                  {/* Detay paneli */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-5 sm:px-6 space-y-4">
                      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
                        <Detail label="Telefon" value={row.phone} />
                        <Detail label="Vergi No" value={row.tax_number} />
                        {row.reviewed_at && (
                          <Detail label="İşlem tarihi" value={fmt(row.reviewed_at)} />
                        )}
                        {row.rejection_reason && (
                          <Detail label="Red gerekçesi" value={row.rejection_reason} />
                        )}
                      </dl>

                      <div>
                        <p className="mb-1 text-xs font-medium text-zinc-400">Açıklama</p>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{row.description}</p>
                      </div>

                      {/* Aksiyon butonları — sadece pending ise */}
                      {row.status === "pending" && (
                        <div className="space-y-3 pt-2">
                          {isRejecting ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                placeholder="Red gerekçesi (opsiyonel)…"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleAction(row.id, "reject")}
                                  className="flex-1 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50"
                                >
                                  {busy ? "İşleniyor…" : "Reddet ve Email Gönder"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectingId(null)}
                                  className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(row.id, "approve")}
                                className="flex-1 rounded-lg bg-green-500/20 border border-green-500/30 px-4 py-2 text-xs font-semibold text-green-300 transition hover:bg-green-500/30 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                {busy ? "İşleniyor…" : "Onayla"}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleAction(row.id, "reject")}
                                className="flex-1 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/30 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reddet
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200 mt-0.5">{value}</dd>
    </div>
  );
}
