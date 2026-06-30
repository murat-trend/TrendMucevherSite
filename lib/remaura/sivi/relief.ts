// Görselden kabartma — REM "Dök" (Mod B: renk kodu → kademe).
//
// DOĞRU akış (sıvı): renk-kodu grid'i → yükseklik alanı → 3B İŞARETLİ ALAN (SDF)
//   → surface-nets ile yüzey çıkar = "sıvı döküldü ve katılaştı".
// Geometri grid dikmekle DEĞİL, alandan örülerek doğar — bu yüzden sonra
// kaynaştırma / ajur (boolean) / yeniden-dökme hepsi aynı alan üstünde çalışır.
// Aynı motor: hollowShellSDF / solidifyWrap (isosurface.surfaceNets).

import type { IndexedMesh } from "./mesh";
// @ts-expect-error - isosurface tip tanımı yok (meshOps ile aynı kullanım)
import { surfaceNets } from "isosurface";

export type ColorReliefParams = {
  cols: number;
  rows: number;
  cellMm: number; // hücre boyutu (mm)
  palette: Record<number, number>; // renk kodu → kabartma yüksekliği (mm)
  baseMm: number; // taban plaka kalınlığı (mm)
  /** Alan çözünürlüğü (mm/voksel). Küçük = daha keskin "sıvı". Varsayılan 0.15. */
  pitchMm?: number;
};

export type ColorGrid = {
  cols: number;
  rows: number;
  codes: Uint8Array; // cols*rows, satır-büyük
};

/** Renk-kodu grid'i → yükseklik alanı (Mod B). */
export function gridToHeights(grid: ColorGrid, palette: Record<number, number>): Float32Array {
  const h = new Float32Array(grid.cols * grid.rows);
  for (let i = 0; i < h.length; i += 1) h[i] = palette[grid.codes[i]] ?? 0;
  return h;
}

/** Dünya (wx,wy) noktasında yükseklik — bilineer örnekleme (çözünürlükten bağımsız). */
function sampleHeight(heights: Float32Array, cols: number, rows: number, cellMm: number, wx: number, wy: number): number {
  let u = wx / cellMm, v = wy / cellMm;
  if (u < 0) u = 0; else if (u > cols - 1) u = cols - 1;
  if (v < 0) v = 0; else if (v > rows - 1) v = rows - 1;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const i1 = Math.min(i0 + 1, cols - 1), j1 = Math.min(j0 + 1, rows - 1);
  const fu = u - i0, fv = v - j0;
  const h00 = heights[j0 * cols + i0], h10 = heights[j0 * cols + i1];
  const h01 = heights[j1 * cols + i0], h11 = heights[j1 * cols + i1];
  return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv;
}

/**
 * Sıvıyı dök: yükseklik alanından işaretli alan kur, surface-nets ile katılaştır.
 * İşaret kuralı: alan negatif = içeride (meshOps/surfaceNets ile aynı).
 * Katı = { taban ≤ üst yüzey, zemin üstü, plaka içi } — kapalı, alandan örülmüş.
 */
export function pourRelief(params: ColorReliefParams, heights: Float32Array): IndexedMesh {
  const { cols, rows, cellMm, baseMm } = params;
  const pitch = params.pitchMm ?? 0.15;

  const W = (cols - 1) * cellMm;
  const H = (rows - 1) * cellMm;
  let maxH = 0;
  for (let i = 0; i < heights.length; i += 1) if (heights[i] > maxH) maxH = heights[i];
  const topMax = baseMm + maxH;

  const pad = pitch * 3;
  const minB = [-pad, -pad, -pad];
  const maxB = [W + pad, H + pad, topMax + pad];
  const dims = [
    Math.max(8, Math.ceil((maxB[0] - minB[0]) / pitch)),
    Math.max(8, Math.ceil((maxB[1] - minB[1]) / pitch)),
    Math.max(8, Math.ceil((maxB[2] - minB[2]) / pitch)),
  ];

  // İşaretli alan: içeride (katı) negatif, dışarıda pozitif.
  const field = (wx: number, wy: number, wz: number): number => {
    const top = baseMm + sampleHeight(heights, cols, rows, cellMm, wx, wy);
    const sTop = top - wz; // üst yüzeyin altında mı (pozitif=evet)
    const sBot = wz; // zeminin üstünde mi
    const sXY = Math.min(wx, W - wx, wy, H - wy); // plaka dikdörtgeni içinde mi
    const inside = Math.min(sTop, sBot, sXY); // hepsi pozitifse içeride
    return -inside; // negatif = içeride
  };

  const res = surfaceNets(dims, field, [minB, maxB]) as { positions: number[][]; cells: number[][] };

  const P = res.positions;
  const positions = new Float32Array(P.length * 3);
  for (let i = 0; i < P.length; i += 1) {
    positions[i * 3] = P[i][0];
    positions[i * 3 + 1] = P[i][1];
    positions[i * 3 + 2] = P[i][2];
  }
  const idx: number[] = [];
  for (const c of res.cells) {
    if (c.length === 3) idx.push(c[0], c[1], c[2]);
    else if (c.length === 4) idx.push(c[0], c[1], c[2], c[0], c[2], c[3]); // quad → 2 üçgen
  }
  return { positions, indices: new Uint32Array(idx) };
}
