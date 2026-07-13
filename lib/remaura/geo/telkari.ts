// Geometri çekirdeği — TELKARİ DAMLA (ilk parametrik model)
// Klasik telkari kolye ucu: damla çerçeve (kalın tel) + içinde aynalı
// spiral dolgu (ince tel) + tepede dik askı halkası.
//
// Tüm eğriler analitik; mesh'e çevrim tel motorunda tolerans-güdümlü yapılır.
// Teller lehimli gerçek telkari gibi birbirine DEĞER (kesişim payı bilinçli);
// tek gövdeye boolean birleştirme sonraki tuğla (manifold-3d).
import { V3 } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { TOL_MEASURE_MM } from "./units";

export type TelkariParams = {
  heightMm: number;     // damla gövde yüksekliği (askı hariç)
  fineDiaMm: number;    // ince dolgu teli çapı
  frameDiaMm: number;   // çerçeve/askı teli çapı
  tolMm?: number;       // örnekleme toleransı (varsayılan: mikron sözü)
};

export type TelkariWire = { name: string; radiusMm: number; path: Polyline };

/** Damla dış hattı (birim yükseklik, sivri uç yukarıda, z=0 düzlemi). */
function dropOutline(t: number): V3 {
  const pinch = Math.sin(t / 2);
  return [0.92 * Math.sin(t) * pinch * pinch, 0.5 * Math.cos(t), 0];
}

/** Verilen yükseklikte damlanın yarı genişliği (birim uzay). Dolgu dizilişi
 *  bu fonksiyondan TÜRER — elle yerleşim sabiti yok, teller çerçeveye değer. */
function dropHalfWidth(cy: number): number {
  if (cy >= 0.5 || cy <= -0.5) return 0;
  const t = Math.acos(2 * cy);
  const p = Math.sin(t / 2);
  return 0.92 * Math.sin(t) * p * p;
}

/** Arşimet spirali: merkez cx,cy — açı a0'dan başlar, turns tur döner,
 *  yarıçap r0'dan r1'e lineer büyür. dir=-1 ayna (sol el) spiral. */
function spiral(
  cx: number, cy: number, r0: number, r1: number, turns: number, a0: number, dir: 1 | -1,
) {
  return (t: number): V3 => {
    const th = a0 + dir * 2 * Math.PI * turns * t;
    const r = r0 + (r1 - r0) * t;
    return [cx + r * Math.cos(th), cy + r * Math.sin(th), 0];
  };
}

export function buildTelkariDrop(p: TelkariParams): TelkariWire[] {
  const h = p.heightMm;
  const tol = p.tolMm ?? TOL_MEASURE_MM;
  const rFine = p.fineDiaMm / 2;
  const rFrame = p.frameDiaMm / 2;
  const wires: TelkariWire[] = [];

  // 1) damla çerçeve (kapalı)
  wires.push({
    name: "çerçeve",
    radiusMm: rFrame,
    path: adaptiveSample((t) => {
      const [x, y] = dropOutline(t);
      return [x * h, y * h, 0];
    }, 0, 2 * Math.PI, tol, true),
  });

  // 2) askı halkası — tepe noktasının üstünde, kolyeye dik düzlemde (xz)
  const bailR = 0.08 * h;
  const bailCy = 0.5 * h + bailR * 0.55; // çerçeve tepesine gömülü — lehim payı
  wires.push({
    name: "askı",
    radiusMm: rFrame,
    path: adaptiveSample(
      (t) => [bailR * Math.cos(t), bailCy + bailR * Math.sin(t) * 0.35, bailR * Math.sin(t)],
      0, 2 * Math.PI, tol, true),
  });

  // 3) orta damar: tepe kesişiminden alt çanağa inen düşey tel — dolgu
  //    spirallerinin iç dayanağı (her spiral hem damara hem çerçeveye değer)
  const rFrameU = rFrame / h; // çerçeve tel yarıçapı, birim uzayda
  wires.push({
    name: "damar",
    radiusMm: rFine,
    path: {
      pts: [[0, (0.5 - rFrameU) * h, 0], [0, (-0.5 + rFrameU) * h, 0]] as V3[],
      closed: false,
    },
  });

  // 4) iç dolgu: klasik "karagöz" dizilişi — satır satır spiral.
  //    Her satırın genişliği dış hattan HESAPLANIR; spiraller damardan
  //    çerçeveye zincir halinde temas eder (K daire yan yana, hepsi değme).
  const R_MAX = 0.13, R_MIN = 0.02;   // birim uzayda spiral dış yarıçap sınırları
  const SOLDER = 0.985;               // dikey ilerleme payı — satırlar hafif değsin
  let cy = 0.40;                      // boyundan başla
  let prevR = 0;
  for (let row = 0; row < 10; row++) {
    // sabit-nokta iterasyonu: bir sonraki satırın merkezi, kendi yarıçapına bağlı
    let cyNext = cy, R = 0, K = 1;
    for (let it = 0; it < 8; it++) {
      const usable = dropHalfWidth(cyNext) - rFrameU; // damar(x=0) -> çerçeve içi
      if (usable < R_MIN) { R = 0; break; }
      K = Math.max(1, Math.ceil(usable / (2 * R_MAX)));
      R = usable / (2 * K);
      cyNext = cy - (prevR + R) * SOLDER;
    }
    if (R < R_MIN || cyNext - R < -0.5 + rFrameU) break;
    for (let k = 0; k < K; k++) {
      const cx = (2 * k + 1) * R; // damara ve komşulara temas eden zincir
      for (const side of [1, -1] as const) {
        const dir = (((k + row) % 2 === 0 ? 1 : -1) * side) as 1 | -1;
        wires.push({
          name: `spiral(satır${row + 1} ${side > 0 ? "sağ" : "sol"}${K > 1 ? ` ${k + 1}` : ""})`,
          radiusMm: rFine,
          // t=0 dış uç: sağda +x (çerçeve/komşuya değer), solda ayna
          path: adaptiveSample(
            spiral(side * cx * h, cyNext * h, R * h, 0.17 * R * h, 2.1, side > 0 ? 0 : Math.PI, dir),
            0, 1, tol, false),
        });
      }
    }
    prevR = R;
    cy = cyNext;
  }

  return wires;
}
