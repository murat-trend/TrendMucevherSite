 "use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function IletisimPage() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          title: "Contact",
          desc: "You can use this page to get in touch with us. A contact form will be added soon.",
        }
      : locale === "de"
        ? {
            title: "Kontakt",
            desc: "Sie können diese Seite nutzen, um uns zu kontaktieren. Ein Kontaktformular wird bald hinzugefügt.",
          }
        : locale === "ru"
          ? {
              title: "Контакты",
              desc: "Используйте эту страницу, чтобы связаться с нами. Форма обратной связи скоро появится.",
            }
          : {
              title: "İletişim",
              desc: "Bizimle iletişime geçmek için bu sayfayı kullanabilirsiniz. İletişim formu yakında eklenecek.",
            };
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-muted">{copy.desc}</p>
    </main>
  );
}
