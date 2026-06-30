// Görselden kabartma — REM "Dök" fiilinin en yalın hali (Mod B: renk kodu → kademe).
//
// Akış: renk-kodu grid'i → yükseklik alanı (heightfield) → taban + duvar →
//       watertight katı relief. (Bu ilk sürüm SDF'siz; doğrudan grid katısı.)
// Sonra .rema'ya "gorselKabartma" komutu olarak yazılır → yeniden dökülebilir.

import type { IndexedMesh } from "./mesh";

/** Mod B: her renk kodu (0,1,2…) bir yükseklik kademesine (mm) eşlenir. */
export type ColorReliefParams = {
  cols: number;
  rows: number;
  /** Hücre boyutu (mm). Plakanın gerçek boyutu = cols*cellMm × rows*cellMm. */
  cellMm: number;
  /** Renk kodu → kabartma yüksekliği (mm). Örn. {0:0, 1:0.6, 2:1.2} */
  palette: Record<number, number>;
  /** Taban plaka kalınlığı (mm) — kabartmanın altındaki destek. */
  baseMm: number;
};

export type ColorGrid = {
  cols: number;
  rows: number;
  /** cols*rows uzunluğunda renk kodları (satır-büyük). */
  codes: Uint8Array;
};

/** Renk-kodu grid'ini yükseklik alanına çevir (Mod B). */
export function gridToHeights(grid: ColorGrid, palette: Record<number, number>): Float32Array {
  const h = new Float32Array(grid.cols * grid.rows);
  for (let i = 0; i < h.length; i += 1) h[i] = palette[grid.codes[i]] ?? 0;
  return h;
}

/**
 * Yükseklik alanından watertight katı relief üret.
 * Üst yüzey = taban + yükseklik; alt yüzey = düz (z=0); kenarlarda duvar.
 * Kapalı manifold (her kenar 2 üçgen) → baskıya hazır.
 */
export function buildReliefSolid(params: ColorReliefParams, heights: Float32Array): IndexedMesh {
  const { cols, rows, cellMm, baseMm } = params;
  const nx = cols, ny = rows;
  const nv = nx * ny;
  const positions = new Float32Array(nv * 2 * 3); // üst + alt
  const top = (i: number, j: number) => j * nx + i;
  const bot = (i: number, j: number) => nv + j * nx + i;

  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const x = i * cellMm, y = j * cellMm;
      const ti = top(i, j) * 3;
      positions[ti] = x; positions[ti + 1] = y; positions[ti + 2] = baseMm + heights[j * nx + i];
      const bi = bot(i, j) * 3;
      positions[bi] = x; positions[bi + 1] = y; positions[bi + 2] = 0;
    }
  }

  const tris: number[] = [];
  // üst yüzey (yukarı bakan winding)
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const a = top(i, j), b = top(i + 1, j), c = top(i + 1, j + 1), d = top(i, j + 1);
      tris.push(a, b, c, a, c, d);
    }
  }
  // alt yüzey (aşağı bakan = ters winding)
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const a = bot(i, j), b = bot(i + 1, j), c = bot(i + 1, j + 1), d = bot(i, j + 1);
      tris.push(a, c, b, a, d, c);
    }
  }
  // duvarlar: her kenar iki üst köşeyi alır, alt köşeler = üst + nv.
  // Sınır kenarları üst/alt yüzeyle paylaşıldığı için kapalı manifold çıkar.
  const wall = (ta: number, tb: number) => {
    const ba = ta + nv, bb = tb + nv;
    tris.push(ta, tb, bb, ta, bb, ba);
  };
  for (let i = 0; i < nx - 1; i += 1) {
    wall(top(i, 0), top(i + 1, 0));                 // ön (j=0)
    wall(top(i + 1, ny - 1), top(i, ny - 1));       // arka (j=ny-1)
  }
  for (let j = 0; j < ny - 1; j += 1) {
    wall(top(0, j + 1), top(0, j));                 // sol (i=0)
    wall(top(nx - 1, j), top(nx - 1, j + 1));       // sağ (i=nx-1)
  }

  return { positions, indices: new Uint32Array(tris) };
}
