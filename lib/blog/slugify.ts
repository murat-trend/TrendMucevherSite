/** Başlıktan URL uyumlu slug (Türkçe karakterler ASCII’ye çevrilir). */
export function generateSlug(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return s || "yazi";
}

/** @deprecated Kullanım: `generateSlug` */
export function slugifyTitle(title: string): string {
  return generateSlug(title);
}
