// REM "Kalıp-Döküm" — görseli kalıba koy, sıvıyı dök, kalıbı at, içindekini ver.
//
// Model: belirli ölçüde bir kalıp (footprint + derinlik). Görsel kalıba yerleşir:
//   • silüet (maske)  → kalıbın DOLACAĞI bölge (maske dışı = boş kalıp, atılır)
//   • ton (parlaklık) → o bölgedeki yükseklik (hacim)
// Sıvı = işaretli alan; surface-nets ile katılaşır. "Kalıbı atmak" = maske dışını
// dışarıda bırakmak → geriye sadece içerik (görselin 3B dökümü) kalır.
//
// Aynı motor: hollowShellSDF / solidifyWrap / pourRelief (isosurface.surfaceNets).

import type { IndexedMesh } from "./mesh";
// @ts-expect-error - isosurface tip tanımı yok
import { surfaceNets } from "isosurface";

export type SourceImage = {
  width: number;
  height: number;
  /** width*height, 0..255 — silüet (0 = boş kalıp / arka plan). */
  mask: Uint8Array;
  /** width*height, 0..255 — parlaklık (ton → yükseklik). */
  luma: Uint8Array;
};

export type MoldParams = {
  /** Kalıbın en uzun kenarı bu mm'ye sığar (ölçüyü şimdilik biz seçeriz). */
  footprintMm: number;
  /** İçeriğin altındaki taban (mm) — döküm tek parça kalsın diye. */
  baseMm: number;
  /** Ton → maksimum kabartma yüksekliği (mm). */
  reliefMm: number;
  /** Bu alfanın altı = kalıp (boş), üstü = içerik. 0..255. */
  maskThreshold: number;
  /** Sıvı çözünürlüğü (mm/voksel) — REM "viskozite". Varsayılan 0.2. */
  pitchMm?: number;
};

/** Ham RGBA'dan SourceImage üret. Siyah zeminli görselde silüet = siyah-olmayan. */
export function imageFromRGBA(width: number, height: number, rgba: Uint8Array): SourceImage {
  const n = width * height;
  const mask = new Uint8Array(n);
  const luma = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
    // silüet: alfa varsa onu, yoksa en parlak kanalı kullan (siyah zemin → 0)
    mask[i] = a < 255 ? a : Math.max(r, g, b);
    // ton: algısal parlaklık
    luma[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return { width, height, mask, luma };
}

function bilinear(arr: Uint8Array, w: number, h: number, u: number, v: number): number {
  if (u < 0) u = 0; else if (u > w - 1) u = w - 1;
  if (v < 0) v = 0; else if (v > h - 1) v = h - 1;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const i1 = Math.min(i0 + 1, w - 1), j1 = Math.min(j0 + 1, h - 1);
  const fu = u - i0, fv = v - j0;
  const a = arr[j0 * w + i0], b = arr[j0 * w + i1];
  const c = arr[j1 * w + i0], d = arr[j1 * w + i1];
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}

/**
 * Kalıba dök: görseli kalıp ölçüsüne sığdır, sıvıyı alandan katılaştır,
 * maske dışını (boş kalıp) dışarıda bırak → geriye içerik kalır.
 * Watertight, baskıya hazır katı döner.
 */
export function castFromImage(img: SourceImage, mold: MoldParams): IndexedMesh {
  const { footprintMm, baseMm, reliefMm, maskThreshold } = mold;
  const pitch = mold.pitchMm ?? 0.2;

  // görseli kalıba sığdır: en uzun kenar = footprintMm
  const pxToMm = footprintMm / Math.max(img.width, img.height);
  const W = img.width * pxToMm;
  const H = img.height * pxToMm;
  const topMax = baseMm + reliefMm;

  const pad = pitch * 3;
  const minB = [-pad, -pad, -pad];
  const maxB = [W + pad, H + pad, topMax + pad];
  const dims = [
    Math.max(8, Math.ceil((maxB[0] - minB[0]) / pitch)),
    Math.max(8, Math.ceil((maxB[1] - minB[1]) / pitch)),
    Math.max(8, Math.ceil((maxB[2] - minB[2]) / pitch)),
  ];

  const field = (wx: number, wy: number, wz: number): number => {
    // dünya → piksel (v ekseni ters: görsel üstü = +y)
    const u = wx / pxToMm;
    const v = (H - wy) / pxToMm;
    const a = bilinear(img.mask, img.width, img.height, u, v); // silüet
    const L = bilinear(img.luma, img.width, img.height, u, v) / 255; // ton
    const top = baseMm + reliefMm * L;
    const sTop = top - wz; // üst yüzeyin altında mı
    const sBot = wz; // zeminin üstünde mi
    const sMask = ((a - maskThreshold) / 255) * reliefMm; // silüet içinde mi (mm-ölçekli)
    const inside = Math.min(sTop, sBot, sMask);
    return -inside; // negatif = içeride (sıvı)
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
    else if (c.length === 4) idx.push(c[0], c[1], c[2], c[0], c[2], c[3]);
  }
  return { positions, indices: new Uint32Array(idx) };
}
