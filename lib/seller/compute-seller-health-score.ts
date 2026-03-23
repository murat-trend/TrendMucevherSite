/**
 * Satıcı sağlık puanı (0–100): iade oranı + müşteri puanı (yorum ortalaması) ile otomatik hesaplanır.
 * Yorum yoksa (rating = 0) nötr bir taban kullanılır; tamamen yeni satıcılar için sipariş sayısı dikkate alınır.
 */

export type SellerHealthScoreInput = {
  /** Dönem içi iade oranı (%) */
  returnRate: number;
  /** Ortalama müşteri puanı (1–5); henüz yorum yoksa 0 */
  rating: number;
  /** Sipariş adedi (yeni satıcı / veri yokluğu için) */
  orderCount: number;
};

/**
 * - Yorum puanı: en fazla 50 puan (rating/5 × 50). Yorum yoksa 28–40 arası nötr.
 * - İade: en fazla 50 puan; iade oranı %25 ve üzeri bu bileşende 0’a iner.
 */
export function computeSellerHealthScore(input: SellerHealthScoreInput): number {
  const { returnRate, rating, orderCount } = input;
  const rr = Number.isFinite(returnRate) ? Math.max(0, returnRate) : 0;

  let reviewPart: number;
  if (rating > 0) {
    reviewPart = (rating / 5) * 50;
  } else if (orderCount === 0) {
    reviewPart = 40;
  } else {
    reviewPart = 28;
  }

  const refundPart = 50 * (1 - Math.min(rr / 25, 1));

  const raw = reviewPart + refundPart;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function sellerHealthScoreLabel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

export function sellerHealthScoreClass(score: number): string {
  const tone = sellerHealthScoreLabel(score);
  const map: Record<typeof tone, string> = {
    excellent: "text-emerald-300/95",
    good: "text-sky-300/95",
    fair: "text-amber-200/95",
    poor: "text-rose-300/95",
  };
  return map[tone];
}
