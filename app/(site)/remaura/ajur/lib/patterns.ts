// ---------------------------------------------------------------------------
// Ajur patern kütüphanesi (PRD §5) — el yapımı, döküm-güvenli kapalı eğriler.
// Her patern kapalı 2D poligonlardan oluşur; UV (mm) uzayında üretilir,
// applyAjur bunları maske yüzeyine projekte edip prizma olarak deler.
//   - "tile"    → hücre hücre döşenir (stride + stagger)
//   - "central" → maske merkezine tek kompozisyon (gül penceresi)
// minBridgeMm: bu desenin güvenli asgari köprüsü (metadata; UI uyarısı için).
// ---------------------------------------------------------------------------

export type PatternCategory = "fonksiyonel" | "dekoratif";
export type PatternLayout = "tile" | "central";
/** Kapalı poligon — [u,v] mm; CCW garanti edilir. */
export type Poly = [number, number][];

export type TileSpec = {
  /** tek hücrenin kapalı poligonları, hücre merkezi (0,0) */
  polys: Poly[];
  /** hücre merkez-merkez yatay aralık (mm) */
  strideU: number;
  /** satır adımı (mm) */
  strideV: number;
  /** tek satırlarda yatay kaydırma (mm) — petek benzeri diziler için */
  staggerU: number;
};

export type PatternDef = {
  id: string;
  labelTr: string;
  category: PatternCategory;
  layout: PatternLayout;
  /** bu desenle güvenli asgari köprü genişliği (mm) */
  minBridgeMm: number;
  /** önerilen hücre boyutu (mm) */
  defaultCellMm: number;
  tile?: (cellMm: number, holeScale: number) => TileSpec;
  central?: (radiusMm: number, holeScale: number) => Poly[];
};

// ---- yardımcılar ----------------------------------------------------------

function ensureCcw(poly: Poly): Poly {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  if (s < 0) poly.reverse();
  return poly;
}

export function polyArea(poly: Poly): number {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
}

/** poligonu ölçekle + taşı + (isteğe bağlı) döndür */
function xform(poly: Poly, s: number, du = 0, dv = 0, rotRad = 0): Poly {
  const c = Math.cos(rotRad), sn = Math.sin(rotRad);
  return ensureCcw(poly.map(([u, v]) => {
    const x = u * s, y = v * s;
    return [x * c - y * sn + du, x * sn + y * c + dv] as [number, number];
  }));
}

function circlePoly(cx: number, cy: number, r: number, n = 20): Poly {
  const pts: Poly = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** elips — birim uzay: yarı eksenler a,b */
function ellipseUnit(a: number, b: number, n = 22): Poly {
  const pts: Poly = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pts.push([Math.cos(t) * a, Math.sin(t) * b]);
  }
  return pts;
}

/** damla/pear — tepe sivri, alt yuvarlak; birim yükseklik ~1 */
function teardropUnit(n = 24): Poly {
  const pts: Poly = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const x = 0.36 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 1.1);
    const y = 0.5 * Math.cos(t);
    pts.push([x, y]);
  }
  return pts;
}

/** stadyum (yuvarlak uçlu dikdörtgen) — uzun eksen v yönünde */
function stadiumUnit(halfW: number, halfH: number, n = 8): Poly {
  const pts: Poly = [];
  const r = halfW;
  const straight = Math.max(0, halfH - r);
  for (let i = 0; i <= n; i += 1) { // üst yarım daire (soldan sağa)
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([Math.cos(a) * r, straight + Math.sin(a) * r]);
  }
  for (let i = 0; i <= n; i += 1) { // alt yarım daire (sağdan sola)
    const a = -(i / n) * Math.PI;
    pts.push([Math.cos(a) * r, -straight + Math.sin(a) * r]);
  }
  return pts;
}

/** altıgen — düz üst, birim "yarıçap" */
function hexUnit(r: number): Poly {
  const pts: Poly = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** sivri kemer (lancet) penceresi — gotik trellis gözü; birim yükseklik ~0.9 */
function lancetUnit(): Poly {
  const w = 0.21;           // yarı genişlik
  const baseY = -0.42;
  const springY = 0.08;     // kemerin başladığı yükseklik
  const tipY = 0.46;
  const pts: Poly = [[-w, baseY], [w, baseY], [w, springY]];
  // sağ kemer yayı: (w,springY) → (0,tipY)
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 6;
    const x = w * Math.cos(t * Math.PI * 0.5);
    const y = springY + (tipY - springY) * Math.sin(t * Math.PI * 0.5);
    pts.push([x * (1 - t * 0.12), y]);
  }
  // sol kemer yayı: (0,tipY) → (-w,springY)
  for (let i = 1; i <= 6; i += 1) {
    const t = 1 - i / 6;
    const x = -w * Math.cos(t * Math.PI * 0.5);
    const y = springY + (tipY - springY) * Math.sin(t * Math.PI * 0.5);
    pts.push([x * (1 - t * 0.12), y]);
  }
  return pts;
}

