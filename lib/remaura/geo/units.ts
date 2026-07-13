// Remaura Geometri Çekirdeği — BİRİM VE TOLERANS TEMELİ
//
// SÖZLEŞME (tüm geo modülleri buna uyar):
//  1. İç birim MİLİMETRE'dir (float64). Mikron/nanometre sadece giriş-çıkış
//     katmanında (UI, rapor, dosya adı) görünür.
//  2. Takı zarfı: |koordinat| <= 500mm varsayılır. Bu zarf içinde float64
//     çözünürlüğü ~0.0000001 µm, float32 (STL) çözünürlüğü ~0.03 µm —
//     yani mikron sözü her iki formatta da matematiksel olarak güvendedir.
//  3. Kodda çıplak tolerans sayısı YASAK — karşılaştırma/kaynak/ölçüm
//     kararları buradaki adlandırılmış sabitlerle verilir. Yeni tolerans
//     gerekiyorsa buraya gerekçesiyle eklenir.
//  4. Uzunluk taşıyan değişken adı birimini taşır: `capMm`, `dozUm` gibi
//     (repo geleneği: minFreeWireMm, polishMm).

// ---- birim çarpanları (mm cinsinden) ----
export const UM = 1e-3; // 1 mikron = 0.001 mm
export const NM = 1e-6; // 1 nanometre = 0.000001 mm
export const CM = 10;
export const JEWELRY_ENVELOPE_MM = 500; // takı zarfı — testler bu zarfı doğrular

// ---- dönüşümler ----
export const umToMm = (um: number): number => um * UM;
export const mmToUm = (mm: number): number => mm / UM;
export const nmToMm = (nm: number): number => nm * NM;
export const mmToNm = (mm: number): number => mm / NM;

// ---- toleranslar (TEK KAYNAK — gerekçesiz sabit eklenmez) ----
/** Sayısal gürültü tabanı (0.0001 µm): float64 işlem artıkları bu seviyede
 *  kalır; "sıfır mı" testleri için. Geometrik karar İÇİN KULLANMA. */
export const EPS_MM = 1e-7;
/** Nokta özdeşliği / vertex kaynağı (0.1 µm): iki nokta bu mesafeden yakınsa
 *  aynı noktadır. STL float32 hatasının (~0.03 µm) güvenli üstü, üretimde
 *  anlamlı en küçük ölçünün (1 µm) güvenli altı. */
export const TOL_POINT_MM = 1e-4;
/** Ölçüm sözü (1 µm): kütüphanenin kullanıcıya verdiği söz — üretilen her
 *  geometrinin ölçüsü, istenen değere bu toleranstan yakın olmalı. */
export const TOL_MEASURE_MM = 1 * UM;
/** Açı özdeşliği: 0.001° (~17.5 µrad). 500mm kolda ~0.009mm yay — açı
 *  karşılaştırmaları için yeterince sıkı, gürültüden yeterince uzak. */
export const TOL_ANGLE_RAD = (0.001 * Math.PI) / 180;

// ---- karşılaştırma ----
export const eqMm = (a: number, b: number, tolMm: number = TOL_MEASURE_MM): boolean =>
  Math.abs(a - b) <= tolMm;
export const isZeroMm = (a: number, tolMm: number = EPS_MM): boolean =>
  Math.abs(a) <= tolMm;
export const samePoint = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  tolMm: number = TOL_POINT_MM,
): boolean => {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz <= tolMm * tolMm;
};

// ---- mikron ızgarası (vertex birleştirme / hash anahtarı) ----
/** Değeri gridUm mikronluk ızgaraya oturtur (varsayılan 0.1 µm = TOL_POINT). */
export function snapUm(mm: number, gridUm = 0.1): number {
  const g = gridUm * UM;
  return Math.round(mm / g) * g;
}
/** Vertex'i hash anahtarına çevirir — TOL_POINT ızgarasında aynı olan iki
 *  nokta aynı anahtarı üretir (mesh kaynak/dedup için). */
export function pointKey(p: readonly [number, number, number], gridUm = 0.1): string {
  const g = gridUm * UM;
  return `${Math.round(p[0] / g)},${Math.round(p[1] / g)},${Math.round(p[2] / g)}`;
}

// ---- açı ----
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

// ---- float32 (STL/GLB) denetimi ----
/** Değerin float32'ye inince uğrayacağı kayıp (mm) — dışa aktarma güvenlik
 *  denetimi: takı zarfında her koordinat için < 0.05 µm olmalı. */
export const f32ErrorMm = (mm: number): number => Math.abs(mm - Math.fround(mm));

// ---- biçimleme / ayrıştırma (UI katmanı) ----
/** "1.234 mm" — CAD gösterimi hep 3 ondalık (mikron basamağı görünür). */
export const fmtMm = (mm: number, digits = 3): string => `${mm.toFixed(digits)} mm`;
/** "250 µm" — ince ölçüler için mikron gösterimi. */
export const fmtUm = (mm: number, digits = 1): string => `${mmToUm(mm).toFixed(digits)} µm`;
/** 1mm altını µm, üstünü mm yazar (rapor metinleri). */
export const fmtAuto = (mm: number): string => (Math.abs(mm) < 1 ? fmtUm(mm, 0) : fmtMm(mm));

/** "1.25mm" | "0,8 mm" | "250µm" | "250 um" | "0.85" (çıplak sayı = mm) → mm.
 *  Geçersiz girişte null (sessiz NaN yayılmasın). */
export function parseLengthMm(input: string): number | null {
  const m = input.trim().toLowerCase().replace(",", ".")
    .match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|um|µm|mikron|nm)?$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!Number.isFinite(v)) return null;
  switch (m[2]) {
    case "cm": return v * CM;
    case "um": case "µm": case "mikron": return umToMm(v);
    case "nm": return nmToMm(v);
    default: return v; // mm ve çıplak sayı
  }
}
