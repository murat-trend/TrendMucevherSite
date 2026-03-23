/** Ürün denetim detayı — p1…p10 ile liste sayfası uyumlu */

export type ProductModerationStatus =
  | "Onay Bekliyor"
  | "Yayında"
  | "Reddedildi"
  | "Taslak"
  | "İnceleme Gerekiyor";

export type RiskLevel = "Düşük" | "Orta" | "Yüksek";

export type ProductVariantRow = {
  id: string;
  label: string;
  sku: string;
  price: number;
  stock: number;
  status: string;
};

export type ProductDetailFull = {
  id: string;
  name: string;
  sku: string;
  seller: string;
  sellerStatus: "Aktif" | "Bekleyen" | "Askıda";
  category: string;
  createdAt: string;
  updatedAt: string;
  shortDescription: string;
  longDescription: string;
  status: ProductModerationStatus;
  risk: RiskLevel;
  riskScore: number;
  price: number;
  stock: number;
  variantCount: number;
  compareAtPrice: number | null;
  lowStockWarning: boolean;
  priceAnomaly: boolean;
  images: { id: string; alt: string }[];
  variants: ProductVariantRow[];
  contentChecks: {
    descriptionOk: boolean;
    categoryMatch: boolean;
    bannedPhrases: boolean;
    duplicateContentRisk: boolean;
  };
  sellerTotalSales: number;
  sellerReturnRate: number;
  sellerRating: number;
  moderationChecks: {
    imagesOk: boolean;
    categoryOk: boolean;
    descriptionOk: boolean;
    priceOk: boolean;
    stockOk: boolean;
    policyOk: boolean;
  };
  riskFlags: {
    duplicateProduct: boolean;
    suspiciousWording: boolean;
    missingCategory: boolean;
    missingMedia: boolean;
    manualNote: string | null;
  };
  tabNotes: { id: string; at: string; author: string; text: string }[];
  tabHistory: { id: string; at: string; action: string; detail: string }[];
  tabMessages: { id: string; at: string; from: string; text: string }[];
  similarProducts: { id: string; name: string; sku: string; seller: string }[];
};

const RISK_SCORE: Record<RiskLevel, number> = {
  Düşük: 24,
  Orta: 52,
  Yüksek: 81,
};