/** sarmaşık/asma yaprağı — sivri uçlu üç loblu stilize yaprak (kalp eğrisi tabanlı) */
function ivyLeafUnit(n = 26): Poly {
  const pts: Poly = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    // kalp eğrisi (sivri uç aşağıda), 0.03 ölçek
    const x = 0.032 * 16 * Math.pow(Math.sin(t), 3);
    const y = 0.032 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([x, y]);
  }
  return pts;
}

/** diken sarmaşığı — S kıvrımlı ana dal (kesintili, hücre kenarına dokunmaz) */
function thornVinePolys(): Poly[] {
  const top: Poly = [];
  const bot: Poly = [];
  const u0 = -0.40, u1 = 0.40, half = 0.075;
  const N = 16;
  for (let i = 0; i <= N; i += 1) {
    const u = u0 + ((u1 - u0) * i) / N;
    const c = 0.16 * Math.sin(u * Math.PI * 2.2); // S kıvrımı
    top.push([u, c + half]);
    bot.push([u, c - half]);
  }
  const band: Poly = [...top, ...bot.reverse()];
  // dikenler — dalın üstünde/altında küçük kavisli üçgenler (ayrı delikler)
  const thorn = (cu: number, cv: number, flip: number): Poly => [
    [cu - 0.055, cv],
    [cu + 0.055, cv],
    [cu + 0.01, cv + flip * 0.13],
  ];
  const cAt = (u: number) => 0.16 * Math.sin(u * Math.PI * 2.2);
  return [
    band,
    thorn(-0.22, cAt(-0.22) + half + 0.035, 1),
    thorn(0.05, cAt(0.05) - half - 0.035, -1),
    thorn(0.3, cAt(0.3) + half + 0.035, 1),
  ];
}

/** fleur-de-lis — stilize zambak silüeti (sağ yarı el çizimi + ayna) */
function fleurUnit(): Poly {
  const right: [number, number][] = [
    [0.0, 0.5],      // tepe sivri uç
    [0.05, 0.34],
    [0.085, 0.2],
    [0.075, 0.09],   // orta yaprak beli
    [0.13, 0.13],    // yan kanat başlangıcı
    [0.22, 0.19],
    [0.29, 0.15],
    [0.3, 0.07],     // kanat kıvrım ucu
    [0.24, 0.0],
    [0.15, -0.03],
    [0.15, -0.1],    // bel bandı
    [0.09, -0.13],
    [0.11, -0.24],
    [0.16, -0.36],   // ayak sağ flare
    [0.06, -0.31],
    [0.0, -0.42],    // alt orta uç
  ];
  const left = right
    .slice(1, right.length - 1)
    .reverse()
    .map(([x, y]) => [-x, y] as [number, number]);
  return [...right, ...left];
}

/** vanitas/iskelet — stilize kurukafa silüeti (tek kapalı kontur) */
function skullUnit(): Poly {
  const right: [number, number][] = [
    [0.0, 0.46],     // tepe
    [0.14, 0.43],
    [0.24, 0.33],
    [0.28, 0.18],    // kafatası yanı
    [0.27, 0.04],
    [0.22, -0.05],   // şakak içeri
    [0.23, -0.13],   // elmacık
    [0.17, -0.18],
    [0.14, -0.3],    // çene yanı
    [0.08, -0.4],
    [0.0, -0.42],    // çene ucu
  ];
  const left = right
    .slice(1, right.length - 1)
    .reverse()
    .map(([x, y]) => [-x, y] as [number, number]);
  return [...right, ...left];
}

// ---- patern tanımları ------------------------------------------------------

const clamp01 = (x: number) => Math.min(0.92, Math.max(0.2, x));

