// Geometri çekirdeği — SUYOLU BİLEKLİK (bilezik kategorisinin ilk gerçek modeli)
// Sert açık kelepçe: iki kenar rayı (T0) + iç astar (T1, liner kuralı) +
// raylar arasında akan SUYOLU omurgası (T1) + hücre dolguları (dönüşümlü
// spiral/kafes, T2/T3) + uçlarda kapama çubuğu ve topuz + kenar picot boncukları.
//
// Desen iki yorum: "dalga" (akan kıvrım — Vitruvius suyu) ve "meander"
// (köşeli suyolu / greek key; köşeler döküm için pahlanır).
//
// Tasarım DÜZ BANT uzayında yapılır (x = çevre yönü, y = bilek ekseni, z = dışa)
// ve bend.ts ile bilek silindirine sarılır — TELKARI.md §1.7: form omurgaya
// uygulanır, tel kesiti mikron-sabit kalır. Periyot sayısı çevreden TÜRER,
// keyfi sayı yok. Temaslar %10-15 gömme (§1.6), spiraller grid-arama ile
// yerleşir + lehim kuyruğu alır (§1.1-1.2).
import { V3, pointSegDist } from "./vec3";
import { Polyline, adaptiveSample } from "./wire";
import { spiralFn } from "./curves";
import { latticeFill, pointInPoly } from "./fill";
import { bendPath, cylPoint } from "./bend";
import { TOL_MEASURE_MM } from "./units";

export type SuyoluDesen = "dalga" | "meander";

export type SuyoluParams = {
  icCevreMm: number;    // bilek iç çevresi (kelepçenin iç yüzünden, 150-210)
  bantEniMm: number;    // ray merkezleri arası bant eni
  fineDiaMm: number;    // dolgu teli T2 (kafes T3 = 0.6×)
  frameDiaMm: number;   // ray/kapama T0 (astar + omurga T1 = 0.73×)
  desen: SuyoluDesen;
  acikligMm?: number;   // kelepçe açıklığı, iç yüzeyde yay (varsayılan 32mm)
  tolMm?: number;
};

// burma: sayfa bu teli burgu dokusuyla süpürür (§3.5 doku kontrastı —
// düz raylar + BURMALI akan omurga; hakem turu 1'in en büyük sıçraması)
export type SuyoluWire = { name: string; radiusMm: number; path: Polyline; burma?: boolean };

export type SuyoluBilgi = {
  icCapMm: number;        // iç çap (2·Rin)
  merkezYaricapMm: number;
  bantYayMm: number;      // ray omurgası yay uzunluğu (düz-bant L)
  aciklikMm: number;
  periyot: number;        // desen periyot sayısı (çevreden türedi)
  hucre: number;          // dolgu hücresi sayısı
};

// gömme oranı (§1.6): temas eden çiftin merkez mesafesi = rA + rB − EMBED·2·min(rA,rB)
const EMBED = 0.12;

/** İki telin gömmeli temas mesafesi. */
const contactDist = (rA: number, rB: number) => rA + rB - EMBED * 2 * Math.min(rA, rB);

/** Köşeli desen için pah: 90° köşeleri c mesafeli iki noktayla kırar
 *  (döküm köşe yayı — keskin iç köşe çatlak başlangıcıdır). Uç noktalar korunur. */
