 "use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function HakkimizdaPage() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          title: "About Us",
          desc: "Information about Trend Mücevher and Murat Kaynaroğlu. This page will be updated soon.",
        }
      : locale === "de"
        ? {
            title: "Über Uns",
            desc: "Informationen über Trend Mücevher und Murat Kaynaroğlu. Diese Seite wird bald aktualisiert.",
          }
        : locale === "ru"
          ? {
              title: "О Нас",
              desc: "Информация о Trend Mücevher и Мурате Кайнароглу. Эта страница скоро будет обновлена.",
            }
          : {
              title: "Hakkımızda",
              desc: "Trend Mücevher ve Murat Kaynaroğlu hakkında bilgi. Bu sayfa yakında güncellenecek.",
            };
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-muted">{copy.desc}</p>
    </main>
  );
}
