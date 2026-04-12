"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Megaphone, ImageIcon, Percent, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";

type CampaignType = "discount" | "featured" | "banner";

type ProductRow = { id: string; name: string };

type CreditRates = {
  featuredPerProduct: { week1: number; week2: number; month1: number };
  banner: { week1: number; month1: number };
};

type CampaignRow = {
  id: string;
  name: string;
  status: string | null;
  campaign_type: string | null;
  credit_cost?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
};

const dateInputFmt = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const dateFmtTr = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
};

export default function KampanyaYonetimi() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [discountKind, setDiscountKind] = useState<"percent" | "try">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [featuredDuration, setFeaturedDuration] = useState<"week1" | "week2" | "month1">("week1");
  const [bannerDuration, setBannerDuration] = useState<"week1" | "month1">("week1");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [creditRates, setCreditRates] = useState<CreditRates | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const loadWallet = useCallback(async (uid: string) => {
    const res = await fetch(`/api/billing/wallet?userId=${encodeURIComponent(uid)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { wallet?: { balanceCredits?: number } };
    const n = Number(data.wallet?.balanceCredits);
    setWalletBalance(Number.isFinite(n) ? n : 0);
  }, []);

  const loadCampaignsApi = useCallback(async () => {
    const res = await fetch("/api/satici/kampanya");
    if (!res.ok) return;
    const data = (await res.json()) as { campaigns?: CampaignRow[]; creditRates?: CreditRates };
    setCampaigns(data.campaigns ?? []);
    if (data.creditRates) setCreditRates(data.creditRates);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoadingBoot(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!alive || !user) {
        setLoadingBoot(false);
        return;
      }
      setUserId(user.id);
      const { data: prows } = await supabase.from("products_3d").select("id, name").eq("seller_id", user.id).order("name");
      if (alive) setProducts(((prows ?? []) as ProductRow[]).filter((p) => p.id));
      await loadWallet(user.id);
      await loadCampaignsApi();
      if (alive) setLoadingBoot(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadCampaignsApi, loadWallet]);

  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = {};
    if (on) products.forEach((p) => (next[p.id] = true));
    setSelected(next);
  };

  const totalCreditCost = useMemo(() => {
    if (!campaignType || !creditRates) return 0;
    if (campaignType === "discount") return 0;
    if (campaignType === "featured") {
      const u = creditRates.featuredPerProduct[featuredDuration];
      return Math.round(u * selectedIds.length);
    }
    return Math.round(creditRates.banner[bannerDuration]);
  }, [campaignType, creditRates, featuredDuration, bannerDuration, selectedIds.length]);

  const insufficient = walletBalance !== null && totalCreditCost > walletBalance;

  const uploadBannerIfNeeded = async (): Promise<boolean> => {
    if (campaignType !== "banner") return true;
    if (bannerUrl) return true;
    if (!bannerFile) return false;
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append("file", bannerFile);
      const res = await fetch("/api/satici/kampanya/upload-banner", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Yükleme başarısız.");
        return false;
      }
      setBannerUrl(data.url ?? null);
      return Boolean(data.url);
    } finally {
      setUploadingBanner(false);
    }
  };

  const goStep3 = async () => {
    setSubmitError(null);
    if (!campaignType) return;
    if (!startsAt || !endsAt) {
      window.alert("Başlangıç ve bitiş tarihlerini seçin.");
      return;
    }
    if ((campaignType === "discount" || campaignType === "featured") && selectedIds.length === 0) {
      window.alert("En az bir ürün seçin.");
      return;
    }
    if (campaignType === "discount") {
      const v = Number(discountValue);
      if (!Number.isFinite(v) || v <= 0) {
        window.alert("Geçerli bir indirim değeri girin.");
        return;
      }
    }
    if (campaignType === "banner" && !bannerFile && !bannerUrl) {
      window.alert("Banner için görsel yükleyin.");
      return;
    }
    if (campaignType === "banner") {
      const ok = await uploadBannerIfNeeded();
      if (!ok) return;
    }
    setStep(3);
  };

  const submitCampaign = async () => {
    if (!campaignType || !userId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        name: campaignName.trim() || defaultName(campaignType),
        campaign_type: campaignType,
        product_ids: campaignType === "banner" ? [] : selectedIds,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      };
      if (campaignType === "discount") {
        body.discount_type = discountKind;
        body.discount_rate = discountKind === "percent" ? Number(discountValue) : Number(discountValue);
      }
      if (campaignType === "featured") {
        body.featured_duration = featuredDuration;
      }
      if (campaignType === "banner") {
        body.banner_duration = bannerDuration;
        body.banner_image_url = bannerUrl;
      }

      const res = await fetch("/api/satici/kampanya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; campaignId?: string; wallet?: { balanceCredits?: number } };

      if (res.status === 402) {
        setSubmitError(data.error ?? "Yetersiz kredi.");
        if (data.wallet && typeof data.wallet.balanceCredits === "number") {
          setWalletBalance(data.wallet.balanceCredits);
        }
        return;
      }
      if (!res.ok) {
        setSubmitError(data.error ?? "Kayıt başarısız.");
        return;
      }

      await loadWallet(userId);
      await loadCampaignsApi();
      window.alert("Kampanyanız kaydedildi (durum: onay bekliyor).");
      resetWizard();
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setCampaignType(null);
    setCampaignName("");
    setSelected({});
    setDiscountValue("");
    setBannerFile(null);
    setBannerUrl(null);
    setStartsAt("");
    setEndsAt("");
    setSubmitError(null);
  };

  if (loadingBoot) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground">Kampanya oluştur</h2>
        <p className="mt-1 text-sm text-muted">Üç adımda kampanyanızı tanımlayın; kredi gerektiren türlerde bakiyeniz düşer.</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`rounded-full px-2.5 py-1 font-medium ${step === s ? "bg-accent/15 text-accent" : "bg-surface-alt text-muted"}`}>
            {s}. {s === 1 ? "Tür" : s === 2 ? "Detaylar" : "Özet"}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <TypeCard
            icon={Percent}
            title="İndirim"
            desc="Seçtiğiniz ürünlerde yüzde veya TL indirimi. Kredi harcamaz."
            selected={campaignType === "discount"}
            onSelect={() => {
              setCampaignType("discount");
              const now = new Date();
              const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              if (!startsAt) setStartsAt(dateInputFmt(now));
              if (!endsAt) setEndsAt(dateInputFmt(later));
            }}
          />
          <TypeCard
            icon={Sparkles}
            title="Öne çıkar"
            desc="Ürünleri vitrinde öne alın. Süre ve ürün sayısına göre kredi."
            selected={campaignType === "featured"}
            onSelect={() => {
              setCampaignType("featured");
              const now = new Date();
              const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              if (!startsAt) setStartsAt(dateInputFmt(now));
              if (!endsAt) setEndsAt(dateInputFmt(later));
            }}
          />
          <TypeCard
            icon={ImageIcon}
            title="Banner"
            desc="Banner görseli yükleyin. Süreye göre sabit kredi."
            selected={campaignType === "banner"}
            onSelect={() => {
              setCampaignType("banner");
              const now = new Date();
              const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              if (!startsAt) setStartsAt(dateInputFmt(now));
              if (!endsAt) setEndsAt(dateInputFmt(later));
            }}
          />
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="button"
              disabled={!campaignType}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              Devam <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && campaignType && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-6">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Kampanya adı</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={defaultName(campaignType)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
            />
          </div>

          {(campaignType === "discount" || campaignType === "featured") && (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted">Ürünler</span>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="accent-accent"
                  />
                  Tümünü seç
                </label>
              </div>
              {products.length === 0 ? (
                <p className="text-sm text-muted">Önce ürün ekleyin.</p>
              ) : (
                <ul className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-3">
                  {products.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`p-${p.id}`}
                        checked={Boolean(selected[p.id])}
                        onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                        className="accent-accent"
                      />
                      <label htmlFor={`p-${p.id}`} className="cursor-pointer text-sm text-foreground">
                        {p.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {campaignType === "discount" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">İndirim türü</label>
                <select
                  value={discountKind}
                  onChange={(e) => setDiscountKind(e.target.value as "percent" | "try")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="percent">Yüzde (%)</option>
                  <option value="try">TL</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
                  {discountKind === "percent" ? "İndirim oranı (%)" : "İndirim (₺)"}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={discountKind === "percent" ? 1 : 1}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>
            </div>
          )}

          {campaignType === "featured" && creditRates && (
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Süre</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["week1", `1 hafta — ${creditRates.featuredPerProduct.week1} kr. / ürün`],
                    ["week2", `2 hafta — ${creditRates.featuredPerProduct.week2} kr. / ürün`],
                    ["month1", `1 ay — ${creditRates.featuredPerProduct.month1} kr. / ürün`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setFeaturedDuration(k)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs sm:text-sm ${
                      featuredDuration === k ? "border-accent bg-accent/10 text-accent" : "border-border/80 text-muted hover:border-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {campaignType === "banner" && creditRates && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Banner görseli</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setBannerFile(e.target.files?.[0] ?? null);
                    setBannerUrl(null);
                  }}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-alt file:px-3 file:py-1.5 file:text-xs file:text-foreground"
                />
                {bannerUrl && <p className="mt-2 text-xs text-emerald-500">Görsel hazır (WebP olarak yüklendi).</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Süre</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBannerDuration("week1")}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      bannerDuration === "week1" ? "border-accent bg-accent/10 text-accent" : "border-border/80 text-muted"
                    }`}
                  >
                    1 hafta — {creditRates.banner.week1} kredi
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerDuration("month1")}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      bannerDuration === "month1" ? "border-accent bg-accent/10 text-accent" : "border-border/80 text-muted"
                    }`}
                  >
                    1 ay — {creditRates.banner.month1} kredi
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Başlangıç</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Bitiş</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </button>
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => void goStep3()}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {uploadingBanner ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
                </>
              ) : (
                <>
                  Özete geç <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 3 && campaignType && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-6">
          <h3 className="font-display text-lg font-medium text-foreground">Özet</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <span className="text-foreground font-medium">Tür:</span>{" "}
              {campaignType === "discount" ? "İndirim" : campaignType === "featured" ? "Öne çıkar" : "Banner"}
            </li>
            <li>
              <span className="text-foreground font-medium">Ad:</span> {campaignName.trim() || defaultName(campaignType)}
            </li>
            {(campaignType === "discount" || campaignType === "featured") && (
              <li>
                <span className="text-foreground font-medium">Seçilen ürünler:</span> {selectedIds.length} adet
              </li>
            )}
            {campaignType === "discount" && (
              <li>
                <span className="text-foreground font-medium">İndirim:</span>{" "}
                {discountKind === "percent" ? `%${discountValue}` : `₺${discountValue}`}
              </li>
            )}
            <li>
              <span className="text-foreground font-medium">Tarih:</span> {startsAt} → {endsAt}
            </li>
            <li>
              <span className="text-foreground font-medium">Toplam kredi maliyeti:</span>{" "}
              <span className="tabular-nums text-accent">{totalCreditCost}</span>
            </li>
            <li>
              <span className="text-foreground font-medium">Mevcut bakiye:</span>{" "}
              <span className="tabular-nums">{walletBalance ?? "—"}</span>
            </li>
          </ul>

          {insufficient && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Kredi bakiyeniz bu kampanya için yetersiz.{" "}
              <Link href="/fiyatlandirma" className="font-medium underline underline-offset-2 hover:text-red-100">
                Kredi satın al
              </Link>
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{submitError}</div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm text-muted"
            >
              <ChevronLeft className="h-4 w-4" /> Geri
            </button>
            <button
              type="button"
              disabled={submitting || insufficient || !startsAt || !endsAt}
              onClick={() => void submitCampaign()}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-40"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Kampanya oluştur
            </button>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/60 px-5 py-4">
          <h3 className="font-display text-[15px] font-medium text-foreground">Kampanyalarınız</h3>
        </div>
        <div className="overflow-x-auto p-4">
          {campaigns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Henüz kampanya yok.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Ad</th>
                  <th className="px-3 py-2">Tür</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2">Kredi</th>
                  <th className="px-3 py-2">Başlangıç</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground/90">
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-muted">{c.campaign_type ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{c.status ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{c.credit_cost ?? 0}</td>
                    <td className="px-3 py-2 text-muted">{dateFmtTr(c.starts_at ?? c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function defaultName(t: CampaignType): string {
  if (t === "discount") return "İndirim kampanyası";
  if (t === "featured") return "Öne çıkarma kampanyası";
  return "Banner kampanyası";
}

function TypeCard({
  icon: Icon,
  title,
  desc,
  selected,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-5 text-left transition-colors ${
        selected ? "border-accent bg-accent/[0.07] ring-1 ring-accent/30" : "border-border/80 bg-background/30 hover:border-border"
      }`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-surface-alt">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <p className="font-display text-base font-medium text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
    </button>
  );
}
