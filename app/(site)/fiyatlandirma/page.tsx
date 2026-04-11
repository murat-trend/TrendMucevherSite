"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Coins } from "lucide-react";

type CreditPackage = {
  id: string;
  nameTr: string;
  nameEn: string;
  credits: number;
  priceTry: number;
};

const PACKAGES: CreditPackage[] = [
  { id: "baslangic", nameTr: "Başlangıç", nameEn: "Starter", credits: 100, priceTry: 1000 },
  { id: "standart", nameTr: "Standart", nameEn: "Standard", credits: 300, priceTry: 2500 },
  { id: "pro", nameTr: "Pro", nameEn: "Pro", credits: 700, priceTry: 5000 },
  { id: "kurumsal", nameTr: "Kurumsal", nameEn: "Enterprise", credits: 1500, priceTry: 10000 },
];

export default function FiyatlandirmaPage() {
  const { locale } = useLanguage();

  const tryFmt = (n: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

  const name = (p: CreditPackage) => (locale === "en" ? p.nameEn : p.nameTr);
  const creditsLabel =
    locale === "en" ? "credits" : "kredi";
  const buyLabel = locale === "en" ? "Purchase" : "Satın Al";
  const contactHint =
    locale === "en"
      ? "Bank transfer and checkout will be available soon. Contact us to purchase a package."
      : "Havale ve ödeme altyapısı çok yakında. Paket satın almak için bize ulaşın.";

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/60 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
            {locale === "en" ? "Pricing" : "Fiyatlandırma"}
          </p>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl">
            {locale === "en" ? "Credit packages" : "Kredi paketleri"}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
            {locale === "en"
              ? "Choose the package that fits your workflow. Pay by bank transfer — online payment coming soon."
              : "İş akışınıza uygun paketi seçin. Ödeme şimdilik havale ile; online ödeme yakında."}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className="relative flex flex-col rounded-2xl border border-border/80 bg-card p-7 transition-all hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-surface-alt text-accent">
                <Coins size={20} strokeWidth={1.5} />
              </div>

              <h2 className="font-display text-xl font-medium tracking-[-0.02em] text-foreground">{name(pkg)}</h2>

              <div className="mt-6 flex flex-col gap-1 border-t border-border/60 pt-6">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted">
                  {locale === "en" ? "Credits" : "Kredi"}
                </p>
                <p className="font-display text-3xl font-medium tabular-nums text-foreground">
                  {pkg.credits.toLocaleString("tr-TR")}{" "}
                  <span className="text-lg font-normal text-muted">{creditsLabel}</span>
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted">
                  {locale === "en" ? "Price" : "Fiyat"}
                </p>
                <p className="mt-1 font-display text-2xl font-medium tabular-nums text-accent">{tryFmt(pkg.priceTry)}</p>
              </div>

              <Link
                href="/iletisim"
                className="mt-auto flex h-11 items-center justify-center rounded-full bg-accent text-[14px] font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                {buyLabel}
              </Link>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-[13px] leading-relaxed text-muted">{contactHint}</p>
      </div>
    </main>
  );
}
