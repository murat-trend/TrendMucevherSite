// SUYOLU MOTORU — MUMA ATMA (toplu baskı yerleşimi) + düz seriliş
// "Yere serilmiş, saportları takılmış" tek STL: N bakla grid dizilir, her
// baklanın altına koni saportlar + ortak taban rafı eklenir — dosya direkt
// yazıcıya gider. Kurallar: P4 (saport uç teması ~0.35mm, Formlabs castable),
// S14 (parça bindirmesi ≥0.15 — saport uçları baklaya/rafa gömülür),
// P1 (parçalar arası boşluk — baskıda 2mm emniyet).
import { BaklaMesh } from "./bakla";

const SAPORT_UC_MM = 0.35;     // P4: temas ucu
const SAPORT_GOVDE_MM = 0.9;   // saport gövde çapı
const SAPORT_BOY_MM = 3.0;     // bakla tabanı ile raf arası
const SAPORT_GOMME_MM = 0.15;  // S14: uç baklaya gömülür
const RAF_KALINLIK_MM = 1.4;
const RAF_TASMA_MM = 2.0;      // rafın grid kenarından taşması
const PARCA_ARALIK_MM = 2.0;   // P1 baskı emniyeti

type XY = [number, number];

/** Kapalı koni/silindir (z ekseni boyunca, alt merkez [cx,cy,z0]). */
function koni(rAlt: number, rUst: number, boy: number, cx: number, cy: number, z0: number, n = 12): BaklaMesh {
  const positions = new Float64Array((2 * n + 2) * 3);
  positions.set([cx, cy, z0], 0);                     // alt kutup
  for (let j = 0; j < n; j++) {
    const a = (2 * Math.PI * j) / n;
    positions.set([cx + rAlt * Math.cos(a), cy + rAlt * Math.sin(a), z0], (1 + j) * 3);
    positions.set([cx + rUst * Math.cos(a), cy + rUst * Math.sin(a), z0 + boy], (1 + n + j) * 3);
  }
  positions.set([cx, cy, z0 + boy], (1 + 2 * n) * 3); // üst kutup
  const tris: number[] = [];
  const alt = (j: number) => 1 + (j % n), ust = (j: number) => 1 + n + (j % n);
  for (let j = 0; j < n; j++) {
    tris.push(0, alt(j + 1), alt(j));                          // taban
    tris.push(alt(j), alt(j + 1), ust(j + 1), alt(j), ust(j + 1), ust(j)); // yan
    tris.push(1 + 2 * n, ust(j), ust(j + 1));                  // tavan
  }
  return { positions, indices: new Uint32Array(tris) };
}

/** Kapalı kutu (merkez [cx,cy], z0..z1). */
function kutu(bx: number, by: number, cx: number, cy: number, z0: number, z1: number): BaklaMesh {
  const x0 = cx - bx / 2, x1 = cx + bx / 2, y0 = cy - by / 2, y1 = cy + by / 2;
  const positions = new Float64Array([
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
  ]);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2,           // taban (dışa: -z)
    4, 5, 6, 4, 6, 7,           // tavan
    0, 1, 5, 0, 5, 4,           // y0 yüzü
    1, 2, 6, 1, 6, 5,           // x1
    2, 3, 7, 2, 7, 6,           // y1
    3, 0, 4, 3, 4, 7,           // x0
  ]);
  return { positions, indices };
}

/** Mesh'i verilen [dx,dy,dz] konumlarına çoğaltıp tek buffer'da birleştirir. */
export function kopyala(mesh: BaklaMesh, konumlar: [number, number, number][]): BaklaMesh {
  const vLen = mesh.positions.length, iLen = mesh.indices.length;
  const positions = new Float64Array(vLen * konumlar.length);
  const indices = new Uint32Array(iLen * konumlar.length);
  konumlar.forEach(([dx, dy, dz], k) => {
    for (let i = 0; i < vLen; i += 3) {
      positions[k * vLen + i] = mesh.positions[i] + dx;
      positions[k * vLen + i + 1] = mesh.positions[i + 1] + dy;
      positions[k * vLen + i + 2] = mesh.positions[i + 2] + dz;
    }
    const off = (k * vLen) / 3;
    for (let i = 0; i < iLen; i++) indices[k * iLen + i] = mesh.indices[i] + off;
  });
  return { positions, indices };
}