function build(id: string, patch: Partial<ProductDetailFull> & Pick<ProductDetailFull, "name" | "sku" | "seller" | "category" | "price" | "stock" | "status" | "risk" | "createdAt" | "updatedAt">): ProductDetailFull {
  const rs = RISK_SCORE[patch.risk!] + (id.charCodeAt(1) % 12);
  const images =
    patch.images !== undefined
      ? patch.images
      : [
          { id: `${id}-img1`, alt: "Ön görünüm" },
          { id: `${id}-img2`, alt: "Yan" },
          { id: `${id}-img3`, alt: "Detay" },
          { id: `${id}-img4`, alt: "Kutu" },
        ];
  const variants =
    patch.variants ??
    ([
      {
        id: `${id}-v1`,
        label: "Standart",
        sku: `${patch.sku}-STD`,
        price: patch.price!,
        stock: Math.max(0, patch.stock! - 1),
        status: patch.status === "Yayında" ? "Aktif" : "Beklemede",
      },
      {
        id: `${id}-v2`,
        label: "Büyük beden",
        sku: `${patch.sku}-L`,
        price: Math.round(patch.price! * 1.08),
        stock: Math.min(5, patch.stock!),
        status: patch.status === "Yayında" ? "Aktif" : "Beklemede",
      },
    ] as ProductVariantRow[]);

  return {
    id,
    name: patch.name!,
    sku: patch.sku!,
    seller: patch.seller!,
    sellerStatus: patch.sellerStatus ?? "Aktif",
    category: patch.category!,
    createdAt: patch.createdAt!,
    updatedAt: patch.updatedAt!,
    shortDescription:
      patch.shortDescription ??
      `${patch.name} — ${patch.category} kategorisinde, el işçiliği ve sertifikalı taş seçenekleri.`,
    longDescription:
      patch.longDescription ??
      "Ürün açıklaması: malzeme, ölçü ve bakım bilgileri satıcı tarafından girildi. Trend Mücevher içerik politikasına göre otomatik tarama yapıldı.",
    status: patch.status!,
    risk: patch.risk!,
    riskScore: patch.riskScore ?? rs,
    price: patch.price!,
    stock: patch.stock!,
    variantCount: patch.variantCount ?? variants.length,
    compareAtPrice: patch.compareAtPrice ?? (patch.price! > 15000 ? Math.round(patch.price! * 1.12) : null),
    lowStockWarning: patch.lowStockWarning ?? patch.stock! <= 3,
    priceAnomaly: patch.priceAnomaly ?? false,
    images,
    variants,
    contentChecks: patch.contentChecks ?? {
      descriptionOk: true,
      categoryMatch: true,
      bannedPhrases: false,
      duplicateContentRisk: id === "p9",
    },
    sellerTotalSales: patch.sellerTotalSales ?? 428_000,
    sellerReturnRate: patch.sellerReturnRate ?? 2.1,
    sellerRating: patch.sellerRating ?? 4.7,
    moderationChecks: patch.moderationChecks ?? {
      imagesOk: images.length > 0,
      categoryOk: true,
      descriptionOk: true,
      priceOk: !patch.priceAnomaly,
      stockOk: patch.stock! >= 0,
      policyOk: true,
    },
    riskFlags: patch.riskFlags ?? {
      duplicateProduct: id === "p9",
      suspiciousWording: id === "p7" || id === "p10",
      missingCategory: false,
      missingMedia: images.length === 0,
      manualNote:
        id === "p10"
          ? "Yüksek fiyatlı yüzük — ek doğrulama ve sertifika PDF talebi önerilir."
          : id === "p4"
            ? "Stok sıfır, yayında — operasyon ile uyum kontrolü."
            : null,
    },
    tabNotes: patch.tabNotes ?? [
      { id: "n1", at: patch.updatedAt!, author: "moderasyon@trend.com", text: "İlk otomatik skor tamamlandı." },
    ],
    tabHistory: patch.tabHistory ?? [
      { id: "h1", at: patch.updatedAt!, action: "Fiyat güncellendi", detail: tryFmt(patch.price!) },
    ],
    tabMessages: patch.tabMessages ?? [],
    similarProducts:
      patch.similarProducts ??
      [
        { id: "sim1", name: "Benzer yüzük — Nova", sku: "TM-YZ-88001", seller: patch.seller! },
        { id: "sim2", name: "Benzer yüzük — Vega", sku: "TM-YZ-88002", seller: "Pırlanta Loft" },
      ],
  };
}

function tryFmt(n: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);
}

