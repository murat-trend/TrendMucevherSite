export type SellerStatus = "active" | "pending" | "suspended";

/** İade adedi bu değerden fazlaysa (>) satıcı adı yanında kırmızı uyarı gösterilir */
export const SELLER_RETURN_WARNING_THRESHOLD = 5;

export function isHighReturnCount(returnCount: number): boolean {
  return returnCount > SELLER_RETURN_WARNING_THRESHOLD;
}

export type Seller = {
  id: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  status: SellerStatus;
  totalSales: number;
  orderCount: number;
  /** Dönem içi iade adedi (sipariş bazlı; eşik üstü uyarı için) */
  returnCount: number;
  returnRate: number;
  rating: number;
  registeredAt: string;
};

export const INITIAL_SELLERS: Seller[] = [
  {
    id: "s1",
    storeName: "Atölye Mara",
    ownerName: "Ayşe Yılmaz",
    ownerEmail: "ayse@atolyemara.com",
    phone: "+90 532 441 22 90",
    status: "active",
    totalSales: 428_600,
    orderCount: 312,
    returnCount: 3,
    returnRate: 1.8,
    rating: 4.8,
    registeredAt: "2024-06-12",
  },
  {
    id: "s2",
    storeName: "Gümüş İşleri Co.",
    ownerName: "Mehmet Kaya",
    ownerEmail: "m.kaya@gumusisleri.co",
    phone: "+90 533 102 88 44",
    status: "pending",
    totalSales: 0,
    orderCount: 0,
    returnCount: 0,
    returnRate: 0,
    rating: 0,
    registeredAt: "2025-03-14",
  },
  {
    id: "s3",
    storeName: "Vintage Koleksiyon",
    ownerName: "Zeynep Arslan",
    ownerEmail: "iletisim@vintagekol.com",
    phone: "+90 216 555 12 01",
    status: "active",
    totalSales: 186_200,
    orderCount: 94,
    returnCount: 2,
    returnRate: 3.2,
    rating: 4.5,
    registeredAt: "2024-11-03",
  },
  {
    id: "s4",
    storeName: "Elmas Evi İstanbul",
    ownerName: "Can Demir",
    ownerEmail: "can.demir@elmasevi.com",
    phone: "+90 212 334 77 66",
    status: "suspended",
    totalSales: 92_400,
    orderCount: 41,
    returnCount: 12,
    returnRate: 8.1,
    rating: 3.9,
    registeredAt: "2023-09-21",
  },
  {
    id: "s5",
    storeName: "Luna İnci Atölyesi",
    ownerName: "Elif Şahin",
    ownerEmail: "elif@lunainci.com",
    phone: "+90 544 221 09 18",
    status: "active",
    totalSales: 264_900,
    orderCount: 178,
    returnCount: 4,
    returnRate: 2.1,
    rating: 4.9,
    registeredAt: "2024-02-28",
  },
  {
    id: "s6",
    storeName: "Minimal Altın",
    ownerName: "Burak Öztürk",
    ownerEmail: "burak@minimalaltin.com",
    phone: "+90 535 778 44 33",
    status: "pending",
    totalSales: 0,
    orderCount: 0,
    returnCount: 0,
    returnRate: 0,
    rating: 0,
    registeredAt: "2025-03-10",
  },
  {
    id: "s7",
    storeName: "Osmanlı Hat Sanatı",
    ownerName: "Hakan Yıldız",
    ownerEmail: "h.yildiz@osmanlihat.com",
    phone: "+90 312 445 90 12",
    status: "active",
    totalSales: 512_000,
    orderCount: 401,
    returnCount: 6,
    returnRate: 1.2,
    rating: 4.7,
    registeredAt: "2023-04-15",
  },
  {
    id: "s8",
    storeName: "Pırlanta Loft",
    ownerName: "Selin Acar",
    ownerEmail: "selin@pirlantaloft.com",
    phone: "+90 542 889 00 77",
    status: "active",
    totalSales: 338_750,
    orderCount: 205,
    returnCount: 8,
    returnRate: 2.4,
    rating: 4.6,
    registeredAt: "2024-08-01",
  },
];
