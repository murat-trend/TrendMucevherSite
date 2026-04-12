"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Megaphone,
  PauseCircle,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminKpiCard, type AdminKpiTone } from "@/components/admin/ui/AdminKpiCard";
import type { LucideIcon } from "lucide-react";

const tryFmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

const dateFmtShort = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
};

/**
 * Kod tabanında satıcı paneli şu alanları çekiyor: name, budget, spent, clicks, impressions, revenue, status (+ seller_id).
 * Admin için starts_at, ends_at, campaign_type migration ile eklenir.
 */
export type AdCampaignRow = {
  id: string;
  seller_id: string;
  name: string;
  budget: number | null;
  spent?: number | null;
  clicks?: number | null;
  impressions?: number | null;
  revenue?: number | null;
  status: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  campaign_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProfileOption = { id: string; store_name: string | null };

export type CampaignDbStatus = "active" | "completed" | "pending" | "paused";

function normalizeDbStatus(raw: string | null | undefined): CampaignDbStatus {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "active" || s === "aktif" || s === "running") return "active";
  if (s === "completed" || s === "tamamlandı" || s === "tamamlandi" || s === "done") return "completed";
  if (s === "paused" || s === "stopped" || s === "durduruldu" || s === "duraklatıldı" || s === "duraklatildi")
    return "paused";
  return "pending";
}

