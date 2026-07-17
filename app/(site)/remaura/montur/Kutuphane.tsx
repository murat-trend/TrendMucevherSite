"use client";

// MONTÜR — GÖRSEL KÜTÜPHANE (JEKB/BILGI.md karşılıkları)
// Kafa varyantları + taş galerisi: kart seç → reçetenin ilgili alanları
// güncellenir; ince ayar sağ paneldeki alanlarda yapılır (Murat, 2026-07-17).
import { MonturRecete } from "@/lib/remaura/montur/recete";

export type KafaKart = {
  id: string;
  ad: string;
  jekb: string; // BILGI.md madde adı (AI da aynı terimi bilir)
  uygula: (r: MonturRecete) => MonturRecete;
  aktifMi: (r: MonturRecete) => boolean;
  cizim: React.ReactNode;
};

const S = { stroke: "#D4AF37", strokeWidth: 2.2, fill: "none", strokeLinecap: "round" as const };
const S2 = { ...S, stroke: "#9CA3AF", strokeWidth: 1.6 };

/** Taş şematiği (yan görünüş) — tüm kartlarda ortak. */
const Tas = () => (
  <path d="M22 12 L42 12 L48 18 L32 30 L16 18 Z" {...S2} fill="rgba(244,246,250,0.12)" />
);

export const KAFA_KARTLARI: KafaKart[] = [
  {
    id: "duz4", ad: "Düz Basket · 4T", jekb: "Basket",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", tirnakSayisi: 4, basketStil: "duz", rail: "tek" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.basketStil === "duz" && r.kafa.rail === "tek" && r.kafa.tirnakSayisi === 4,
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M18 14 L18 40 M46 14 L46 40" {...S} /><path d="M18 32 L46 32" {...S} /></svg>),
  },
  {
    id: "duz6", ad: "Düz Basket · 6T", jekb: "Basket",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", tirnakSayisi: 6, basketStil: "duz", rail: "tek" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.basketStil === "duz" && r.kafa.rail === "tek" && r.kafa.tirnakSayisi === 6,
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M18 14 L18 40 M32 20 L32 40 M46 14 L46 40" {...S} /><path d="M18 32 L46 32" {...S} /></svg>),
  },
  {
    id: "tulip", ad: "Tulip Basket", jekb: "Tulip Basket",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", basketStil: "tulip" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.basketStil === "tulip",
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M18 14 Q22 32 28 42 M46 14 Q42 32 36 42" {...S} /><path d="M22 32 L42 32" {...S} /></svg>),
  },
  {
    id: "gizli", ad: "Gizli Rail", jekb: "Hidden Rail",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", rail: "gizli" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.rail === "gizli",
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M18 14 L18 40 M46 14 L46 40" {...S} /><path d="M24 30 L40 30" {...S} strokeDasharray="3 3" /></svg>),
  },
  {
    id: "cift", ad: "Çift Rail", jekb: "Double Rail",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", rail: "cift" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.rail === "cift",
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M18 14 L18 44 M46 14 L46 44" {...S} /><path d="M18 30 L46 30 M18 38 L46 38" {...S} /></svg>),
  },
  {
    id: "peg", ad: "Peg Head", jekb: "Peg Head",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "tirnak", baglanti: "peg" } }),
    aktifMi: (r) => r.kafa.tip === "tirnak" && r.kafa.baglanti === "peg",
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M20 14 L24 34 M44 14 L40 34" {...S} /><path d="M24 32 L40 32" {...S} /><path d="M32 34 L32 48" {...S} strokeWidth={3.4} /></svg>),
  },
  {
    id: "bezel", ad: "Bezel", jekb: "Bezel",
    uygula: (r) => ({ ...r, kafa: { ...r.kafa, tip: "bezel" } }),
    aktifMi: (r) => r.kafa.tip === "bezel",
    cizim: (<svg viewBox="0 0 64 52"><Tas /><path d="M14 12 L14 34 L50 34 L50 12" {...S} /></svg>),
  },
];

export type TasKart = {
  id: "yuvarlak" | "prenses" | "oval";
  ad: string;
  cizim: React.ReactNode;
};

export const TAS_KARTLARI: TasKart[] = [
  { id: "yuvarlak", ad: "Yuvarlak", cizim: (<svg viewBox="0 0 64 52"><circle cx="32" cy="26" r="15" {...S} /><path d="M22 20 L42 32 M42 20 L22 32 M32 11 L32 41" {...S2} /></svg>) },
  { id: "prenses", ad: "Prenses", cizim: (<svg viewBox="0 0 64 52"><rect x="18" y="12" width="28" height="28" {...S} /><path d="M18 12 L46 40 M46 12 L18 40" {...S2} /></svg>) },
  { id: "oval", ad: "Oval", cizim: (<svg viewBox="0 0 64 52"><ellipse cx="32" cy="26" rx="19" ry="13" {...S} /><path d="M20 20 L44 32 M44 20 L20 32" {...S2} /></svg>) },
];
