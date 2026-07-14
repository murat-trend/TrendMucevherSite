// Remaura USTA DAVET KODLARI — sunucu tarafı (client'a asla import edilmez;
// sadece /api/remaura/davet route'u okur). Usta eklemek = satır ekle + deploy.
// Kod kategoriye kilitlidir: usta yalnız o araca girer. İptal = satırı sil.

export type DavetKaydi = {
  ad: string;          // ustanın adı (log/selamlama için)
  kategori: string;    // RemauraAccessGate categoryId — SADECE bu araca erişir
  sonTarih: string;    // YYYY-MM-DD — bu tarihten sonra kod geçersiz
};

export const DAVET_KODLARI: Record<string, DavetKaydi> = {
  // Telkari (geometri) ustaları
  "usta-aliyabaci-t7k4m9x2": { ad: "AliYabacı", kategori: "geometri", sonTarih: "2026-12-31" },
};