const STATUS_UI: Record<CampaignDbStatus, { label: string; badge: string }> = {
  active: { label: "Aktif", badge: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200" },
  completed: { label: "Tamamlandı", badge: "border-sky-500/35 bg-sky-500/12 text-sky-200" },
  pending: { label: "Bekleyen", badge: "border-amber-500/40 bg-amber-500/12 text-amber-200" },
  paused: { label: "Durduruldu", badge: "border-zinc-500/40 bg-zinc-500/12 text-zinc-400" },
};

const CAMPAIGN_TYPES = [
  { value: "discount", label: "İndirim" },
  { value: "featured", label: "Öne çıkar" },
  { value: "banner", label: "Banner" },
] as const;

export type CampaignTypeValue = (typeof CAMPAIGN_TYPES)[number]["value"];

function campaignTypeLabel(v: string | null | undefined): string {
  const x = (v ?? "").toLowerCase();
  return CAMPAIGN_TYPES.find((t) => t.value === x)?.label ?? (v || "—");
}

export function AdminCampaignsPage() {
  const [rows, setRows] = useState<AdCampaignRow[]>([]);
  const [storeBySeller, setStoreBySeller] = useState<Map<string, string>>(new Map());
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    seller_id: "",
    starts_at: "",
    ends_at: "",
    budget: "",
    campaign_type: "discount" as CampaignTypeValue,
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: qErr } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      setStoreBySeller(new Map());
      setLoading(false);
      return;
    }
    const list = (data ?? []) as AdCampaignRow[];
    setRows(list);
    const sellerIds = [...new Set(list.map((r) => r.seller_id).filter(Boolean))];
    let map = new Map<string, string>();
    if (sellerIds.length > 0) {
      const { data: profs, error: pErr } = await supabase.from("profiles").select("id, store_name").in("id", sellerIds);
      if (!pErr && profs) {
        map = new Map(
          (profs as ProfileOption[]).map((p) => [p.id, (p.store_name ?? "").trim() || "—"]),
        );
      }
    }
    setStoreBySeller(map);

    const { data: allProf } = await supabase
      .from("profiles")
      .select("id, store_name")
      .order("store_name", { ascending: true });
    setProfiles(((allProf ?? []) as ProfileOption[]).filter((p) => p.id));

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => normalizeDbStatus(r.status) === "active").length;
    const completed = rows.filter((r) => normalizeDbStatus(r.status) === "completed").length;
    const budgetSum = rows.reduce((s, r) => s + (Number(r.budget) || 0), 0);
    return { total, active, completed, budgetSum };
  }, [rows]);

  const kpiCards: { id: string; label: string; value: string; icon: LucideIcon; sub: string; tone: AdminKpiTone }[] = [
    { id: "t", label: "Toplam kampanya", value: String(kpis.total), icon: Megaphone, sub: "Kayıt", tone: "neutral" },
    { id: "a", label: "Aktif kampanyalar", value: String(kpis.active), icon: CheckCircle2, sub: "Yürüyor", tone: "positive" },
    { id: "c", label: "Tamamlanan", value: String(kpis.completed), icon: Clock, sub: "Arşiv", tone: "info" },
    { id: "b", label: "Toplam bütçe", value: tryFmt(kpis.budgetSum), icon: Wallet, sub: "Planlanan", tone: "revenue" },
  ];

  const approveCampaign = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: uErr } = await supabase.from("ad_campaigns").update({ status: "active" }).eq("id", id);
      if (uErr) {
        window.alert(uErr.message);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "active" } : r)));
    },
    [],
  );

  const stopCampaign = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error: uErr } = await supabase.from("ad_campaigns").update({ status: "paused" }).eq("id", id);
    if (uErr) {
      window.alert(uErr.message);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "paused" } : r)));
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    if (!window.confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    const supabase = createClient();
    const { error: dErr } = await supabase.from("ad_campaigns").delete().eq("id", id);
    if (dErr) {
      window.alert(dErr.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const submitNewCampaign = useCallback(async () => {
    const name = form.name.trim();
    const seller_id = form.seller_id.trim();
    const budget = Number(form.budget);
    if (!name || !seller_id) {
      window.alert("Kampanya adı ve satıcı zorunludur.");
      return;
    }
    if (!Number.isFinite(budget) || budget < 0) {
      window.alert("Geçerli bir bütçe girin.");
      return;
    }
    if (!form.starts_at || !form.ends_at) {
      window.alert("Başlangıç ve bitiş tarihi zorunludur.");
      return;
    }
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (end < start) {
      window.alert("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      seller_id,
      name,
      budget,
      status: "pending" as const,
      spent: 0,
      clicks: 0,
      impressions: 0,
      revenue: 0,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      campaign_type: form.campaign_type,
    };
    const { data: inserted, error: insErr } = await supabase.from("ad_campaigns").insert(payload).select("*").single();
    setSaving(false);
    if (insErr) {
      window.alert(insErr.message);
      return;
    }
    const row = inserted as AdCampaignRow;
    setRows((prev) => [row, ...prev]);
    setStoreBySeller((prev) => {
      const next = new Map(prev);
      const sn = profiles.find((p) => p.id === seller_id)?.store_name?.trim() || "—";
      next.set(seller_id, sn || "—");
      return next;
    });
    setModalOpen(false);
    setForm({
      name: "",
      seller_id: "",
      starts_at: "",
      ends_at: "",
      budget: "",
      campaign_type: "discount",
    });
  }, [form, profiles]);

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Kampanyalar</h1>
          <p className="mt-1 text-sm text-zinc-500">Platformdaki kampanyaları yönet</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.18] hover:bg-white/[0.06]"
          >
            <RefreshCw className="h-4 w-4 text-[#b8956f]" strokeWidth={1.5} />
            Yenile
          </button>
          <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={openModal}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Yeni Kampanya Ekle
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200/90">
          {error}
        </div>
      )}

      <section aria-label="Özet" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((k) => (
          <AdminKpiCard key={k.id} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tone={k.tone} />
        ))}
      </section>

      <section
        aria-label="Kampanya listesi"
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <h2 className="font-display text-lg font-semibold text-zinc-100">Kampanya listesi</h2>
          <span className="text-xs text-zinc-500">ad_campaigns</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#c9a88a]" aria-hidden />
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <AdminEmptyState
            message="Henüz kampanya yok"
            hint="Yeni kampanya ekleyerek veya satıcı panelinden oluşturarak doldurulur."
            variant="shield"
          />
        ) : (
          <AdminDataScroll>
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Kampanya</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Satıcı</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Tür</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Durum</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Başlangıç</th>
                  <th className={`px-3 py-3 font-medium ${ADMIN_TABLE_TH_STICKY}`}>Bitiş</th>
                  <th className={`px-3 py-3 font-medium tabular-nums ${ADMIN_TABLE_TH_STICKY}`}>Bütçe</th>
                  <th className={`px-3 py-3 text-right font-medium ${ADMIN_TABLE_TH_STICKY}`}>Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((row) => {
                  const st = normalizeDbStatus(row.status);
                  const ui = STATUS_UI[st];
                  const start = row.starts_at ?? row.created_at ?? null;
                  const end = row.ends_at ?? null;
                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-100">{row.name}</p>
                        <p className="font-mono text-[11px] text-zinc-500">{row.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-3 py-3 text-zinc-400">{storeBySeller.get(row.seller_id) ?? "—"}</td>
                      <td className="px-3 py-3 text-zinc-400">{campaignTypeLabel(row.campaign_type)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ui.badge}`}>
                          {ui.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{dateFmtShort(start)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-500">{dateFmtShort(end)}</td>
                      <td className="px-3 py-3 tabular-nums text-zinc-200">{tryFmt(Number(row.budget) || 0)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {st === "pending" && (
                            <button
                              type="button"
                              onClick={() => void approveCampaign(row.id)}
                              className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-200 transition-colors hover:bg-emerald-500/18"
                            >
                              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                              Onayla
                            </button>
                          )}
                          {st === "active" && (
                            <button
                              type="button"
                              onClick={() => void stopCampaign(row.id)}
                              className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/18"
                            >
                              <PauseCircle className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                              Durdur
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteCampaign(row.id)}
                            className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/18"
                          >
                            <Trash2 className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                            Sil
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

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[90] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-modal-title"
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg items-start justify-center py-4 sm:py-8">
            <div className="w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[#12141a] via-[#0d0f15] to-[#08090c] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <h3 id="campaign-modal-title" className="font-display text-lg font-semibold text-zinc-100">
                  Yeni kampanya
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/[0.2]"
                >
                  Kapat
                </button>
              </div>
              <div className="space-y-4 px-5 py-4 sm:px-6">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Kampanya adı
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                    placeholder="Örn: Bahar indirimi"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Satıcı</span>
                  <select
                    value={form.seller_id}
                    onChange={(e) => setForm((f) => ({ ...f, seller_id: e.target.value }))}
                    className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  >
                    <option value="">Seçin…</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(p.store_name ?? "").trim() || p.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Başlangıç
                    </span>
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Bitiş</span>
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Bütçe (₺)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.budget}
                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                    placeholder="0"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">Kampanya türü</span>
                  <select
                    value={form.campaign_type}
                    onChange={(e) => setForm((f) => ({ ...f, campaign_type: e.target.value as CampaignTypeValue }))}
                    className="w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2.5 text-sm text-zinc-200 outline-none ring-[#c69575]/30 focus:border-[#c69575]/30 focus:ring-2"
                  >
                    {CAMPAIGN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:border-white/[0.18]"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitNewCampaign()}
                    className={ADMIN_PRIMARY_BUTTON_CLASS}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Kaydediliyor…
                      </>
                    ) : (
                      "Kaydet"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