export const PATTERNS: PatternDef[] = [
  // ---------------- fonksiyonel (yüzük şank içi) ----------------
  {
    id: "oval",
    labelTr: "Oval dizi",
    category: "fonksiyonel",
    layout: "tile",
    minBridgeMm: 0.7,
    defaultCellMm: 3.2,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [xform(ellipseUnit(0.5, 0.32), s)],
        strideU: cell,
        strideV: cell * 0.8,
        staggerU: cell / 2,
      };
    },
  },
  {
    id: "damla",
    labelTr: "Damla dizi",
    category: "fonksiyonel",
    layout: "tile",
    minBridgeMm: 0.7,
    defaultCellMm: 3.4,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      // sıralar arası ters yönlü damlalar — klasik kuyum dizisi
      return {
        polys: [
          xform(teardropUnit(), s, -cell * 0.25, 0, 0),
          xform(teardropUnit(), s, cell * 0.25, 0, Math.PI),
        ],
        strideU: cell,
        strideV: cell * 0.95,
        staggerU: cell / 2,
      };
    },
  },
  {
    id: "dilim",
    labelTr: "Dilim kesim",
    category: "fonksiyonel",
    layout: "tile",
    minBridgeMm: 0.8,
    defaultCellMm: 3.6,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [xform(stadiumUnit(0.16, 0.48), s)],
        strideU: cell * 0.62,
        strideV: cell * 1.15,
        staggerU: 0,
      };
    },
  },
  {
    id: "petek",
    labelTr: "Petek",
    category: "fonksiyonel",
    layout: "tile",
    minBridgeMm: 0.6,
    defaultCellMm: 2.8,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [xform(hexUnit(0.5), s)],
        strideU: cell,
        strideV: cell * (Math.sqrt(3) / 2),
        staggerU: cell / 2,
      };
    },
  },
  // ---------------- dekoratif (madalyon arka plaka) ----------------
  {
    id: "diken",
    labelTr: "Diken sarmaşığı",
    category: "dekoratif",
    layout: "tile",
    minBridgeMm: 0.8,
    defaultCellMm: 7,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs) * 1.08;
      return {
        polys: thornVinePolys().map((p) => xform(p, s)),
        strideU: cell,
        strideV: cell * 0.55,
        staggerU: cell / 2,
      };
    },
  },
  {
    id: "gotik-trellis",
    labelTr: "Gotik trellis",
    category: "dekoratif",
    layout: "tile",
    minBridgeMm: 0.7,
    defaultCellMm: 4.2,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [xform(lancetUnit(), s)],
        strideU: cell * 0.62,
        strideV: cell * 1.05,
        staggerU: cell * 0.31,
      };
    },
  },
  {
    id: "sarmasik",
    labelTr: "Sarmaşık yaprağı",
    category: "dekoratif",
    layout: "tile",
    minBridgeMm: 0.7,
    defaultCellMm: 4.5,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [
          xform(ivyLeafUnit(), s, -cell * 0.12, 0, -0.5),
          xform(circlePoly(0, 0, 0.09, 12), s, cell * 0.3, cell * 0.28, 0),
        ],
        strideU: cell,
        strideV: cell * 0.9,
        staggerU: cell / 2,
      };
    },
  },
  {
    id: "gul-penceresi",
    labelTr: "Gül penceresi",
    category: "dekoratif",
    layout: "central",
    minBridgeMm: 0.8,
    defaultCellMm: 4, // central'da kullanılmaz; tip uyumu için
    central: (R, hs) => {
      const k = clamp01(hs);
      const polys: Poly[] = [];
      // merkez göz
      polys.push(ensureCcw(circlePoly(0, 0, R * 0.16 * k + R * 0.06, 24)));
      // 8 taç yaprağı — damla, sivri uç merkeze bakar
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const d = R * 0.52;
        polys.push(
          xform(teardropUnit(), R * 0.42 * k + R * 0.12, Math.cos(a) * d, Math.sin(a) * d, a - Math.PI / 2),
        );
      }
      // dış halka — 16 küçük göz
      for (let i = 0; i < 16; i += 1) {
        const a = ((i + 0.5) / 16) * Math.PI * 2;
        const d = R * 0.85;
        polys.push(ensureCcw(circlePoly(Math.cos(a) * d, Math.sin(a) * d, R * 0.055 * k + R * 0.02, 14)));
      }
      return polys;
    },
  },
  {
    id: "fleur",
    labelTr: "Fleur-de-lis",
    category: "dekoratif",
    layout: "tile",
    minBridgeMm: 0.8,
    defaultCellMm: 6,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs) * 1.0;
      return {
        polys: [xform(fleurUnit(), s)],
        strideU: cell * 0.85,
        strideV: cell * 1.05,
        staggerU: cell * 0.42,
      };
    },
  },
  {
    id: "vanitas",
    labelTr: "Vanitas",
    category: "dekoratif",
    layout: "tile",
    minBridgeMm: 0.8,
    defaultCellMm: 5,
    tile: (cell, hs) => {
      const s = cell * clamp01(hs);
      return {
        polys: [xform(skullUnit(), s)],
        strideU: cell * 0.8,
        strideV: cell * 1.0,
        staggerU: cell * 0.4,
      };
    },
  },
];

export const patternById = (id: string): PatternDef | undefined =>
  PATTERNS.find((p) => p.id === id);
