"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { CheckCircle, Sparkles, Box, ImageIcon, Eraser, Clock, ShieldAlert } from "lucide-react";

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
};

const ICONS: Record<string, React.ElementType> = {
  gorsel_3li: ImageIcon,
  model_3d_stl: Box,
  arkaplan_kaldir: Eraser,
  satici_komisyon: Sparkles,
};

export default function FiyatlandirmaPage() {
  const { locale } = useLanguage();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("pricing")
        .select("*")
        .eq("is_active", true)
        .order("key");
      if (data) setItems(data as PricingItem[]);
      setLoading(false);
    };
    void load();
  }, []);

  const getName = (item: PricingItem) => locale === "en" ? item.name_en : item.name_tr;
  const getDesc = (item: PricingItem) => locale === "en" ? item.description_en : item.description_tr;

  const tryFmt = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

  // Remaura AI ürünleri
  const remauraItems = items.filter(i => ["gorsel_3li", "model_3d_stl", "arkaplan_kaldir"].includes(i.key));
  const sellerItem = items.find(i => i.key === "satici_komisyon");

  return (
    <main className="min-h-screen bg-background">

      {/* Hero */}
      <section className="border-b border-border/60 px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
            {locale === "en" ? "Pricing" : "Fiyatlandırma"}
          </p>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl">
            {locale === "en" ? "Simple, Transparent Pricing" : "Sade ve Şeffaf Fiyatlar"}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
            {locale === "en"
              ? "No subscriptions, no hidden fees. Pay only for what you use."
              : "Abonelik yok, gizli ücret yok. Sadece kullandığın kadar öde."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Remaura AI */}
            <section className="mb-20">
              <div className="mb-10 text-center">
                <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
                  Remaura AI
                </h2>
                <p className="mt-3 text-[14px] text-muted">
                  {locale === "en"
                    ? "AI-powered jewelry design tools. Pay per use."
                    : "Yapay zeka destekli mücevher tasarım araçları. Kullandıkça öde."}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {remauraItems.map(item => {
                  const Icon = ICONS[item.key] ?? Sparkles;
                  const isFree = item.price === 0;
                  return (
                    <div key={item.id}
                      className={`relative flex flex-col rounded-2xl border p-7 transition-all hover:-translate-y-0.5 ${
                        isFree
                          ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                          : "border-border/80 bg-card hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(30,28,26,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"}`}>

                      {isFree && (
                        <span className="absolute right-4 top-4 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-500">
                          {locale === "en" ? "FREE" : "ÜCRETSİZ"}
                        </span>
                      )}

                      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl border ${
                        isFree ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-500" : "border-border/60 bg-surface-alt text-accent"}`}>
                        <Icon size={20} strokeWidth={1.5} />
                      </div>

                      <h3 className="font-display text-lg font-medium text-foreground">{getName(item)}</h3>
                      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{getDesc(item)}</p>

                      <div className="mt-6 border-t border-border/60 pt-6">
                        <p className={`font-display text-3xl font-medium ${isFree ? "text-emerald-500" : "text-accent"}`}>
                          {isFree ? (locale === "en" ? "Free" : "Ücretsiz") : tryFmt(item.price)}
                        </p>
                        {!isFree && (
                          <p className="mt-1 text-[12px] text-muted">
                            {locale === "en" ? "per transaction" : "işlem başına"}
                          </p>
                        )}
                      </div>

                      <Link href="/remaura"
                        className={`mt-5 flex h-10 items-center justify-center rounded-full text-[13px] font-medium transition-all ${
                          isFree
                            ? "border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-500 hover:bg-emerald-500/15"
                            : "bg-accent text-accent-foreground hover:opacity-90"}`}>
                        {locale === "en" ? "Start Now" : "Hemen Başla"} →
                      </Link>
                    </div>
                  );
                })}

                {/* CAD Koçu — Yakında */}
                <div className="relative flex flex-col rounded-2xl border border-border/40 bg-card/50 p-7 opacity-60">
                  <span className="absolute right-4 top-4 rounded-full border border-border/60 bg-surface-alt px-2.5 py-1 text-[10px] font-semibold text-muted">
                    {locale === "en" ? "COMING SOON" : "YAKINDA"}
                  </span>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border/40 bg-surface-alt text-muted">
                    <Clock size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-lg font-medium text-foreground/60">CAD Koçu</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted/60">
                    {locale === "en"
                      ? "AI-powered CAD design assistant. Coming soon."
                      : "Yapay zeka destekli CAD tasarım asistanı. Çok yakında."}
                  </p>
                  <div className="mt-6 border-t border-border/40 pt-6">
                    <p className="font-display text-xl font-medium text-muted/60">—</p>
                  </div>
                  <div className="mt-5 flex h-10 cursor-not-allowed items-center justify-center rounded-full border border-border/40 text-[13px] text-muted/60">
                    {locale === "en" ? "Coming Soon" : "Yakında"}
                  </div>
                </div>
              </div>
            </section>

            {/* Satıcı Planı */}
            <section className="mb-20">
              <div className="mb-10 text-center">
                <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
                  {locale === "en" ? "Seller Plan" : "Satıcı Planı"}
                </h2>
                <p className="mt-3 text-[14px] text-muted">
                  {locale === "en"
                    ? "List your products on our platform and reach thousands of customers."
                    : "Ürünlerinizi platformumuzda listeleyin, binlerce müşteriye ulaşın."}
                </p>
              </div>

              <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-medium text-foreground">
                        {locale === "en" ? "Seller Membership" : "Satıcı Üyeliği"}
                      </h3>
                      <p className="mt-2 text-[14px] text-muted">
                        {locale === "en"
                          ? "Start free for 3 months, then flexible pricing."
                          : "3 ay ücretsiz başla, sonrası esnek fiyatlandırma."}
                      </p>
                    </div>
                    <div className="shrink-0 text-center sm:text-right">
                      <p className="font-display text-4xl font-medium text-accent">
                        {locale === "en" ? "Free" : "Ücretsiz"}
                      </p>
                      <p className="mt-1 text-[12px] text-muted">
                        {locale === "en" ? "first 3 months" : "ilk 3 ay"}
                      </p>
                    </div>
                  </div>

                  {/* Özellikler */}
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {[
                      locale === "en" ? "List unlimited products" : "Sınırsız ürün listele",
                      locale === "en" ? `${sellerItem?.price ?? 12}% commission per sale` : `Satış başına %${sellerItem?.price ?? 12} komisyon`,
                      locale === "en" ? "Seller dashboard & analytics" : "Satıcı paneli & analitik",
                      locale === "en" ? "Order management" : "Sipariş yönetimi",
                      locale === "en" ? "Customer support" : "Müşteri desteği",
                      locale === "en" ? "Remaura AI access" : "Remaura AI erişimi",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <CheckCircle size={15} className="shrink-0 text-accent" strokeWidth={2} />
                        <span className="text-[13px] text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/satici-ol"
                    className="mt-8 flex h-12 items-center justify-center rounded-full bg-accent text-[14px] font-medium text-accent-foreground transition-opacity hover:opacity-90">
                    {locale === "en" ? "Become a Seller" : "Satıcı Ol"} →
                  </Link>
                </div>
              </div>
            </section>

            {/* Uyarı */}
            <section className="mx-auto max-w-2xl">
              <div className="flex items-start gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-500" strokeWidth={1.75} />
                <div>
                  <h4 className="font-medium text-foreground">
                    {locale === "en" ? "Important Notice" : "Önemli Uyarı"}
                  </h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">
                    {locale === "en"
                      ? "3D models generated by AI may require additional editing in programs such as ZBrush or Blender. By purchasing, you acknowledge that AI can make mistakes and the output may need refinement."
                      : "Yapay zeka ile üretilen 3D modeller ZBrush veya Blender gibi programlarda ek düzenleme gerektirebilir. Satın alarak, yapay zekanın hata yapabileceğini ve çıktının düzenleme gerektirebileceğini kabul etmiş olursunuz."}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
