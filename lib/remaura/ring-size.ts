/**
 * İsviçre (EU) yüzük numarası → iç çap (mm) tablosu
 * Formül: iç_çap = (numara + 40) / π
 * Aralık: 8–40 (33 numara)
 */
export const RING_SIZE_SWISS: Record<number, number> = Object.fromEntries(
  Array.from({ length: 33 }, (_, i) => {
    const size = i + 8;
    const innerDiameter = parseFloat(((size + 40) / Math.PI).toFixed(2));
    return [size, innerDiameter];
  })
);

export function getRingSizeTargetMm(ringSize: number): number {
  return parseFloat((RING_SIZE_SWISS[ringSize] ?? 30).toFixed(2));
}

export function getTargetDiameter(ringSize: number, system: "swiss" | "eu"): number {
  if (system === "swiss") {
    return (ringSize + 40) / Math.PI;
  }
  return ringSize / Math.PI;
}

/** İç çapa en yakın EU / US / TR numaraları (Python ring_rail_measure.py ile aynı tablo) */
export type RingSizeTriple = {
  eu: number;
  us: number;
  tr: number;
  refInnerMm: number;
};

const RING_INNER_LOOKUP: Array<{ innerMm: number; eu: number; us: number; tr: number }> = [
  { innerMm: 14.05, eu: 4, us: 3, tr: 4 },
  { innerMm: 14.45, eu: 6, us: 3.5, tr: 6 },
  { innerMm: 14.86, eu: 7, us: 4, tr: 7 },
  { innerMm: 15.27, eu: 8, us: 4.5, tr: 8 },
  { innerMm: 15.7, eu: 9, us: 5, tr: 9 },
  { innerMm: 16.1, eu: 10, us: 5.5, tr: 10 },
  { innerMm: 16.51, eu: 11, us: 6, tr: 11 },
  { innerMm: 16.92, eu: 12, us: 6.5, tr: 12 },
  { innerMm: 17.35, eu: 13, us: 7, tr: 13 },
  { innerMm: 17.75, eu: 14, us: 7.5, tr: 14 },
  { innerMm: 18.19, eu: 15, us: 8, tr: 15 },
  { innerMm: 18.53, eu: 16, us: 8.5, tr: 16 },
  { innerMm: 18.89, eu: 17, us: 9, tr: 17 },
  { innerMm: 19.41, eu: 18, us: 9.5, tr: 18 },
  { innerMm: 19.84, eu: 19, us: 10, tr: 19 },
  { innerMm: 20.2, eu: 20, us: 10.5, tr: 20 },
  { innerMm: 20.68, eu: 21, us: 11, tr: 21 },
  { innerMm: 21.08, eu: 22, us: 11.5, tr: 22 },
  { innerMm: 21.49, eu: 23, us: 12, tr: 23 },
  { innerMm: 21.89, eu: 24, us: 12.5, tr: 24 },
  { innerMm: 22.33, eu: 25, us: 13, tr: 25 },
  { innerMm: 22.6, eu: 26, us: 13.5, tr: 26 },
  { innerMm: 23.06, eu: 27, us: 14, tr: 27 },
  { innerMm: 23.47, eu: 28, us: 14.5, tr: 28 },
  { innerMm: 23.87, eu: 29, us: 15, tr: 29 },
  { innerMm: 24.27, eu: 30, us: 15.5, tr: 30 },
  { innerMm: 24.68, eu: 31, us: 16, tr: 31 },
  { innerMm: 25.08, eu: 32, us: 16.5, tr: 32 },
  { innerMm: 25.5, eu: 33, us: 17, tr: 33 },
  { innerMm: 25.94, eu: 34, us: 17.5, tr: 34 },
  { innerMm: 26.3, eu: 35, us: 18, tr: 35 },
  { innerMm: 26.71, eu: 36, us: 18.5, tr: 36 },
  { innerMm: 27.11, eu: 37, us: 19, tr: 37 },
  { innerMm: 27.53, eu: 38, us: 19.5, tr: 38 },
  { innerMm: 27.93, eu: 39, us: 20, tr: 39 },
  { innerMm: 28.33, eu: 40, us: 20.5, tr: 40 },
];

export function innerDiaToRingSizes(innerMm: number): RingSizeTriple {
  let best = RING_INNER_LOOKUP[0];
  let bestD = Math.abs(best.innerMm - innerMm);
  for (const row of RING_INNER_LOOKUP) {
    const d = Math.abs(row.innerMm - innerMm);
    if (d < bestD) {
      best = row;
      bestD = d;
    }
  }
  return {
    eu: best.eu,
    us: best.us,
    tr: best.tr,
    refInnerMm: best.innerMm,
  };
}
