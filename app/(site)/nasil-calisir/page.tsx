 "use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function NasilCalisirPage() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          title: "How It Works",
          desc: "Learn how the order and design process works with Trend Mücevher. This page will be updated soon.",
        }
      : locale === "de"
        ? {
            title: "Wie Es Funktioniert",
            desc: "Erfahren Sie, wie der Bestell- und Designprozess bei Trend Mücevher funktioniert. Diese Seite wird bald aktualisiert.",
          }
        : locale === "ru"
          ? {
              title: "Как Это Работает",
              desc: "Узнайте, как работает процесс заказа и дизайна в Trend Mücevher. Эта страница скоро будет обновлена.",
            }
          : {
              title: "Nasıl Çalışır",
              desc: "Trend Mücevher ile sipariş ve tasarım sürecinin nasıl işlediğini öğrenin. Bu sayfa yakında güncellenecek.",
            };
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-muted">{copy.desc}</p>
    </main>
  );
}
