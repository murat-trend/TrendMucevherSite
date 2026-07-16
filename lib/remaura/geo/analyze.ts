// Geometri çekirdeği — KIRILGANLIK ANALİZİ (Faz 1)
// Tel başına desteksiz açıklık / çap oranı: kiriş sezgisi (sehim ~ L³/d⁴) +
// döküm kılavuzu çap eşikleri. Temaslar mesh'ten değil OMURGALARDAN bulunur
// (uzamsal ızgara + yakınlık) — joints grafı gelene kadarki v1.
//
// EŞİK NOTU (dürüstlük): L/d eşiği için hakemli yayın YOK (4 ajanlık tarama,
// 2026-07-14) — zanaat gözlemi 10-30 aralığı. Başlangıç eşikleri deneysel;
// Murat'ın döküm sonuçlarıyla KALİBRE edilecek. Çap eşikleri: Formlabs/
// Materialise döküm kılavuzları (Ag925 dolgu ≥0.6mm güvenli, <0.5mm riskli).
import { V3, dist } from "./vec3";

export const SPAN_WARN_RATIO = 20;   // L/d bu oranı aşarsa UYARI (kalibre edilecek)
export const SPAN_DANGER_RATIO = 35; // bu oranı aşarsa RİSKLİ
export const DIA_WARN_MM = 0.6;      // dolgu teli bu çapın altındaysa uyarı
export const DIA_DANGER_MM = 0.5;    // bu çapın altı döküm için riskli
const CONTACT_EXTRA_MM = 0.08;       // temas payı (kasıtlı gömme + sayısal tolerans)
const SAMPLE_STEP_MM = 0.3;          // analiz örnekleme adımı (omurga noktaları seyreltilir)

export type AnalyzeWire = {
  pts: V3[];
  radiusMm: number;  // temas hesabı için gerçek damar yarıçapı
  diaMm?: number;    // döküm çap kuralı için etkin çap (burgu: toplam çap; yoksa 2r)
};
export type WireVerdict = {
  level: 0 | 1 | 2;          // 0 = güvenli, 1 = uyarı, 2 = riskli
  maxSpanMm: number;         // en uzun desteksiz açıklık
  ratio: number;             // maxSpan / çap
  diaFlag: 0 | 1 | 2;        // çap eşiği ihlali
  supports: number;          // bulunan temas noktası sayısı
};

/** Omurgayı yay uzunluğu boyunca ~stepMm aralıkla yeniden örnekler —
 *  yoğun omurgayı seyreltir, seyrek omurgayı (2 noktalı düz tel gibi)
 *  ARA NOKTA üreterek yoğunlaştırır (temas kaçırmamak için şart). */
function sampleArc(pts: V3[], stepMm: number): { p: V3; s: number }[] {
  const out: { p: V3; s: number }[] = [{ p: pts[0], s: 0 }];
  let s = 0;
  let nextS = stepMm;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = dist(a, b);
    const segStart = s;
    s += L;
    while (nextS <= s && L > 0) {
      const t = (nextS - segStart) / L;
      out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], s: nextS });
      nextS += stepMm;
    }
  }
  out.push({ p: pts[pts.length - 1], s });
  return out;
}

/** Tüm teller için desteksiz açıklık analizi. Döner: tel sırasına göre verdicts. */
export function analyzeSpans(wires: AnalyzeWire[]): { verdicts: WireVerdict[]; worstRatio: number } {
  // 1) uzamsal ızgara: tüm örnek noktalar (telId + yay konumu ile)
  const cell = 1.0; // mm
  const grid = new Map<string, { w: number; p: V3; s: number }[]>();
  const samples = wires.map((w) => sampleArc(w.pts, SAMPLE_STEP_MM));
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  samples.forEach((pts, wi) => {
    for (const { p, s } of pts) {
      const k = key(p[0], p[1], p[2]);
      let arr = grid.get(k);
      if (!arr) { arr = []; grid.set(k, arr); }
      arr.push({ w: wi, p, s });
    }
  });
  // KENDİNE LEHİM (2026-07-16, suyolu dersi): sık sarımlı spiralde komşu
  // turlar birbirine değer ve lehimlenir — aynı telin yay üzerinde uzak ama
  // uzayda temas eden noktaları DESTEK sayılır. Kapalı halkalarda kapatılır
  // (uçları buluşan yüzen halka kendi kendini "destekli" gösterirdi).
  const selfSolderOk = wires.map((w) =>
    w.pts.length > 1 && dist(w.pts[0], w.pts[w.pts.length - 1]) > 3 * SAMPLE_STEP_MM);

  // 2) tel başına: BAŞKA tele temas eden yay konumları -> en uzun boşluk
  const verdicts: WireVerdict[] = [];
  let worstRatio = 0;
  samples.forEach((pts, wi) => {
    const rw = wires[wi].radiusMm;
    const supportS: number[] = [];
    for (const { p, s } of pts) {
      const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
      let touched = false;
      for (let dx = -1; dx <= 1 && !touched; dx++)
        for (let dy = -1; dy <= 1 && !touched; dy++)
          for (let dz = -1; dz <= 1 && !touched; dz++) {
            const arr = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!arr) continue;
            for (const o of arr) {
              if (o.w === wi) {
                // kendine lehim: yay üzerinde komşuluk sayılmaz, uzak temas sayılır
                if (!selfSolderOk[wi] || Math.abs(o.s - s) < Math.max(1.2, 10 * rw)) continue;
                if (dist(p, o.p) <= 2 * rw + CONTACT_EXTRA_MM) { touched = true; break; }
                continue;
              }
              const tol = rw + wires[o.w].radiusMm + CONTACT_EXTRA_MM;
              if (dist(p, o.p) <= tol) { touched = true; break; }
            }
          }
      if (touched) supportS.push(s);
    }
    const total = pts[pts.length - 1].s;
    let maxSpan: number;
    if (supportS.length === 0) {
      maxSpan = total * 2; // hiç teması olmayan tel = havada (en ağır ceza)
    } else {
      maxSpan = 0;
      // uçlar: ilk temasa kadar / son temastan sona kadar konsol — ×2 sayılır
      maxSpan = Math.max(maxSpan, supportS[0] * 2, (total - supportS[supportS.length - 1]) * 2);
      for (let i = 1; i < supportS.length; i++)
        maxSpan = Math.max(maxSpan, supportS[i] - supportS[i - 1]);
    }
    const dia = wires[wi].diaMm ?? 2 * rw;
    const ratio = maxSpan / dia;
    const diaFlag: 0 | 1 | 2 = dia < DIA_DANGER_MM ? 2 : dia < DIA_WARN_MM ? 1 : 0;
    const spanFlag: 0 | 1 | 2 = ratio > SPAN_DANGER_RATIO ? 2 : ratio > SPAN_WARN_RATIO ? 1 : 0;
    let level = Math.max(diaFlag > 0 ? diaFlag - 1 : 0, spanFlag) as 0 | 1 | 2; // çap tek başına 1 kademe
    if (supportS.length === 0) level = 2; // hiç teması olmayan parça = havada (yerçekimi kanunu)
    worstRatio = Math.max(worstRatio, ratio);
    verdicts.push({ level, maxSpanMm: maxSpan, ratio, diaFlag, supports: supportS.length });
  });
  return { verdicts, worstRatio };
}
