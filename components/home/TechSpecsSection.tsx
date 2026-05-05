"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy: Record<string, { headline: string; items: string[] }> = {
  tr: {
    headline: "Pakette ne var",
    items: [
      "STL dosyası — 3D baskı, CNC üretim, döküm için",
      "GLB dosyası — web görüntüleme, AR, render",
      "Watertight, casting-ready geometri",
      "Endüstri standardı kalınlık ve tolerans değerleri",
      "Ticari lisans — atölyenizde üretip satabilirsiniz",
      "Anında dijital teslimat — sipariş sonrası direkt indirme",
    ],
  },
  en: {
    headline: "What's in the package",
    items: [
      "STL file — for 3D printing, CNC production, casting",
      "GLB file — for web viewing, AR, rendering",
      "Watertight, casting-ready geometry",
      "Industry-standard thickness and tolerance values",
      "Commercial license — produce and sell in your own workshop",
      "Instant digital delivery — direct download after order",
    ],
  },
  de: {
    headline: "Was ist im Paket enthalten",
    items: [
      "STL-Datei — für 3D-Druck, CNC-Produktion, Guss",
      "GLB-Datei — für Web-Viewer, AR, Rendering",
      "Wasserdichte, gussbereite Geometrie",
      "Branchenübliche Dicken- und Toleranzwerte",
      "Gewerbliche Lizenz — produzieren und verkaufen Sie in Ihrer Werkstatt",
      "Sofortige digitale Lieferung — direkter Download nach der Bestellung",
    ],
  },
  ru: {
    headline: "Что входит в пакет",
    items: [
      "STL-файл — для 3D-печати, CNC-производства, литья",
      "GLB-файл — для веб-просмотра, AR, рендеринга",
      "Герметичная геометрия, готовая к литью",
      "Стандартные отраслевые значения толщины и допусков",
      "Коммерческая лицензия — производите и продавайте в своей мастерской",
      "Мгновенная цифровая доставка — прямое скачивание после заказа",
    ],
  },
};

export function TechSpecsSection() {
  const { locale } = useLanguage();
  const c = copy[locale] ?? copy.tr;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="font-display mb-6 text-2xl font-light tracking-wide text-foreground sm:text-3xl">
        {c.headline}
      </h2>
      <ul className="space-y-3">
        {c.items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-muted sm:text-[15px]">
            <span className="mt-[2px] shrink-0 text-[#c9a84c]">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
