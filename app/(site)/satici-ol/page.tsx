 "use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function SaticiOlPage() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          title: "Become a Seller",
          desc: "List your products on our platform. Seller application process will be added soon.",
        }
      : locale === "de"
        ? {
            title: "Verkäufer Werden",
            desc: "Bieten Sie Ihre Produkte auf unserer Plattform an. Der Bewerbungsprozess für Verkäufer wird bald hinzugefügt.",
          }
        : locale === "ru"
          ? {
              title: "Стать Продавцом",
              desc: "Размещайте свои товары на нашей платформе. Процесс подачи заявки для продавцов скоро будет добавлен.",
            }
          : {
              title: "Satıcı Ol",
              desc: "Platformumuzda ürünlerinizi satışa sunun. Satıcı başvuru süreci yakında eklenecek.",
            };
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-muted">{copy.desc}</p>
    </main>
  );
}