function chamfer(pts: V3[], c: number): V3[] {
  if (pts.length < 3) return pts;
  const out: V3[] = [pts[0]];
  for (let i = 1; i + 1 < pts.length; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ca = Math.min(c, la * 0.4), cb = Math.min(c, lb * 0.4);
    out.push(
      [p[0] + ((a[0] - p[0]) / la) * ca, p[1] + ((a[1] - p[1]) / la) * ca, p[2]],
      [p[0] + ((b[0] - p[0]) / lb) * cb, p[1] + ((b[1] - p[1]) / lb) * cb, p[2]],
    );
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function buildSuyoluBileklik(p: SuyoluParams): {
  wires: SuyoluWire[];
  granules: { name: string; center: V3; radiusMm: number }[];
  solids: { name: string; mesh: { positions: Float64Array; indices: Uint32Array } }[];
  bilgi: SuyoluBilgi;
} {
  const tol = p.tolMm ?? TOL_MEASURE_MM;
  const rT0 = p.frameDiaMm / 2;
  const rT1 = rT0 * 0.73;
  const rT2 = p.fineDiaMm / 2;
  const rT3 = rT2 * 0.6;

  // ---- bant zarfı: iç çevre sözü tel İÇ YÜZEYİNDEN verilir
  const Rin = p.icCevreMm / (2 * Math.PI);
  const Rc = Rin + rT0;                       // omurga merkez hattı yarıçapı
  const gap = Math.min(p.acikligMm ?? 32, p.icCevreMm * 0.35);
  const phi = 2 * Math.PI - gap / Rin;        // bant açısı (açıklık iç yüzeyde ölçülür)
  const L = phi * Rc;                         // düz-bant boyu (merkez hat yayı)
  const W = p.bantEniMm;
  const yRail = W / 2;
  const yLiner = yRail - contactDist(rT0, rT1);        // astar raya gömülü paralel
  const A = yLiner - contactDist(rT1, rT1);            // omurga tepesi astara gömülür
  if (A < W * 0.12) throw new Error("geo/suyolu: bant eni tel kalınlığına göre çok dar");

  // periyot çevreden türer: hedef hücre oranı ~1.6 × iç yükseklik
  const H = 2 * A;
  const nHalf = Math.max(4, Math.round((2 * L) / (1.6 * H)));
  const lambda = (2 * L) / nHalf;
  // meander tam periyot sayısı ve periyodu (bant boyu tam bölünür)
  const lamM = L / Math.max(2, Math.round(L / lambda));
  // meander yüksekliği: transition x'lerinden uzak kalarak oku
  const meanderY = (x: number): number => {
    const u = (((x + L / 2) % lamM) + lamM) % lamM;
    return u < lamM / 2 ? A : -A;
  };

  const wires: SuyoluWire[] = [];
  const granules: { name: string; center: V3; radiusMm: number }[] = [];
  const bendW = (name: string, radiusMm: number, path: Polyline) =>
    wires.push({ name, radiusMm, path: bendPath(path, Rc, tol) });
  const bendG = (name: string, c: V3, radiusMm: number) =>
    granules.push({ name, center: cylPoint(c, Rc), radiusMm });

  // ---- raylar + astarlar (düz çizgi -> sarılınca yay)
  for (const s of [1, -1] as const) {
    const ad = s > 0 ? "üst" : "alt";
    bendW(`ray-${ad}`, rT0, { pts: [[-L / 2, s * yRail, 0], [L / 2, s * yRail, 0]], closed: false });
    bendW(`astar-${ad}`, rT1, { pts: [[-L / 2, s * yLiner, 0], [L / 2, s * yLiner, 0]], closed: false });
  }

  // ---- kapama çubukları (uçlar): raylardan hafif taşar -> T-birleşim gömmesi
  for (const s of [1, -1] as const) {
    const x = (s * L) / 2;
    bendW(`kapama-${s > 0 ? "sağ" : "sol"}`, rT0, {
      pts: [[x, -(yRail + rT0 * 0.4), 0], [x, yRail + rT0 * 0.4, 0]], closed: false,
    });
    // topuz: açık kelepçe ucunun klasik bitişi — çubuğa gömülü küre
    const rTopuz = Math.max(2.2 * rT0, 0.115 * W);
    bendG(`topuz-${s > 0 ? "sağ" : "sol"}`, [x + s * rTopuz * 0.55, 0, 0], rTopuz);
  }

  // ---- SUYOLU OMURGASI + tepe/çukur konumları (picot ve hücreler için)
  // dalga: y = A·sin(2π(x+L/2)/λ) — uçlarda 0 (kapama çubuğuna gömülür)
  // meander: %50 doluluklu mazgal (üst düzlükler astara gömülür), köşeler pahlı
  const crestsTop: number[] = [];    // üst temas x'leri
  const crestsBot: number[] = [];
  if (p.desen === "dalga") {
    const fn = (t: number): V3 => {
      const x = -L / 2 + t * L;
      return [x, A * Math.sin((2 * Math.PI * (x + L / 2)) / lambda), 0];
    };
    wires.push({ name: "suyolu-omurga", radiusMm: rT1, burma: true,
      path: bendPath(adaptiveSample(fn, 0, 1, tol, false), Rc, tol) });
    for (let x = -L / 2 + lambda / 4; x < L / 2 - 1e-9; x += lambda) crestsTop.push(x);
    for (let x = -L / 2 + (3 * lambda) / 4; x < L / 2 - 1e-9; x += lambda) crestsBot.push(x);
  } else {
    const nPer = Math.round(L / lamM);
    const pts: V3[] = [];
    for (let k = 0; k < nPer; k++) {
      const x0 = -L / 2 + k * lamM;
      pts.push([x0, A, 0], [x0 + lamM / 2, A, 0], [x0 + lamM / 2, -A, 0], [x0 + lamM, -A, 0]);
      crestsTop.push(x0 + lamM / 4);
      crestsBot.push(x0 + (3 * lamM) / 4);
    }
    wires.push({ name: "suyolu-omurga", radiusMm: rT1, burma: true,
      path: bendPath({ pts: chamfer(pts, Math.max(2.5 * rT1, 0.35)), closed: false }, Rc, tol) });
  }

  // ---- kenar picot boncukları (§3.2): DÜZENLİ seri — her yarım periyotta,
  // iki rayda aynı hizada (hakem turu 1: "seyrek picot kenarı bitirmiyor")
  const rPicot = 1.2 * rT0;
  const yPicot = yRail + contactDist(rT0, rPicot);
  [...crestsTop, ...crestsBot].sort((a, b) => a - b).forEach((x, i) => {
    bendG(`picot-üst${i}`, [x, yPicot, 0], rPicot);
    bendG(`picot-alt${i}`, [x, -yPicot, 0], rPicot);
  });

  // ---- HÜCRELER: omurga ile astar arasındaki cepler; dolgu dönüşümlü.
  // Cep sınırı MERKEZ HATLARLA yazılır (kelebek kanıtlı kalıbı): kafes uçları
  // sınır teline tam gömülür, spiral kendine-uyan yarıçapla hafif gömülür.
  const samplePattern = (xa: number, xb: number): V3[] => {
    // düz-bant uzayında omurganın [xa,xb] dilimi
    if (p.desen === "dalga") {
      const out: V3[] = [];
      const n = Math.max(12, Math.ceil((xb - xa) / (lambda / 24)));
      for (let i = 0; i <= n; i++) {
        const x = xa + ((xb - xa) * i) / n;
        out.push([x, A * Math.sin((2 * Math.PI * (x + L / 2)) / lambda), 0]);
      }
      return out;
    }
    // meander: KESİN köşe yürüyüşü — hücre sınırı tel merkez hattının üstünde
    // kalır ki kafes uçları tele tam gömülsün (yaklaşık örnekleme uçları
    // havada bırakır — yerçekimi kanunu ihlali olurdu).
    const out: V3[] = [[xa, meanderY(xa + 1e-9), 0]];
    const m0 = Math.floor((xa + L / 2) / (lamM / 2)) + 1;
    for (let m = m0; m * (lamM / 2) - L / 2 < xb - 1e-9; m++) {
      const xt = m * (lamM / 2) - L / 2;
      if (xt <= xa + 1e-9) continue;
      out.push([xt, meanderY(xt - 1e-9), 0], [xt, meanderY(xt + 1e-9), 0]);
    }
    out.push([xb, meanderY(xb - 1e-9), 0]);
    return out;
  };

  let hucreSay = 0;
  // zincir üzerindeki en yakın nokta (lehim kuyruğu hedefi — kuyruk rastgele
  // köşeye değil, omurgaya/astara KISA ve anlamlı bağ çubuğu olarak gider;
  // hakem turu 1: "başıboş diyagonal" eleştirisi)
  const closestOnChain = (x: number, y: number, chain: V3[]): V3 => {
    let best: V3 = chain[0], bd = Infinity;
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = chain[i], b = chain[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
      const px = a[0] + t * dx, py = a[1] + t * dy;
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = [px, py, 0]; }
    }
    return best;
  };

  const fillCell = (tag: string, poly: V3[], pattern: V3[], yL: number, useLattice: boolean, angleDeg: number) => {
    // kılcal şerit hücreleri (meander uçlarındaki 0.3mm'lik boşluk gibi) atlanır
    const pys = poly.map((q) => q[1]), pxs = poly.map((q) => q[0]);
    if (Math.max(...pys) - Math.min(...pys) < 1 || Math.max(...pxs) - Math.min(...pxs) < 1) return;
    hucreSay++;
    if (useLattice) {
      // minLen 1.0: kıymık budama (hakem turu 1 — <1mm kırpıntı dökümde kopar)
      latticeFill(poly, [], Math.max(0.8, H / 9), angleDeg, 1.0).forEach((seg, i) =>
        bendW(`${tag}-kafes${i}`, rT3, seg));
      return;
    }
    // kendine-uyan spiral GÖZ: tüm kenarlara en uzak nokta (18×18 grid araması)
    const edgeDist = (x: number, y: number, rings: V3[][]): number => {
      let d = Infinity;
      for (const ring of rings)
        for (let i = 0; i < ring.length; i++)
          d = Math.min(d, pointSegDist([x, y, 0], ring[i], ring[(i + 1) % ring.length]));
      return d;
    };
    const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const holes: V3[][] = [];
    for (let sp = 0; sp < 2; sp++) {           // ana göz + boş kola 1 mini (§3.7 ritim)
      let cx = 0, cy = 0, best = -1;
      const N = 18;
      for (let i = 1; i < N; i++) {
        for (let j = 1; j < N; j++) {
          const x = x0 + ((x1 - x0) * i) / N, y = y0 + ((y1 - y0) * j) / N;
          if (!pointInPoly(x, y, poly)) continue;
          if (holes.some((h) => pointInPoly(x, y, h))) continue;
          const d = edgeDist(x, y, [poly, ...holes]);
          if (d > best) { best = d; cx = x; cy = y; }
        }
      }
      const r = best - rT2 * 0.2;              // yakın kenara hafif gömülür (1. temas)
      if (r < (sp === 0 ? 2.2 : 3.2) * rT2) return;
      // SIKI SARIM + AÇIK MERKEZ (hakem turu 1: "disk değil göz"; tur 2:
      // "rondela olmasın, 1-2 tur daha insin" → sınır 8): tur aralığı 2.45·rT2
      // (komşu turlar lehim temasında), merkez açık kalır ama boğulmaz
      const pitchSp = 2.45 * rT2;
      const turns = Math.min(8, Math.max(2.2, (r * 0.84) / pitchSp));
      const rIn = Math.max(0.16 * r, r - turns * pitchSp);
      let a0: number;
      if (sp === 0) {
        // çift bağ çubuğu: göz omurgaya VE astara kısa kuyrukla bağlanır —
        // göz "akan çizgiden doğar" okunur, iki lehim garantisi (§1.1)
        const hedefOmurga = closestOnChain(cx, cy, pattern);
        a0 = Math.atan2(hedefOmurga[1] - cy, hedefOmurga[0] - cx);
        bendW(`${tag}-bağ-omurga`, rT2, {
          pts: [[cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0], hedefOmurga], closed: false,
        });
        // astar bağı sadece KISA ise çizilir (hakem tur 2: uzun yalnız dikey
        // çubuk kompozisyonda başıboş durur; 2 temas zaten gömme+omurga bağıyla var)
        const astarBoy = Math.abs(yL - cy) - r;
        if (astarBoy <= 3) {
          bendW(`${tag}-bağ-astar`, rT2, {
            pts: [[cx, cy + Math.sign(yL - cy) * r, 0], [cx, yL, 0]], closed: false,
          });
        }
      } else {
        // mini: kuyruk ana göze + ikinci kuyruk en yakın hücre kenarına (§1.1 iki temas)
        const main = holes[0];
        let mx = 0, my = 0;
        for (const q of main) { mx += q[0]; my += q[1]; }
        mx /= main.length; my /= main.length;
        a0 = Math.atan2(my - cy, mx - cx);
        const rMain = Math.hypot(main[0][0] - mx, main[0][1] - my);
        bendW(`${tag}-mini-kuyruk`, rT2, {
          pts: [
            [cx + r * Math.cos(a0), cy + r * Math.sin(a0), 0],
            [mx - rMain * 0.85 * Math.cos(a0), my - rMain * 0.85 * Math.sin(a0), 0],
          ], closed: false,
        });
        const kenar = closestOnChain(cx, cy, [...poly, poly[0]]);
        const aK = Math.atan2(kenar[1] - cy, kenar[0] - cx);
        bendW(`${tag}-mini-bağ`, rT2, {
          pts: [[cx + r * Math.cos(aK), cy + r * Math.sin(aK), 0], kenar], closed: false,
        });
      }
      bendW(sp === 0 ? `${tag}-göz` : `${tag}-mini-göz`, rT2,
        adaptiveSample(spiralFn(cx, cy, r, rIn, turns, a0, 1), 0, 1, tol, false));
      // yerleşen göz, sonraki arama için engel çemberi olur
      const circ: V3[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (2 * Math.PI * i) / 12;
        circ.push([cx + (r + rT2) * Math.cos(a), cy + (r + rT2) * Math.sin(a), 0]);
      }
      holes.push(circ);
    }
  };

  // hücre aralıkları: üst cepler (tepe->tepe), alt cepler (çukur->çukur);
  // uç parçaları kapama çubuğuna dayanır. DAMA PARİTESİ (hakem turu 1):
  // aynı taraftaki komşu hücreler HER ZAMAN farklı dolgu alır (iç hücre
  // sayacı; uç parçaları sayaca girmez), alt taraf üstün tersiyle başlar —
  // omurganın iki yanı aynı kafese boğulmaz, suyolu çizgisi kaybolmaz.
  const buildSide = (contacts: number[], yL: number, tagSide: string, latticeOffset: number) => {
    const edges = [-L / 2, ...contacts, L / 2];
    let ic = 0;
    for (let i = 0; i + 1 < edges.length; i++) {
      const xa = edges[i], xb = edges[i + 1];
      const kucuk = (xb - xa) < lambda * 0.7;                 // uç parçası
      const pattern = samplePattern(xa, xb);
      const poly: V3[] = [...pattern, [xb, yL, 0], [xa, yL, 0]];
      const useLattice = kucuk || (ic + latticeOffset) % 2 === 0;
      // kafes açısı TARAFA göre zıt (§3.6 + hakem tur 2: omurganın iki yanı
      // aynı açıda olursa "sürekli kafes tarlası" yanılsaması doğar)
      const angle = yL > 0 ? 45 : 0;
      fillCell(`${tagSide}${i}`, poly, pattern, yL, useLattice, angle);
      if (!kucuk) ic++;
    }
  };
  buildSide(crestsTop, yLiner, "hücre-üst", 0);
  buildSide(crestsBot, -yLiner, "hücre-alt", 1);

  return {
    wires, granules, solids: [],
    bilgi: {
      icCapMm: 2 * Rin,
      merkezYaricapMm: Rc,
      bantYayMm: L,
      aciklikMm: gap,
      periyot: nHalf / 2,
      hucre: hucreSay,
    },
  };
}
