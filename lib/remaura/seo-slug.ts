// SEO dostu dosya adı üretimi — Etsy/Google görsel araması için.
// Türkçe karakterleri ASCII'ye indirger, boşluk/sembolleri tireye çevirir.

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u",
};

export function slugify(input: string): string {
  return (input || "")
    .replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // kalan aksanları kaldır
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // alfanümerik dışını tireye
    .replace(/^-+|-+$/g, "") // baş/son tireleri at
    .replace(/-{2,}/g, "-"); // çoklu tireyi tekle
}

/**
 * SEO dosya adı: temel anahtar + sıra + uzantı.
 * Örn. base="Altın Kalp Kolye", i=0 → "altin-kalp-kolye-1.jpg"
 */
export function seoFileName(base: string, index: number, ext = "jpg"): string {
  const slug = slugify(base) || "urun";
  return `${slug}-${index + 1}.${ext}`;
}
