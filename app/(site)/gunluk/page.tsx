 "use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function GunlukPage() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          title: "Daily",
          desc: "Daily content and current updates. This page will be updated soon.",
        }
      : locale === "de"
        ? {
            title: "Täglich",
            desc: "Tägliche Inhalte und aktuelle Updates. Diese Seite wird bald aktualisiert.",
          }
        : locale === "ru"
          ? {
              title: "Ежедневно",
              desc: "Ежедневный контент и актуальные обновления. Эта страница скоро будет обновлена.",
            }
          : {
              title: "Günlük",
              desc: "Günlük içerikler ve güncel haberler. Bu sayfa yakında güncellenecek.",
            };
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-muted">{copy.desc}</p>
    </main>
  );
}
