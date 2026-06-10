"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Plus, Minus } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";

type Firm = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_color: string;
  plan: string;
  credits: number;
  active: boolean;
  extra_languages: string[];
  created_at: string;
};

type Session = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  deposit_amount: number | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  ordered: "Sipariş",
  cancelled: "İptal",
};
const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400",
  ordered: "text-blue-400",
  cancelled: "text-red-400",
};

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function NextauraFirmDetail({ firmId }: { firmId: string }) {
  const router = useRouter();
  const [firm, setFirm] = useState<Firm | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [creditAmount, setCreditAmount] = useState("50");
  const [creditBusy, setCreditBusy] = useState(false);
  const [creditMsg, setCreditMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/nextaura/${firmId}`, { credentials: "include" });
    const json = await res.json() as { firm?: Firm; sessions?: Session[]; error?: string };
    if (!res.ok) { setError(json.error ?? `HTTP ${res.status}`); return; }
    setFirm(json.firm ?? null);
    setSessions(json.sessions ?? []);
    if (json.firm) {
      setEditName(json.firm.name);
      setEditColor(json.firm.theme_color);
      setEditPlan(json.firm.plan);
      setEditActive(json.firm.active);
    }
  }, [firmId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/admin/nextaura/${firmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: editName, theme_color: editColor, plan: editPlan, active: editActive }),
    });
    setSaving(false);
    await load();
  };

  const handleCredit = async (type: "add" | "deduct") => {
    const amount = Number(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setCreditBusy(true);
    setCreditMsg(null);
    const res = await fetch(`/api/admin/nextaura/${firmId}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amount, type }),
    });
    const json = await res.json() as { credits?: number; error?: string };
    setCreditBusy(false);
    if (!res.ok) { setCreditMsg(json.error ?? "Hata"); return; }
    setCreditMsg(`Yeni bakiye: ${json.credits ?? "?"} kredi`);
    await load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-zinc-400" size={28} />
    </div>
  );
  if (error || !firm) return <div className="p-6 text-red-400 text-sm">{error ?? "Firma bulunamadı"}</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm w-fit"
      >
        <ArrowLeft size={16} /> Geri
      </button>

      <h1 className="text-xl font-bold text-white flex items-center gap-3">
        <span className="inline-block w-4 h-4 rounded-full" style={{ background: firm.theme_color }} />
        {firm.name}
        <span className="text-xs text-zinc-500 font-normal font-mono">/{firm.slug}</span>
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genel Ayarlar */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Genel Ayarlar</h2>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Firma Adı</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Plan</span>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="plus">Plus</option>
              </select>
            </label>

            <label className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">Tema Rengi</span>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-8 w-14 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
              />
              <span className="text-xs text-zinc-500 font-mono">{editColor}</span>
            </label>

            <label className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">Aktif</span>
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={ADMIN_PRIMARY_BUTTON_CLASS}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Kaydet
          </button>
        </div>

        {/* Kredi Yönetimi */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-white">Kredi Yönetimi</h2>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{firm.credits}</span>
            <span className="text-xs text-zinc-400">mevcut kredi</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-24 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCredit("add")}
              disabled={creditBusy}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-800 text-emerald-200 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={14} /> Ekle
            </button>
            <button
              type="button"
              onClick={() => void handleCredit("deduct")}
              disabled={creditBusy}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-900 text-red-200 text-sm font-semibold hover:bg-red-800 disabled:opacity-50"
            >
              <Minus size={14} /> Düş
            </button>
          </div>

          {creditMsg && <p className="text-xs text-zinc-300">{creditMsg}</p>}
        </div>
      </div>

      {/* Oturumlar */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-white">Son Müşteri Oturumları</h2>

        {sessions.length === 0 ? (
          <p className="text-xs text-zinc-500">Henüz oturum yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Müşteri</th>
                  <th className="pb-2 pr-4">Telefon</th>
                  <th className="pb-2 pr-4">Durum</th>
                  <th className="pb-2 pr-4">Kapora</th>
                  <th className="pb-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-800/60">
                    <td className="py-2 pr-4 text-white">{s.customer_name ?? "—"}</td>
                    <td className="py-2 pr-4 text-zinc-400 font-mono text-xs">{s.customer_phone ?? "—"}</td>
                    <td className={`py-2 pr-4 text-xs font-semibold ${STATUS_COLOR[s.status] ?? "text-zinc-400"}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </td>
                    <td className="py-2 pr-4 text-zinc-300">
                      {s.deposit_amount != null ? `₺${s.deposit_amount}` : "—"}
                    </td>
                    <td className="py-2 text-zinc-500 text-xs">{dateFmt(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
