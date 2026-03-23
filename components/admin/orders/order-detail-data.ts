/** Sipariş detayı — liste verisiyle uyumlu (id: o1…o12). */

export type OrderStatus = "Bekleyen" | "Hazırlanıyor" | "Kargoda" | "Tamamlandı" | "İptal" | "İade";
export type PaymentStatus = "Ödendi" | "Bekliyor" | "İade Edildi";
export type DeliveryStatus = "Hazırlanıyor" | "Kargoda" | "Teslim Edildi" | "Problemli";

export type OrderListRow = {
  id: string;
  orderNo: string;
  date: string;
  customer: string;
  seller: string;
  amount: number;
  payment: PaymentStatus;
  delivery: DeliveryStatus;
  status: OrderStatus;
  risk: boolean;
};

export type LineItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
  seller: string;
};

export type TimelineEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
};

export type OrderDetailFull = OrderListRow & {
  paidAmount: number;
  refundedAmount: number;
  riskScore: number;
  notes: string;
  paymentMethod: string;
  shippingMethod: string;
  lineItems: LineItem[];
  timeline: TimelineEvent[];
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  billingAddress: string;
  transactionRef: string;
  remainingAmount: number;
  refundReason: string | null;
  carrier: string;
  trackingNo: string;
  estimatedDelivery: string;
  deliveryProblem: boolean;
  fraudFlag: boolean;
  disputeLikelihood: boolean;
  highRefundRisk: boolean;
  manualReviewNote: string | null;
  tabNotes: { id: string; at: string; author: string; text: string }[];
  tabRefunds: { id: string; at: string; amount: number; reason: string; status: string }[];
  tabPaymentEvents: { id: string; at: string; type: string; amount: number; ref: string }[];
  tabMessages: { id: string; at: string; from: string; preview: string }[];
};

