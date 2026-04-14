import type { Locale } from "@/lib/i18n/translations";
import type { Ui3DModel } from "@/lib/modeller/supabase";

const LABELS: Record<Locale, Record<Ui3DModel["jewelryType"], string>> = {
  tr: {
    Yüzük: "Yüzük",
    Kolye: "Kolye",
    Bilezik: "Bilezik",
    Küpe: "Küpe",
    Broş: "Broş",
  },
  en: {
    Yüzük: "Ring",
    Kolye: "Necklace",
    Bilezik: "Bracelet",
    Küpe: "Earrings",
    Broş: "Brooch",
  },
  de: {
    Yüzük: "Ring",
    Kolye: "Halskette",
    Bilezik: "Armreif",
    Küpe: "Ohrringe",
    Broş: "Brosche",
  },
  ru: {
    Yüzük: "Кольцо",
    Kolye: "Колье",
    Bilezik: "Браслет",
    Küpe: "Серьги",
    Broş: "Брошь",
  },
};

export function jewelryTypeLabel(type: Ui3DModel["jewelryType"], locale: string): string {
  const loc = (LABELS[locale as Locale] ? locale : "tr") as Locale;
  return LABELS[loc][type] ?? type;
}
