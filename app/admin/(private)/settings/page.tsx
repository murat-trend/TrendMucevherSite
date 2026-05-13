"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { ADMIN_PRIMARY_BUTTON_CLASS } from "@/components/admin/ui/adminPrimaryButton";
import type { SiteSettings } from "@/lib/site/settings-store";

const SECONDARY_BTN =
  "inline-flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]";

const INPUT =
  "w-full rounded-xl border border-white/[0.12] bg-[#0e1015] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[#c9a84c]/40";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#10121a]/95 via-[#0a0b0f] to-[#060708] p-5 sm:p-6">
      <h2 className="mb-5 font-display text-base font-semibold text-zinc-100">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      {hint && <span className="mb-1.5 block text-[10px] text-zinc-600">{hint}</span>}
      {children}
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-[#c9a84c]" : "bg-white/[0.1]",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const j = (await res.json()) as { settings?: SiteSettings; error?: string };
      if (!res.ok) { setErr(j.error ?? "Yüklenemedi"); return; }
      setSettings(j.settings ?? null);
    } catch {
      setErr("Ağ hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setSettings((s) => s ? { ...s, [key]: value } : s);

  const setFeature = (key: keyof SiteSettings["features"], value: boolean) =>
    setSettings((s) => s ? { ...s, features: { ...s.features, [key]: value } } : s);

  const num = (key: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) set(key, v as SiteSettings[typeof key]);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const j = (await res.json()) as { settings?: SiteSettings; error?: string };
      if (!res.ok) { setErr(j.error ?? "Kaydedilemedi"); return; }
      setSettings(j.settings ?? settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErr("Ağ hatası");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Başlık */}
      <div className="rounded-2xl border border-white/[0.14] bg-gradient-to-br from-[#14161d] via-[#0e1015] to-[#08090c] p-6 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Site Ayarları</h1>
            <p className="mt-2 text-sm text-zinc-400">Kargo, fiyat, kredi ve özellik ayarlarını buradan yönetin.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={SECONDARY_BTN} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Yenile
            </button>
            <button type="button" className={ADMIN_PRIMARY_BUTTON_CLASS} onClick={() => void save()} disabled={saving || loading || !settings}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </div>
        {err && <div className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-200">{err}</div>}
        {saved && <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-sm text-emerald-200">Ayarlar kaydedildi.</div>}
      </div>

      {loading || !settings ? (
        <div className="flex items-center gap-2 py-12 text-sm text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#b8956f]" />
          Yükleniyor…
        </div>
      ) : (
        <>
          {/* Kargo & Sipariş */}
          <Section title="Kargo & Sipariş">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kargo ücreti (₺)">
                <input type="number" min={0} value={settings.shippingPriceTry} onChange={num("shippingPriceTry")} className={INPUT} />
              </Field>
              <Field label="Ücretsiz kargo eşiği (₺)">
                <input type="number" min={0} value={settings.freeShippingThresholdTry} onChange={num("freeShippingThresholdTry")} className={INPUT} />
              </Field>
              <Field label="KDV oranı (%)">
                <input type="number" min={0} max={100} value={settings.taxRate} onChange={num("taxRate")} className={INPUT} />
              </Field>
            </div>
          </Section>

          {/* Kredi & İçerik */}
          <Section title="Kredi & İçerik">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="İçerik üretimi — kredi maliyeti" hint="Kullanıcı başına içerik üretiminde düşülen kredi">
                <input type="number" min={0} value={settings.contentCreditCost} onChange={num("contentCreditCost")} className={INPUT} />
              </Field>
              <Field label="İçerik paketi fiyatı (₺)" hint="Kredi satın alma birim fiyatı">
                <input type="number" min={0} value={settings.contentPriceTry} onChange={num("contentPriceTry")} className={INPUT} />
              </Field>
            </div>
          </Section>

          {/* Kampanya Fiyatları */}
          <Section title="Kampanya Fiyatları (Kredi)">
            <p className="text-[11px] text-zinc-600">Satıcıların kampanya oluşturmasında kullanılan kredi miktarları.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Öne çıkarma — 1 Hafta (ürün başı)">
                <input type="number" min={0} value={settings.campaignFeaturedWeek1PerProduct} onChange={num("campaignFeaturedWeek1PerProduct")} className={INPUT} />
              </Field>
              <Field label="Öne çıkarma — 2 Hafta (ürün başı)">
                <input type="number" min={0} value={settings.campaignFeaturedWeek2PerProduct} onChange={num("campaignFeaturedWeek2PerProduct")} className={INPUT} />
              </Field>
              <Field label="Öne çıkarma — 1 Ay (ürün başı)">
                <input type="number" min={0} value={settings.campaignFeaturedMonth1PerProduct} onChange={num("campaignFeaturedMonth1PerProduct")} className={INPUT} />
              </Field>
              <Field label="Banner — 1 Hafta (sabit)">
                <input type="number" min={0} value={settings.campaignBannerWeek1} onChange={num("campaignBannerWeek1")} className={INPUT} />
              </Field>
              <Field label="Banner — 1 Ay (sabit)">
                <input type="number" min={0} value={settings.campaignBannerMonth1} onChange={num("campaignBannerMonth1")} className={INPUT} />
              </Field>
            </div>
          </Section>

          {/* Özellikler */}
          <Section title="Özellik Anahtarları">
            <p className="text-[11px] text-zinc-600">Kapalı özellikler kullanıcılara gösterilmez veya hata verir.</p>
            <div className="space-y-3">
              {([
                ["generateEnabled",        "AI İçerik Üretimi",    "3D model üretimi (generate) aktif"],
                ["analyzeJewelryEnabled",  "Mücevher Analizi",     "Fotoğraftan mücevher analizi aktif"],
                ["analyzeStyleEnabled",    "Stil Analizi",         "Stil analizi özelliği aktif"],
              ] as const).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{label}</p>
                    <p className="text-[11px] text-zinc-500">{hint}</p>
                  </div>
                  <Toggle checked={settings.features[key]} onChange={(v) => setFeature(key, v)} />
                </div>
              ))}
            </div>
          </Section>

          {/* Son güncelleme */}
          <p className="text-right text-[11px] text-zinc-600">
            Son güncelleme: {new Date(settings.updatedAt).toLocaleString("tr-TR")}
          </p>
        </>
      )}
    </div>
  );
}
