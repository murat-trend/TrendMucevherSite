// Geometri çekirdeği — ÜRÜN KATEGORİLERİ
// KATEGORİ SAF SEÇİMDİR (Murat düzeltmesi, 2026-07-14): model DÖNÜŞTÜRÜLMEZ —
// her kategorinin kendi modelleri ileride eklenecek; seçici + tasarımda yer
// hazırlığı için vardır. Sayfa yalnız KATEGORILER sabitini kullanır.
//
// NOT: applyKategori (aşağıda) ŞİMDİLİK PASİF — donanım katmanı (kulak
// kancası, broş iğnesi, yan halkalar, yüzük tabla+band) kanıtlanmış kod
// olarak duruyor; kategori modelleri gelince donanım eklentisi olarak döner.
// Donanım ölçüleri SABİT mm'dir (kanca kulağa, band parmağa göredir).
import { V3 } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { smoothChain } from "./curves";
import { GranuleMesh } from "./granule";
import { TOL_MEASURE_MM } from "./units";

export const KATEGORILER = {
  kolye: { label: "Kolye ucu", boyMm: 44 },
  bros: { label: "Broş", boyMm: 44 },
  kupe: { label: "Küpe", boyMm: 22 },
  bilezik: { label: "Bilezik", boyMm: 34 },
  yuzuk: { label: "Yüzük", boyMm: 20 },
} as const;
export type KategoriId = keyof typeof KATEGORILER;

export type Parcalar = {
  wires: { name: string; radiusMm: number; path: Polyline }[];
  granules: { name: string; center: V3; radiusMm: number }[];
  solids: { name: string; mesh: GranuleMesh }[];
};

const DONANIM_TEL_R = 0.4;   // kanca/iğne/halka teli yarıçapı (0.8mm — döküm güvenli)
const YUZUK_IC_R = 8.7;      // yüzük iç yarıçapı (~17.4mm çap, standart beden ~54)
const YUZUK_BAND_R = 0.75;   // band teli yarıçapı (1.5mm)

function bbox(p: Parcalar) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let atMinX: V3 = [0, 0, 0], atMaxX: V3 = [0, 0, 0];
  for (const w of p.wires) {
    for (const q of w.path.pts) {
      if (q[0] < minX) { minX = q[0]; atMinX = q; }
      if (q[0] > maxX) { maxX = q[0]; atMaxX = q; }
      minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
    }
  }
  return { minX, maxX, minY, maxY, atMinX, atMaxX };
}

/** Modeli kategoriye dönüştürür: gerekirse döndürür, donanım tellerini ekler.
 *  Dönüş yeni bir Parcalar'dır (kaynak nesne değiştirilmez; path/center yenilenir). */
export function applyKategori(src: Parcalar, kategori: KategoriId): Parcalar {
  const tol = TOL_MEASURE_MM;
  const out: Parcalar = {
    wires: src.wires.map((w) => ({ ...w, path: { pts: [...w.path.pts], closed: w.path.closed } })),
    granules: src.granules.map((g) => ({ ...g })),
    solids: src.solids.map((s) => ({ ...s })),
  };

  if (kategori === "kolye" || kategori === "bros") {
    // kolye: modellerin kendi askıları var. broş: arkaya iğne takımı eklenir.
    if (kategori === "bros") {
      const b = bbox(out);
      const zP = -1.4; // iğne düzlemi (motifin arkası)
      const solD: V3 = [b.atMinX[0] + 0.6, b.atMinX[1], 0];
      const sagD: V3 = [b.atMaxX[0] - 0.6, b.atMaxX[1], 0];
      out.wires.push(
        { name: "broş-ayak-L", radiusMm: DONANIM_TEL_R, path: { pts: [solD, [solD[0], solD[1], zP]], closed: false } },
        { name: "broş-ayak-R", radiusMm: DONANIM_TEL_R, path: { pts: [sagD, [sagD[0], sagD[1], zP]], closed: false } },
        { name: "broş-iğne", radiusMm: DONANIM_TEL_R, path: { pts: [[solD[0], solD[1], zP], [sagD[0], sagD[1], zP]], closed: false } },
      );
    }
    return out;
  }

  if (kategori === "kupe") {
    // kulak kancası: tepe merkezden yukarı çıkıp geriye kıvrılan S (sabit ölçü)
    const b = bbox(out);
    const t0 = b.maxY - 0.5; // tepeye gömülü başlar (lehim)
    out.wires.push({
      name: "küpe-kanca", radiusMm: DONANIM_TEL_R,
      path: smoothChain([
        [0, t0, 0], [0, t0 + 3.0, 0], [-1.6, t0 + 6.2, 0],
        [-4.4, t0 + 6.4, 0], [-6.4, t0 + 4.2, 0], [-6.8, t0 + 1.6, 0],
      ], tol),
    });
    return out;
  }

  if (kategori === "bilezik") {
    // iki yan bağlantı halkası (zincir/deri kordon takılır)
    const b = bbox(out);
    for (const side of [-1, 1] as const) {
      const uc = side < 0 ? b.atMinX : b.atMaxX;
      const cx = uc[0] + side * 1.4; // halka kenarı motife 0.6mm gömülür
      out.wires.push({
        name: `bilezik-halka${side > 0 ? "R" : "L"}`, radiusMm: DONANIM_TEL_R,
        path: adaptiveSample(
          (t) => [cx + 2.0 * Math.cos(t) * side, uc[1] + 2.0 * Math.sin(t), 0],
          0, 2 * Math.PI, tol, true),
      });
    }
    return out;
  }

  // YÜZÜK (tabla): motif yatay tablaya yatırılır, altına band gelir.
  // Döndürme: (x, y, z) -> (x, z, -y)  [xy düzlemi -> xz tablası, kalınlık +Y]
  const rot = (q: V3): V3 => [q[0], q[2], -q[1]];
  for (const w of out.wires) w.path = { pts: w.path.pts.map(rot), closed: w.path.closed };
  for (const g of out.granules) g.center = rot(g.center);
  for (const s of out.solids) {
    const P = Float64Array.from(s.mesh.positions);
    for (let i = 0; i < P.length; i += 3) {
      const y = P[i + 1], z = P[i + 2];
      P[i + 1] = z; P[i + 2] = -y;
    }
    s.mesh = { ...s.mesh, positions: P, center: rot(s.mesh.center) };
  }
  const bandPathR = YUZUK_IC_R + YUZUK_BAND_R;
  const cY = -bandPathR + 0.6; // band tepesi tablaya 0.6mm gömülür
  out.wires.push({
    name: "yüzük-band", radiusMm: YUZUK_BAND_R,
    path: adaptiveSample(
      (t) => [bandPathR * Math.sin(t), cY + bandPathR * Math.cos(t), 0],
      0, 2 * Math.PI, tol, true),
  });
  return out;
}