const DETAILS: ProductDetailFull[] = [
  build("p1", {
    name: "Elmas Yüzük — Aurora",
    sku: "TM-YZ-90421",
    seller: "Atölye Mara",
    category: "Yüzük",
    price: 24_800,
    stock: 6,
    status: "Onay Bekliyor",
    risk: "Orta",
    createdAt: "2025-03-14T08:00:00",
    updatedAt: "2025-03-14T10:00:00",
    tabMessages: [{ id: "m1", at: "2025-03-14T09:00:00", from: "Atölye Mara", text: "Ürün fotoğrafları güncellendi, tekrar inceler misiniz?" }],
  }),
  build("p2", {
    name: "İnci Kolye — Luna",
    sku: "TM-KL-88201",
    seller: "Luna İnci Atölyesi",
    category: "Kolye",
    price: 9_200,
    stock: 42,
    status: "Yayında",
    risk: "Düşük",
    createdAt: "2025-02-20T10:00:00",
    updatedAt: "2025-03-12T09:30:00",
    sellerTotalSales: 264_000,
  }),
  build("p3", {
    name: "Hat Sanatı Madalyon",
    sku: "TM-MD-77102",
    seller: "Osmanlı Hat Sanatı",
    category: "Madalyon",
    price: 18_500,
    stock: 3,
    status: "Yayında",
    risk: "Yüksek",
    createdAt: "2025-01-10T12:00:00",
    updatedAt: "2025-03-13T14:00:00",
    priceAnomaly: true,
    riskFlags: {
      duplicateProduct: false,
      suspiciousWording: false,
      missingCategory: false,
      missingMedia: false,
      manualNote: "Kategori önerisi: Madalyon + Antik koleksiyon etiketi eklenebilir.",
    },
  }),
  build("p4", {
    name: "Minimal Altın Bilezik",
    sku: "TM-BL-66009",
    seller: "Minimal Altın",
    category: "Bilezik",
    price: 44_000,
    stock: 0,
    status: "Yayında",
    risk: "Yüksek",
    createdAt: "2024-12-05T09:00:00",
    updatedAt: "2025-03-11T11:20:00",
    lowStockWarning: true,
    compareAtPrice: 48_000,
  }),
  build("p5", {
    name: "Pırlanta Küpe — Solstice",
    sku: "TM-KP-55188",
    seller: "Pırlanta Loft",
    category: "Küpe",
    price: 32_400,
    stock: 8,
    status: "Reddedildi",
    risk: "Orta",
    createdAt: "2025-03-08T11:00:00",
    updatedAt: "2025-03-09T16:00:00",
    moderationChecks: {
      imagesOk: true,
      categoryOk: false,
      descriptionOk: true,
      priceOk: true,
      stockOk: true,
      policyOk: false,
    },
  }),
  build("p6", {
    name: "Vintage Gümüş Set",
    sku: "TM-SET-44001",
    seller: "Vintage Koleksiyon",
    category: "Set",
    price: 11_900,
    stock: 15,
    status: "Taslak",
    risk: "Düşük",
    createdAt: "2025-03-13T14:00:00",
    updatedAt: "2025-03-13T18:00:00",
    images: [],
    variants: [
      {
        id: "p6-v1",
        label: "Tek beden",
        sku: "TM-SET-44001-1",
        price: 11_900,
        stock: 15,
        status: "Taslak",
      },
    ],
    variantCount: 1,
    riskFlags: {
      duplicateProduct: false,
      suspiciousWording: false,
      missingCategory: true,
      missingMedia: true,
      manualNote: null,
    },
    moderationChecks: {
      imagesOk: false,
      categoryOk: false,
      descriptionOk: false,
      priceOk: true,
      stockOk: true,
      policyOk: true,
    },
  }),
  build("p7", {
    name: "Rose Gold Yüzük",
    sku: "TM-YZ-33210",
    seller: "Atölye Mara",
    category: "Yüzük",
    price: 19_200,
    stock: 22,
    status: "İnceleme Gerekiyor",
    risk: "Yüksek",
    createdAt: "2025-03-12T10:00:00",
    updatedAt: "2025-03-14T08:15:00",
    contentChecks: {
      descriptionOk: false,
      categoryMatch: true,
      bannedPhrases: true,
      duplicateContentRisk: false,
    },
    riskFlags: {
      duplicateProduct: false,
      suspiciousWording: true,
      missingCategory: false,
      missingMedia: false,
      manualNote: "Açıklamada abartılı vaat ifadeleri tespit edildi.",
    },
  }),
  build("p8", {
    name: "Gümüş Zincir Kolye",
    sku: "TM-KL-22100",
    seller: "Gümüş İşleri Co.",
    category: "Kolye",
    price: 3_450,
    stock: 120,
    status: "Yayında",
    risk: "Düşük",
    createdAt: "2024-11-01T08:00:00",
    updatedAt: "2025-03-01T12:00:00",
  }),
  build("p9", {
    name: "Test Ürünü (kopya)",
    sku: "TM-DUP-11002",
    seller: "Pırlanta Loft",
    category: "Yüzük",
    price: 24_800,
    stock: 4,
    status: "İnceleme Gerekiyor",
    risk: "Orta",
    createdAt: "2025-03-11T09:00:00",
    updatedAt: "2025-03-13T17:45:00",
    riskFlags: {
      duplicateProduct: true,
      suspiciousWording: true,
      missingCategory: false,
      missingMedia: false,
      manualNote: "SKU ve görsel hash başka ürünle eşleşti.",
    },
  }),
  build("p10", {
    name: "Elmas Kanal Yüzük",
    sku: "TM-YZ-99102",
    seller: "Elmas Evi İstanbul",
    category: "Yüzük",
    price: 86_000,
    stock: 2,
    status: "Onay Bekliyor",
    risk: "Yüksek",
    createdAt: "2025-03-14T09:00:00",
    updatedAt: "2025-03-14T13:00:00",
    lowStockWarning: true,
  }),
];

const DETAIL_BY_ID = new Map<string, ProductDetailFull>(DETAILS.map((d) => [d.id, d]));

export function getProductDetail(id: string): ProductDetailFull | null {
  return DETAIL_BY_ID.get(id) ?? null;
}
