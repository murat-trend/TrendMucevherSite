// geo/plaka.ts — KADEMELİ PLAKA (raster konturlarından katı gövde)
//
// Fikir: tek bir görselden farklı eşiklerde kontur çıkarılır; her eşik bir
// DERİNLİK KADEMESİ olur. Kademeler farklı yüksekliklere ekstrüde edilip
// birleştirilince "CNC ile kademeli oyulmuş" görünümü çıkar.
//
// Eşik 205 gibi yüksek bir seviye parçanın DIŞ SİLUETİNİ + delikleri verir;
// düşük eşikler harf ve bezeme kütlelerini verir.
//
// Delikler EvenOdd doldurma kuralıyla çözülür — trace.ts'in çift/tek derinlik
// sınıflaması ile birebir uyumlu.
//
// ⚠ manifold-3d WASM nesnelerinde GC YOK — her ara nesnede delete() ŞART
// (union.ts'teki sızıntı disiplininin aynısı).

import type { V3 } from "./vec3";
import type { Region } from "./trace";

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM tipleri dışarıdan */
let wasmPromise: Promise<any> | null = null;
async function getWasm(): Promise<any> {
  if (!wasmPromise) {
    wasmPromise = import("manifold-3d").then(async (M) => {
      const w = await M.default();
      w.setup();
      return w;
    });
  }
  return wasmPromise;
}

/** Bir derinlik kademesi: bu bölgeler z=0'dan heightMm'ye kadar dolu olacak. */
export type Kademe = { regions: Region[]; heightMm: number; ad?: string };

export type PlakaResult = {
  positions: Float64Array;
  indices: Uint32Array;
  volumeMm3: number;
  gramAg925: number;
  parcaSayisi: number;   // ayrık gövde sayısı — 1 OLMALI (dökümde ayrılmasın)
  kademeAlanMm2: number[];
};

const YOGUNLUK: Record<string, number> = {
  ag925: 10.36, au14: 13.07, au18: 15.58, au22: 17.80, pt: 21.45,
};

/** Bir bölgeyi manifold'un beklediği [x,y][] halkalarına çevirir (z atılır). */
function toRings(r: Region): number[][][] {
  const ring = (pts: V3[]) => pts.map((p) => [p[0], p[1]]);
  return [ring(r.outer), ...r.holes.map(ring)];
}

/**
 * Kademeleri ekstrüde edip tek gövdeye birleştirir.
 *
 * @param kademeler  yüksekliğe göre sıralı olması gerekmez
 * @param metal      gram hesabı için (varsayılan ag925)
 */
export async function buildPlaka(kademeler: Kademe[], metal = "ag925"): Promise<PlakaResult> {
  const w = await getWasm();
  const { CrossSection } = w;

  const solids: any[] = [];
  const kademeAlanMm2: number[] = [];

  try {
    for (const k of kademeler) {
      if (!k.regions.length || k.heightMm <= 0) { kademeAlanMm2.push(0); continue; }
      const polys = k.regions.flatMap(toRings);
      const cs = new CrossSection(polys, "EvenOdd");
      const area = cs.area();
      kademeAlanMm2.push(area);
      if (area <= 0) { cs.delete?.(); continue; }
      solids.push(cs.extrude(k.heightMm));
      cs.delete?.();
    }

    if (!solids.length) throw new Error("geo/plaka: ekstrüde edilecek kademe yok");

    // ikili ağaç birleşim (union.ts ile aynı disiplin)
    let items = solids;
    while (items.length > 1) {
      const next: any[] = [];
      for (let i = 0; i < items.length; i += 2) {
        if (i + 1 >= items.length) { next.push(items[i]); break; }
        const u = items[i].add(items[i + 1]);
        items[i].delete();
        items[i + 1].delete();
        next.push(u);
      }
      items = next;
    }

    const man = items[0];
    const mesh = man.getMesh();
    const volumeMm3: number = typeof man.volume === "function" ? man.volume() : man.getProperties().volume;
    const parts = typeof man.decompose === "function" ? man.decompose() : [];
    const parcaSayisi = parts.length || 1;
    parts.forEach((p: any) => p.delete?.());

    const out: PlakaResult = {
      positions: Float64Array.from(mesh.vertProperties as Float32Array),
      indices: Uint32Array.from(mesh.triVerts as Uint32Array),
      volumeMm3,
      gramAg925: (volumeMm3 / 1000) * (YOGUNLUK[metal] ?? YOGUNLUK.ag925),
      parcaSayisi,
      kademeAlanMm2,
    };
    man.delete();
    return out;
  } catch (e) {
    solids.forEach((s) => { try { s.delete(); } catch { /* zaten silinmiş */ } });
    throw e;
  }
}

/** Bir noktanın kapalı halka içinde olup olmadığı (even-odd ışın testi). */
function inRing(x: number, y: number, ring: V3[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/**
 * Ana siluetin DIŞINDA kalan bölgeleri atar.
 *
 * Kullanım sebebi: render'da zincir/bail gibi parçaya ait olmayan nesneler de
 * konturlanıyor. Ana siluet (en yüksek eşik, en büyük bölge) referans alınıp
 * dışarıda kalan her şey elenir.
 */
export function siluetIcindekiler(regions: Region[], siluetOuter: V3[]): Region[] {
  return regions.filter((r) => {
    // bölge merkezini kaba hesapla ve siluet içinde mi bak
    let cx = 0, cy = 0;
    for (const p of r.outer) { cx += p[0]; cy += p[1]; }
    cx /= r.outer.length; cy /= r.outer.length;
    if (inRing(cx, cy, siluetOuter)) return true;
    // merkez dışarı düşebilir (kavisli formlar) — birkaç köşe noktası da dene
    const step = Math.max(1, Math.floor(r.outer.length / 8));
    for (let i = 0; i < r.outer.length; i += step) {
      if (inRing(r.outer[i][0], r.outer[i][1], siluetOuter)) return true;
    }
    return false;
  });
}

/** En büyük alanlı bölge (ana siluet adayı). */
export function enBuyukBolge(regions: Region[]): Region | null {
  let best: Region | null = null, bestA = -1;
  for (const r of regions) {
    const xs = r.outer.map((p) => p[0]), ys = r.outer.map((p) => p[1]);
    const a = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (a > bestA) { bestA = a; best = r; }
  }
  return best;
}
