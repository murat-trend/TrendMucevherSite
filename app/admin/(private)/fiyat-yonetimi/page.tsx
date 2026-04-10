"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Save, RefreshCw, Tag, CheckCircle, XCircle } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

type PricingItem = {
  id: string;
  key: string;
  name_tr: string;
  name_en: string;
  price: number;
  currency: string;
  description_tr: string | null;
  description_en: string | null;
  is_active: boolean;
  updated_at: string;
};

const tryFmt = (n: number, currency = "TRY") =>
  currency === "TRY"
    ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n)
    : `%${n}`;

const dateFmt = (iso: string) =>
  new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function FiyatYonetimiPage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PricingItem>>({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("pricing").select("*").order("key");
    if (data) setItems(data as PricingItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (item: PricingItem) => {
    setEditingId(item.id);
    setEditValues({ price: item.price, description_tr: item.description_tr, is_active: item.is_active });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const save = async (item: PricingItem) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("pricing").update({
      price: editValues.price,
      description_tr: editValues.description_tr,
      is_active: editValues.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    setSaving(false);
    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...editValues, updated_at: new Date().toISOString() } as PricingItem : i));
      setEditingId(null);
      setSavedId(item.id);
      setTimeout(() => setSavedId(null), 2000);
    }
  };

  const toggleActive = async (item: PricingItem) => {
    const supabase = createClient();
    await supabase.from("pricing").update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
  };

  return (
    <div className="space-y-6 pb-10 lg:space-y-8">

      {/* Baslik */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-zinc-50">Fiyat Yonetimi</h1>
          <p className="mt-1 text-sm text-zinc-500">Platform fiyatlarini buradan guncelleyebilirsin - degisiklikler aninda siteye yansir</p>
        </div>
        <button onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 hover:border-white/20">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Yenile
        </button>
      </header>

      {/* Uyari */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 text-sm text-amber-200/80">
        ⚠️ Fiyat degisiklikleri anlik olarak siteye yansir. Degisiklik yapmadan once emin olun.
      </div>

      {/* Fiyat listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-zinc-500">Yukleniyor...</div>
      ) : items.length === 0 ? (
        <AdminEmptyState message="Fiyat kaydi bulunamadi" hint="Supabase'de pricing tablosunu kontrol edin." variant="shield" />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id}
              className={`rounded-2xl border bg-gradient-to-br from-[#12141a]/90 via-[#0c0d11] to-[#08090c] p-5 transition-all ${
                editingId === item.id ? "border-[#c69575]/30" : "border-white/[0.08]"}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                {/* Sol: Bilgi */}
                <div className="flex flex-1 min-w-0 items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                    <Tag className="h-4 w-4 text-[#c9a88a]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-zinc-100">{item.name_tr}</h3>
                      <span className="rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                        {item.key}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        item.is_active
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-500/35 bg-zinc-500/10 text-zinc-400"}`}>
                        {item.is_active ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                        {item.is_active ? "Aktif" : "Pasif"}
                      </span>
                      {savedId === item.id && (
                        <span className="text-[11px] text-emerald-400">✓ Kaydedildi</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{item.name_en}</p>

                    {editingId === item.id ? (
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                              Fiyat {item.currency === "TRY" ? "(₺)" : "(%)"}
                            </label>
                            <input
                              type="number"
                              value={editValues.price ?? item.price}
                              onChange={e => setEditValues(p => ({ ...p, price: Number(e.target.value) }))}
                              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#c69575]/30 focus:ring-2 focus:ring-[#c69575]/20"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">Aciklama (TR)</label>
                            <input
                              type="text"
                              value={editValues.description_tr ?? item.description_tr ?? ""}
                              onChange={e => setEditValues(p => ({ ...p, description_tr: e.target.value }))}
                              className="w-full rounded-xl border border-white/[0.08] bg-[#07080a] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#c69575]/30"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`active-${item.id}`}
                            checked={editValues.is_active ?? item.is_active}
                            onChange={e => setEditValues(p => ({ ...p, is_active: e.target.checked }))}
                            className="h-4 w-4 accent-[#c69575]"
                          />
                          <label htmlFor={`active-${item.id}`} className="cursor-pointer text-sm text-zinc-300">Aktif (sitede goster)</label>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">{item.description_tr}</p>
                    )}

                    <p className="mt-2 text-[11px] text-zinc-600">Son guncelleme: {dateFmt(item.updated_at)}</p>
                  </div>
                </div>

                {/* Sag: Fiyat + Butonlar */}
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold tabular-nums text-[#c9a88a]">
                      {item.price === 0 ? "Ucretsiz" : tryFmt(item.price, item.currency)}
                    </p>
                    <p className="text-[11px] text-zinc-600">{item.currency}</p>
                  </div>

                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <>
                        <button onClick={cancelEdit}
                          className="rounded-xl border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 hover:border-white/20">
                          Iptal
                        </button>
                        <button onClick={() => void save(item)} disabled={saving}
                          className="flex items-center gap-1.5 rounded-xl border border-[#c69575]/40 bg-[#c69575]/15 px-3 py-1.5 text-xs font-medium text-[#f0dcc8] hover:bg-[#c69575]/22 disabled:opacity-50">
                          <Save className="h-3 w-3" strokeWidth={2} />
                          {saving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => toggleActive(item)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                            item.is_active
                              ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/18"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/18"}`}>
                          {item.is_active ? "Pasife Al" : "Aktive Et"}
                        </button>
                        <button onClick={() => startEdit(item)}
                          className="rounded-xl border border-[#c69575]/30 bg-[#c69575]/10 px-3 py-1.5 text-xs font-medium text-[#f0dcc8] hover:bg-[#c69575]/18">
                          Duzenle
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
