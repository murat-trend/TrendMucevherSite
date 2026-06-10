"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, Store, Coins, ToggleLeft, ToggleRight, Trash2, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminKpiCard } from "@/components/admin/ui/AdminKpiCard";
import { AdminDataScroll, ADMIN_TABLE_TH_STICKY } from "@/components/admin/ui/AdminDataScroll";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";

type Firm = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_color: string;
  plan: "starter" | "pro" | "plus";
  credits: number;
  active: boolean;
  created_at: string;
};

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-zinc-700 text-zinc-200",
  pro: "bg-blue-900 text-blue-200",
  plus: "bg-amber-900 text-amber-200",
};

export function NextauraAdminPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", theme_color: "#b76e79", plan: "starter", credits: "50" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/nextaura", { credentials: "include" });
    const json = await res.json() as { firms?: Firm[]; monthlyUsage?: number; error?: string };
    if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); return; }
    setFirms(json.firms ?? []);
    setMonthlyUsage(json.monthlyUsage ?? 0);
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const totalFirms = firms.length;
  const activeFirms = firms.filter((f) => f.active).length;
  const totalCredits = firms.reduce((s, f) => s + f.credits, 0);

  const handleCreate = async () => {
    if (!form.slug || !form.name) { setSaveError("slug ve ad zorunlu"); return; }
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/admin/nextaura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, credits: Number(form.credits) }),
    });
    const json = await res.json() as { error?: string };
    setSaving(false);
    if (!res.ok) { setSaveError(json.error ?? "Hata"); return; }
    setShowCreate(false);
    setForm({ slug: "", name: "", theme_color: "#b76e79", plan: "starter", credits: "50" });
    await load();
  };

  const toggleActive = async (firm: Firm) => {
    await fetch(`/api/admin/nextaura/${firm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active: !firm.active }),
    });
    await load();
  };

  const deleteFirm = async (firm: Firm) => {
    if (!confirm(`"${firm.name}" firmasını silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    await fetch(`/api/admin/nextaura/${firm.id}`, { method: "DELETE", credentials: "include" });
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-zinc-400" size={28} />
    </div>
  );

  if (error) return (
    <div className="p-6 text-red-400 text-sm">{error}</div>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminKpiCard label="Toplam Firma" value={totalFirms} tone="neutral" icon={Store as LucideIcon} />
        <AdminKpiCard label="Aktif Firma" value={activeFirms} tone="positive" />
        <AdminKpiCard label="Bu Ay Oturum" value={monthlyUsage} tone="neutral" />
        <AdminKpiCard label="Toplam Kredi" value={totalCredits} tone="neutral" icon={Coins as LucideIcon} />
      </div>

      {/* Başlık + Ekle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Nextaura Firmaları</h2>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={ADMIN_PRIMARY_BUTTON_CLASS}
        >
          <Plus size={16} /> Firma Ekle
        </button>
      </div>

      {/* Yeni Firma Formu */}
      {showCreate && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white">Yeni Firma</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="slug (örn: altın-dünyası)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <input
              placeholder="Firma adı"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="plus">Plus</option>
            </select>
            <input
              placeholder="Başlangıç kredisi"
              type="number"
              min={0}
              value={form.credits}
              onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400">Tema Rengi</label>
              <input
                type="color"
                value={form.theme_color}
                onChange={(e) => setForm((f) => ({ ...f, theme_color: e.target.value }))}
                className="h-8 w-14 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
              />
            </div>
          </div>
          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={saving}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Tablo */}
      {firms.length === 0 ? (
        <AdminEmptyState message="Henüz firma yok" hint="Yukarıdan ilk firmayı ekleyin." />
      ) : (
        <AdminDataScroll>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className={ADMIN_TABLE_TH_STICKY}>Firma</th>
                <th className={ADMIN_TABLE_TH_STICKY}>Slug</th>
                <th className={ADMIN_TABLE_TH_STICKY}>Plan</th>
                <th className={ADMIN_TABLE_TH_STICKY}>Kredi</th>
                <th className={ADMIN_TABLE_TH_STICKY}>Durum</th>
                <th className={ADMIN_TABLE_TH_STICKY}></th>
              </tr>
            </thead>
            <tbody>
              {firms.map((firm) => (
                <tr key={firm.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: firm.theme_color }}
                    />
                    {firm.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{firm.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${PLAN_BADGE[firm.plan] ?? ""}`}>
                      {firm.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 font-mono">{firm.credits}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void toggleActive(firm)} title={firm.active ? "Devre dışı bırak" : "Aktif et"}>
                      {firm.active
                        ? <ToggleRight size={20} className="text-emerald-400" />
                        : <ToggleLeft size={20} className="text-zinc-500" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <Link
                        href={`/admin/nextaura/${firm.id}`}
                        className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs"
                      >
                        Detay <ChevronRight size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void deleteFirm(firm)}
                        className="text-red-500 hover:text-red-400"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataScroll>
      )}
    </div>
  );
}
