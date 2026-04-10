"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { RemauraLandingHeader } from "@/components/remaura/RemauraLandingHeader";

type HeaderVariant = "main" | "photoEdit" | "backgroundRemoval" | "cadCoach";

export function RemauraLocalizedLandingHeader({ variant }: { variant: HeaderVariant }) {
  const { locale } = useLanguage();

  const copy = (() => {
    if (locale === "en") {
      return {
        main: {
          title: "Prepare Jewelry Visuals in Minutes with Remaura AI",
          description:
            "Clean the background, tune metal tone, and download in the right format for ecommerce and social media in one click.",
        },
        photoEdit: {
          title: "Photo Edit Category",
          description: "Access fast tools to edit phone-captured product visuals from this page.",
        },
        backgroundRemoval: {
          title: "Background Removal Tool",
          description:
            "Start processing directly here to adapt jewelry visuals for marketplace and ecommerce standards.",
        },
        cadCoach: {
          title: "Rhino Ring Tutor",
          description:
            "Interactive ring modeling tutor for Rhino and MatrixGold workflows. Learn method, order, and connection logic step by step.",
        },
      } as const;
    }
    if (locale === "de") {
      return {
        main: {
          title: "Schmuckvisuals mit Remaura AI in Minuten vorbereiten",
          description:
            "Hintergrund bereinigen, Metallton anpassen und mit einem Klick im passenden Format für E‑Commerce und Social Media herunterladen.",
        },
        photoEdit: {
          title: "Foto-Edit Kategorie",
          description: "Greifen Sie auf dieser Seite auf schnelle Tools zur Bearbeitung von Handy-Produktfotos zu.",
        },
        backgroundRemoval: {
          title: "Werkzeug zur Hintergrundentfernung",
          description:
            "Starten Sie die Verarbeitung direkt hier, um Schmuckbilder an Marktplatz- und E‑Commerce-Standards anzupassen.",
        },
        cadCoach: {
          title: "Rhino Ring Tutor",
          description:
            "Interaktiver Ringmodellierungs-Tutor für Rhino- und MatrixGold-Workflows. Lernen Sie Methode, Reihenfolge und Verbindungslogik Schritt für Schritt.",
        },
      } as const;
    }
    if (locale === "ru") {
      return {
        main: {
          title: "Готовьте ювелирные визуалы за минуты с Remaura AI",
          description:
            "Очистите фон, настройте тон металла и скачайте в нужном формате для e‑commerce и соцсетей в один клик.",
        },
        photoEdit: {
          title: "Категория Фото-Редактирования",
          description: "Получите быстрые инструменты для редактирования фото товаров, снятых на телефон.",
        },
        backgroundRemoval: {
          title: "Инструмент удаления фона",
          description:
            "Начните обработку прямо здесь, чтобы адаптировать изображения украшений под маркетплейсы и e‑commerce.",
        },
        cadCoach: {
          title: "Rhino Ring Tutor",
          description:
            "Интерактивный тьютор по моделированию колец для Rhino и MatrixGold. Изучайте метод, порядок и логику связей шаг за шагом.",
        },
      } as const;
    }
    return {
      main: {
        title: "Remaura AI ile Takı Görsellerini Dakikalar İçinde Hazırla",
        description:
          "Arka planı temizle, metal tonunu düzelt, e-ticaret ve sosyal medya için tek tıkla doğru formatta indir.",
      },
      photoEdit: {
        title: "Foto Edit Kategorisi",
        description:
          "Telefonla çekilen ürün görsellerini düzenlemek için hızlı araçlara bu sayfadan ulaşın.",
      },
      backgroundRemoval: {
        title: "Arka Plan Kaldırma Aracı",
        description:
          "Takı görsellerini pazar yeri ve e-ticaret standartlarına uygun hale getirmek için doğrudan bu ekrandan işleme başlayın.",
      },
      cadCoach: {
        title: "Rhino Ring Tutor",
        description:
          "Interactive ring modeling tutor for Rhino and MatrixGold workflows. Learn method, order, and connection logic step by step.",
      },
    } as const;
  })();

  const content = copy[variant];
  return <RemauraLandingHeader title={content.title} description={content.description} />;
}