function birlestir(parcalar: BaklaMesh[]): BaklaMesh {
  const vLen = parcalar.reduce((s, p) => s + p.positions.length, 0);
  const iLen = parcalar.reduce((s, p) => s + p.indices.length, 0);
  const positions = new Float64Array(vLen);
  const indices = new Uint32Array(iLen);
  let vo = 0, io = 0;
  for (const p of parcalar) {
    positions.set(p.positions, vo);
    for (let i = 0; i < p.indices.length; i++) indices[io + i] = p.indices[i] + vo / 3;
    vo += p.positions.length;
    io += p.indices.length;
  }
  return { positions, indices };
}

/** Düz seriliş konumları (önizleme "yerde" + muma-at grid'i). */
export function gridKonumlar(n: number, boyMm: number, enMm: number): { konumlar: [number, number, number][]; sutun: number; satir: number } {
  const sutun = Math.max(1, Math.ceil(Math.sqrt(n * (enMm + PARCA_ARALIK_MM) / (boyMm + PARCA_ARALIK_MM))));
  const satir = Math.ceil(n / sutun);
  const dx = boyMm + PARCA_ARALIK_MM, dy = enMm + PARCA_ARALIK_MM;
  const konumlar: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / sutun), c = i % sutun;
    konumlar.push([(c - (sutun - 1) / 2) * dx, (r - (satir - 1) / 2) * dy, 0]);
  }
  return { konumlar, sutun, satir };
}

/** Zincir düz açılmış önizleme konumları (tek sıra). */
export function duzSiraKonumlar(n: number, adimMm: number): [number, number, number][] {
  const konumlar: [number, number, number][] = [];
  for (let i = 0; i < n; i++) konumlar.push([(i - (n - 1) / 2) * adimMm, 0, 0]);
  return konumlar;
}

/** MUMA AT: N bakla grid + köşe saportları + taban rafı — tek STL gövdesi.
 *  Bakla yerel z=0 tabanı saport üstlerine oturur; raf en altta. */
export function mumaAt(
  bakla: BaklaMesh, boyMm: number, enMm: number, n: number,
): { mesh: BaklaMesh; sutun: number; satir: number; rafMm: [number, number] } {
  const { konumlar, sutun, satir } = gridKonumlar(n, boyMm, enMm);
  const parcalar: BaklaMesh[] = [];
  // baklalar saport boyu kadar yukarıda
  parcalar.push(kopyala(bakla, konumlar.map(([x, y]) => [x, y, SAPORT_BOY_MM] as [number, number, number])));
  // saportlar: her baklanın 4 köşesi altına (uç baklaya, taban rafa gömülü)
  const sx = boyMm / 2 - 0.9, sy = enMm / 2 - 0.9;
  const ucler: XY[] = [[-sx, -sy], [sx, -sy], [sx, sy], [-sx, sy]];
  for (const [x, y] of konumlar.map(([a, b]) => [a, b] as XY)) {
    for (const [ox, oy] of ucler) {
      parcalar.push(koni(
        SAPORT_GOVDE_MM / 2, SAPORT_UC_MM / 2,
        SAPORT_BOY_MM + SAPORT_GOMME_MM * 2,
        x + ox, y + oy, -SAPORT_GOMME_MM,
      ));
    }
  }
  // raf
  const rafX = sutun * (boyMm + PARCA_ARALIK_MM) + 2 * RAF_TASMA_MM;
  const rafY = satir * (enMm + PARCA_ARALIK_MM) + 2 * RAF_TASMA_MM;
  parcalar.push(kutu(rafX, rafY, 0, 0, -RAF_KALINLIK_MM, 0));
  return { mesh: birlestir(parcalar), sutun, satir, rafMm: [rafX, rafY] };
}
