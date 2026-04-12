import { headers } from "next/headers";
import type { Seller } from "./types";

export type SellerTabOrder = {
  id: string;
  orderNo: string;
  date: string;
  amount: number;
  status: string;
};

export type SellerTabProduct = {
  id: string;
  name: string;
  sku: string;
  sales: number;
  revenue: number;
};

export type SellerTabPayment = {
  id: string;
  date: string;
  amount: number;
  type: string;
  status: string;
};

export type SellerTabReview = {
  id: string;
  date: string;
  rating: number;
  excerpt: string;
  buyer: string;
};

export type SellerDetail = Seller & {
  totalEarnings: number;
  platformCommission: number;
  sellerBalance: number;
  pendingPayout: number;
  last30DaysSales: number;
  salesTrend30d: number[];
  topProduct: string;
  complaintsCount: number;
  fraudFlag: boolean;
  healthMessage: string;
  orders: SellerTabOrder[];
  products: SellerTabProduct[];
  payments: SellerTabPayment[];
  reviews: SellerTabReview[];
};

function seededRandom(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1103515245 + 12345) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

function buildTrend(last30: number, id: string): number[] {
  const rnd = seededRandom(id);
  const avg = last30 / 30;
  return Array.from({ length: 30 }, (_, i) => {
    const wave = Math.sin((i / 30) * Math.PI * 2) * avg * 0.08;
    const drift = (i / 29) * avg * 0.12;
    const noise = (rnd() - 0.5) * avg * 0.25;
    return Math.max(0, Math.round(avg + wave + drift + noise));
  });
}

function defaultTabs(s: Seller): {
  orders: SellerTabOrder[];
  products: SellerTabProduct[];
  payments: SellerTabPayment[];
  reviews: SellerTabReview[];
} {
  if (s.status === "pending") {
    return { orders: [], products: [], payments: [], reviews: [] };
  }

  return {
    orders: [
      {
        id: `${s.id}-o1`,
        orderNo: `TM-${s.id.toUpperCase()}-9021`,
        date: "2025-03-12",
        amount: Math.round(s.totalSales * 0.04) || 12_400,
        status: "Tamamlandı",
      },
      {
        id: `${s.id}-o2`,
        orderNo: `TM-${s.id.toUpperCase()}-9018`,
        date: "2025-03-10",
        amount: Math.round(s.totalSales * 0.035) || 9_800,
        status: "Kargoda",
      },
      {
        id: `${s.id}-o3`,
        orderNo: `TM-${s.id.toUpperCase()}-9007`,
        date: "2025-03-08",
        amount: Math.round(s.totalSales * 0.028) || 7_200,
        status: "Hazırlanıyor",
      },
    ],
    products: [
      {
        id: `${s.id}-p1`,
        name: "Öne çıkan ürün — koleksiyon",
        sku: `SKU-${s.id}-001`,
        sales: Math.max(8, Math.round(s.orderCount * 0.12)),
        revenue: Math.round(s.totalSales * 0.18),
      },
      {
        id: `${s.id}-p2`,
        name: "İkinci ürün hattı",
        sku: `SKU-${s.id}-014`,
        sales: Math.max(5, Math.round(s.orderCount * 0.09)),
        revenue: Math.round(s.totalSales * 0.11),
      },
      {
        id: `${s.id}-p3`,
        name: "Aksesuar seti",
        sku: `SKU-${s.id}-022`,
        sales: Math.max(4, Math.round(s.orderCount * 0.06)),
        revenue: Math.round(s.totalSales * 0.07),
      },
    ],
    payments: [
      {
        id: `${s.id}-pay1`,
        date: "2025-03-11",
        amount: Math.round(s.totalSales * 0.06) || 24_000,
        type: "Haftalık ödeme",
        status: "Ödendi",
      },
      {
        id: `${s.id}-pay2`,
        date: "2025-03-04",
        amount: Math.round(s.totalSales * 0.055) || 21_500,
        type: "Haftalık ödeme",
        status: "Ödendi",
      },
      {
        id: `${s.id}-pay3`,
        date: "2025-02-25",
        amount: Math.round(s.totalSales * 0.048) || 18_200,
        type: "Düzeltme",
        status: "Bekliyor",
      },
    ],
    reviews: [
      {
        id: `${s.id}-r1`,
        date: "2025-03-09",
        rating: Math.min(5, Math.max(3, s.rating)),
        excerpt: "Paketleme ve teslimat çok iyiydi.",
        buyer: "Müşteri A**",
      },
      {
        id: `${s.id}-r2`,
        date: "2025-03-01",
        rating: Math.min(5, Math.max(3, s.rating - 0.2)),
        excerpt: "Ürün fotoğrafla uyumlu, memnun kaldım.",
        buyer: "Müşteri B**",
      },
    ],
  };
}

function buildDetail(s: Seller): SellerDetail {
  const commissionRate = 0.12;
  const platformCommission = Math.round(s.totalSales * commissionRate);
  const totalEarnings = Math.max(0, Math.round(s.totalSales - platformCommission));
  const sellerBalance = Math.round(totalEarnings * 0.42);
  const pendingPayout = Math.round(totalEarnings * 0.14);
  const last30DaysSales = Math.max(0, Math.round(s.totalSales * (0.08 + seededRandom(s.id)() * 0.06)));

  const topProduct =
    s.id === "s1"
      ? "Elmas Yüzük — Aurora"
      : s.id === "s7"
        ? "Hat Sanatı Kolye — İstanbul"
        : `${s.storeName.split(" ")[0] ?? "Mağaza"} — öne çıkan ürün`;

  const fraudFlag = s.status === "suspended" || s.returnRate > 7;
  const complaintsCount = Math.max(0, Math.floor(s.orderCount * 0.018 + (s.returnRate > 5 ? 3 : 0)));

  let healthMessage = "Hesap sağlıklı görünüyor. Performans hedefleriyle uyumlu.";
  if (s.status === "suspended") {
    healthMessage = "Hesap askıya alındı. Satış ve ödemeler durduruldu.";
  } else if (fraudFlag) {
    healthMessage = "Yüksek iade veya risk sinyalleri için ek inceleme önerilir.";
  } else if (s.returnRate > 4) {
    healthMessage = "İade oranı sektör ortalamasının üzerinde; operasyon kontrolü faydalı olabilir.";
  }

  const tabs = defaultTabs(s);

  return {
    ...s,
    totalEarnings,
    platformCommission,
    sellerBalance,
    pendingPayout,
    last30DaysSales,
    salesTrend30d: buildTrend(last30DaysSales || Math.round(s.totalSales * 0.05) || 1200, s.id),
    topProduct,
    complaintsCount,
    fraudFlag,
    healthMessage,
    orders: tabs.orders,
    products: tabs.products,
    payments: tabs.payments,
    reviews: tabs.reviews,
  };
}

/** İstemci tarafında durum güncellemesi sonrası tam detayı yeniden üretmek için. */
export function buildSellerDetailFromSeller(s: Seller): SellerDetail {
  return buildDetail(s);
}

async function fetchSellerFromAdminApi(id: string): Promise<Seller | null> {
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  const url = `${origin}/api/admin/sellers?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { seller?: Seller; error?: string };
  if (!data.seller || data.error) return null;
  return data.seller;
}

export async function getSellerDetail(id: string): Promise<SellerDetail | null> {
  const s = await fetchSellerFromAdminApi(id);
  if (!s) return null;
  return buildDetail(s);
}