const ORDER_ROWS: OrderListRow[] = [
  {
    id: "o1",
    orderNo: "TM-2025-90421",
    date: "2025-03-14T11:20:00",
    customer: "Ece Yıldız",
    seller: "Atölye Mara",
    amount: 24_800,
    payment: "Ödendi",
    delivery: "Kargoda",
    status: "Kargoda",
    risk: false,
  },
  {
    id: "o2",
    orderNo: "TM-2025-90418",
    date: "2025-03-14T09:05:00",
    customer: "Murat Kılıç",
    seller: "Pırlanta Loft",
    amount: 62_400,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o3",
    orderNo: "TM-2025-90412",
    date: "2025-03-13T16:40:00",
    customer: "Selin Aydın",
    seller: "Vintage Koleksiyon",
    amount: 18_200,
    payment: "Bekliyor",
    delivery: "Hazırlanıyor",
    status: "Bekleyen",
    risk: true,
  },
  {
    id: "o4",
    orderNo: "TM-2025-90408",
    date: "2025-03-13T14:22:00",
    customer: "Can Öztürk",
    seller: "Osmanlı Hat Sanatı",
    amount: 128_000,
    payment: "Ödendi",
    delivery: "Problemli",
    status: "Kargoda",
    risk: true,
  },
  {
    id: "o5",
    orderNo: "TM-2025-90399",
    date: "2025-03-12T10:15:00",
    customer: "Deniz Arslan",
    seller: "Luna İnci Atölyesi",
    amount: 9_450,
    payment: "Ödendi",
    delivery: "Hazırlanıyor",
    status: "Hazırlanıyor",
    risk: false,
  },
  {
    id: "o6",
    orderNo: "TM-2025-90388",
    date: "2025-03-11T18:30:00",
    customer: "Burak Şen",
    seller: "Minimal Altın",
    amount: 42_100,
    payment: "İade Edildi",
    delivery: "Teslim Edildi",
    status: "İade",
    risk: false,
  },
  {
    id: "o7",
    orderNo: "TM-2025-90371",
    date: "2025-03-10T12:00:00",
    customer: "Ayşe Demir",
    seller: "Elmas Evi İstanbul",
    amount: 33_900,
    payment: "Ödendi",
    delivery: "Kargoda",
    status: "Kargoda",
    risk: false,
  },
  {
    id: "o8",
    orderNo: "TM-2025-90365",
    date: "2025-03-09T08:45:00",
    customer: "Kerem Polat",
    seller: "Gümüş İşleri Co.",
    amount: 7_200,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o9",
    orderNo: "TM-2025-90350",
    date: "2025-03-08T15:10:00",
    customer: "Zeynep Koç",
    seller: "Atölye Mara",
    amount: 56_000,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "İptal",
    risk: false,
  },
  {
    id: "o10",
    orderNo: "TM-2025-90341",
    date: "2025-03-07T11:28:00",
    customer: "Hakan Yılmaz",
    seller: "Pırlanta Loft",
    amount: 91_750,
    payment: "Bekliyor",
    delivery: "Hazırlanıyor",
    status: "Bekleyen",
    risk: false,
  },
  {
    id: "o11",
    orderNo: "TM-2025-90322",
    date: "2025-03-06T09:50:00",
    customer: "Merve Çelik",
    seller: "Vintage Koleksiyon",
    amount: 14_300,
    payment: "Ödendi",
    delivery: "Teslim Edildi",
    status: "Tamamlandı",
    risk: false,
  },
  {
    id: "o12",
    orderNo: "TM-2025-90310",
    date: "2025-03-05T13:05:00",
    customer: "Onur Taş",
    seller: "Luna İnci Atölyesi",
    amount: 22_600,
    payment: "Ödendi",
    delivery: "Problemli",
    status: "Kargoda",
    risk: true,
  },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildDetail(row: OrderListRow): OrderDetailFull {
  const h = hashId(row.id);
  const paidAmount =
    row.payment === "Ödendi" ? row.amount : row.payment === "İade Edildi" ? Math.round(row.amount * 0.55) : 0;
  const refundedAmount =
    row.status === "İade" || row.payment === "İade Edildi" ? Math.round(row.amount * 0.45) : row.status === "İptal" ? row.amount : 0;
  const remainingAmount =
    row.payment === "Bekliyor" ? row.amount : Math.max(0, row.amount - paidAmount);

  const riskScore = row.risk ? 58 + (h % 35) : 8 + (h % 22);

  const email = `musteri.${row.id}@email.com`;
  const phone = `+90 5${(h % 90) + 10} ${100 + (h % 89)} ${10 + (h % 89)} ${10 + (h % 89)}`;

  const li1Total = Math.round(row.amount * 0.68);
  const li2Total = row.amount - li1Total;
  const lineItems: LineItem[] = [
    {
      id: `${row.id}-li1`,
      name: "Ürün — Ana kalem",
      qty: 1,
      unitPrice: li1Total,
      total: li1Total,
      seller: row.seller,
    },
    {
      id: `${row.id}-li2`,
      name: "Aksesuar / ek parça",
      qty: h % 2 === 0 ? 1 : 2,
      unitPrice: Math.round(li2Total / (h % 2 === 0 ? 1 : 2)),
      total: li2Total,
      seller: row.seller,
    },
  ];

  const timeline: TimelineEvent[] = [
    { id: "t1", at: row.date, title: "Sipariş oluşturuldu", detail: "Kanal: Web" },
    {
      id: "t2",
      at: row.date,
      title: row.payment === "Bekliyor" ? "Ödeme bekleniyor" : "Ödeme alındı",
      detail: row.payment === "Bekliyor" ? undefined : "Kart provizyonu onaylandı",
    },
  ];

  if (["Hazırlanıyor", "Kargoda", "Tamamlandı", "İade", "İptal"].includes(row.status)) {
    timeline.push({
      id: "t3",
      at: row.date,
      title: "Hazırlanmaya başlandı",
      detail: "Satıcı atölye onayı",
    });
  }
  if (["Kargoda", "Tamamlandı", "İade", "İptal"].includes(row.status)) {
    timeline.push({
      id: "t4",
      at: row.date,
      title: "Kargoya verildi",
      detail: "Yurtiçi kargo",
    });
  }
  if (row.status === "Tamamlandı" || row.delivery === "Teslim Edildi") {
    timeline.push({ id: "t5", at: row.date, title: "Teslim edildi", detail: "Alıcı onayı" });
  }
  if (row.status === "İade" || row.payment === "İade Edildi") {
    timeline.push({
      id: "t6",
      at: row.date,
      title: "Refund başlatıldı",
      detail: "Otomatik / müşteri talebi",
    });
    timeline.push({ id: "t7", at: row.date, title: "İade talebi açıldı", detail: "İnceleme kuyruğunda" });
  }
  if (row.risk) {
    timeline.push({
      id: "t8",
      at: row.date,
      title: "Manuel not eklendi",
      detail: "Risk ekibi: ek doğrulama önerildi",
    });
  }

  const fraudFlag = row.risk && row.amount > 50_000;
  const disputeLikelihood = row.delivery === "Problemli";
  const highRefundRisk = row.status === "İade" || row.payment === "İade Edildi";
  const manualReviewNote =
    row.risk && row.amount > 40_000 ? "Yüksek tutar + yeni müşteri segmenti — ödeme doğrulaması yapıldı." : null;

  const tabNotes =
    h % 3 === 0
      ? []
      : [
          {
            id: "n1",
            at: row.date,
            author: "Operasyon",
            text: "Müşteri teslimat penceresi için arandı.",
          },
        ];

  const tabRefunds =
    row.status === "İade" || row.payment === "İade Edildi"
      ? [
          {
            id: "r1",
            at: row.date,
            amount: refundedAmount,
            reason: "Ürün beklentiyi karşılamadı",
            status: "İşlendi",
          },
        ]
      : [];

  const tabPaymentEvents = [
    {
      id: "pe1",
      at: row.date,
      type: row.payment === "Bekliyor" ? "Bekleyen provizyon" : "Tahsilat",
      amount: paidAmount,
      ref: `TXN-${row.orderNo.replace(/-/g, "")}`,
    },
  ];

  const tabMessages =
    h % 4 === 0
      ? []
      : [
          {
            id: "m1",
            at: row.date,
            from: row.customer,
            preview: "Teslimat günü hakkında bilgi rica ediyorum.",
          },
        ];

  return {
    ...row,
    paidAmount,
    refundedAmount,
    riskScore,
    notes:
      row.status === "İptal"
        ? "İptal talebi müşteri tarafından iletildi; stok iadesi tamam."
        : "Standart sipariş notu — hediye paketi istenmedi.",
    paymentMethod: "Kredi kartı (3D Secure)",
    shippingMethod: "Yurtiçi kargo — adresli teslimat",
    lineItems,
    timeline,
    customerEmail: email,
    customerPhone: phone,
    shippingAddress: `Nişantaşı Mah. No:${(h % 40) + 1} D:4, Şişli / İstanbul`,
    billingAddress: `Merkez Mah. İş Hanı No:${(h % 20) + 1}, Kadıköy / İstanbul`,
    transactionRef: `AUTH-${row.orderNo.replace(/-/g, "")}-${(h % 9000) + 1000}`,
    remainingAmount,
    refundReason:
      row.status === "İade" || row.payment === "İade Edildi" ? "Müşteri iade politikası kapsamında" : null,
    carrier: "Yurtiçi Kargo",
    trackingNo: row.status === "Bekleyen" && row.payment === "Bekliyor" ? "—" : `YK${1000000000 + h}`,
    estimatedDelivery: "17–19 Mart 2025",
    deliveryProblem: row.delivery === "Problemli",
    fraudFlag,
    disputeLikelihood,
    highRefundRisk,
    manualReviewNote,
    tabNotes,
    tabRefunds,
    tabPaymentEvents,
    tabMessages,
  };
}

export function getOrderDetail(id: string): OrderDetailFull | null {
  const row = ORDER_ROWS.find((r) => r.id === id);
  if (!row) return null;
  return buildDetail(row);
}
