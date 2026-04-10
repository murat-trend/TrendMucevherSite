"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function Remaura3DIntro() {
  const { locale } = useLanguage();
  const copy =
    locale === "en"
      ? {
          desc: "This category has been created. 3D-focused tools will be published on this page.",
          back: "Back to Remaura AI Home",
        }
      : locale === "de"
        ? {
            desc: "Diese Kategorie wurde erstellt. 3D-orientierte Tools werden auf dieser Seite veroffentlicht.",
            back: "Zuruck zur Remaura AI Startseite",
          }
        : locale === "ru"
          ? {
              desc: "Эта категория создана. Инструменты с фокусом на 3D будут опубликованы на этой странице.",
              back: "Вернуться на главную Remaura AI",
            }
          : {
              desc: "Bu kategori oluşturuldu. 3D özellikler bu sayfada yayına alınacak.",
              back: "Remaura AI Ana Sayfasına Dön",
            };

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Remaura AI 3D</h1>
      <p className="mt-3 text-sm text-muted sm:text-base">{copy.desc}</p>
      <div className="mt-6">
        <Link
          href="/remaura"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#b76e79]/70 bg-[#b76e79]/15 px-4 py-2 text-sm font-semibold text-[#b76e79] transition-colors hover:bg-[#b76e79]/20"
        >
          {copy.back}
        </Link>
      </div>
    </>
  );
}

