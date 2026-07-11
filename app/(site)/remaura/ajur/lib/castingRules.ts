// ---------------------------------------------------------------------------
// DÖKÜM KURALLARI — tek kaynak (kullanıcı direktifi 2026-07-11):
// Eşikler keyfi değil; GIA + akademik/sektörel döküm literatürüne dayalı.
// Sonraki faz (üretim pipeline / mesh analiz + akışkanlık raporu) bu tabloyu
// genişletecek — yeni eşik eklerken KAYNAK yaz.
//
// Kaynak özeti (2026-07 taraması):
//  - Gümüş (925): min duvar ≥0.8 mm, yüzükte 1.0 mm önerilir; <0.8 mm tel/köprü
//    takımada eğilir/kırılır. (Castimize silver casting guide; Santa Fe Jewelers
//    Supply custom casting info)
//  - Altın: gümüşten ince kalabilir (alaşım daha rijit); master'da 0.6 mm plaka
//    dökülebilir → cila sonrası 0.5-0.6 mm. 3D baskı→döküm akışında genel min
//    0.8 mm, ince şank bantları ≥1.0 mm. (jewelry-project.com metal spec;
//    i.materialise gold design guide; Castimize gold casting guide)
//  - İnce kesitlerde eksik dolum/porozite riski; ince ajur/dantel işi daha
//    sıcak flask ister → akışkanlık metal + kesite bağlı. (Formlabs castable
//    wax casting guide; Investment Casting of Gold Jewellery, Gold Bulletin/
//    Springer; Santa Fe Symposium casting simulation literatürü)
// ---------------------------------------------------------------------------

/** mesh-temizle METALS id'leriyle hizalı metal anahtarı */
export type MetalKey = "ag925" | "au14" | "au18" | "au22" | "pt";

export type CastingRule = {
  /** mutlak alt sınır — altı KIRMIZI (döküm riski yüksek) */
  minWallHardMm: number;
  /** önerilen min duvar — altı AMBER uyarı */
  minWallSoftMm: number;
  /** ajur köprüsü (delikler arası et) için min genişlik */
  minBridgeMm: number;
  /** ajur açılacak duvar için önerilen kalınlık (PRD: bilgi notu, zorlama yok) */
  ajourWallRecommendMm: number;
  /** dolum güçlüğü katsayısı (1 = kolay akar) — akışkanlık raporu tohumu */
  fillDifficulty: number;
  /** çekme payı önerisi (%) — döküm küçülmesi telafisi; model export'ta bu
   *  oranda büyütülür. Kaynak: investment casting toplam küçülme tipik
   *  %1.25–2.5 (metal + kalıp; Formlabs casting guide, Gold Bulletin/Springer
   *  investment casting literatürü). Platin daha yüksek (literatür pası: faz 2). */
  shrinkagePct: number;
};

export const CASTING_RULES: Record<MetalKey, CastingRule> = {
  // Gümüş yumuşak + dolumu daha zor → muhafazakâr eşikler.
  ag925: { minWallHardMm: 0.7, minWallSoftMm: 0.8, minBridgeMm: 0.8, ajourWallRecommendMm: 1.0, fillDifficulty: 1.25, shrinkagePct: 2.0 },
  // Altın alaşımları daha rijit; 14K ile 18K pratikte yakın eşikler.
  au14: { minWallHardMm: 0.6, minWallSoftMm: 0.8, minBridgeMm: 0.7, ajourWallRecommendMm: 1.0, fillDifficulty: 1.0, shrinkagePct: 1.5 },
  au18: { minWallHardMm: 0.6, minWallSoftMm: 0.8, minBridgeMm: 0.7, ajourWallRecommendMm: 1.0, fillDifficulty: 1.1, shrinkagePct: 1.5 },
  // 22K çok yumuşak → gümüşe yakın yapısal eşikler (literatür pası: sonraki faz).
  au22: { minWallHardMm: 0.7, minWallSoftMm: 0.9, minBridgeMm: 0.8, ajourWallRecommendMm: 1.1, fillDifficulty: 1.15, shrinkagePct: 1.8 },
  // Platin: yüksek ergime/dolum güçlüğü + yüksek küçülme (literatür pası: sonraki faz).
  pt: { minWallHardMm: 0.6, minWallSoftMm: 0.8, minBridgeMm: 0.7, ajourWallRecommendMm: 1.0, fillDifficulty: 1.4, shrinkagePct: 2.5 },
};

/** PRD §8 mutlak taban — metal seçilmemişken kullanılan en gevşek alt sınır. */
export const MIN_WALL_FLOOR_MM = 0.6;

export const ruleFor = (metal: MetalKey): CastingRule => CASTING_RULES[metal];
