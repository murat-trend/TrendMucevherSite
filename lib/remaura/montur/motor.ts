// MONTÜR MOTORU — GEOMETRİ v2 (reçete → mesh; MONTUR.md + BILGI.md/JEKB)
// Gövde = şank ∪ kafa − taş yuvası. Peg bağlantısında kafa AYRI parçadır
// (gerçek peg-head pratiği). Taş STL'e girmez (MT1). Eksen: parmak z, taş +y.
//
// Kesim-genel yaklaşım: taşın GİRDLE KONTURU (daire/elips/kare) tek fonksiyondan
// gelir; seat negatifi, bezel ve tırnak yerleşimi bu konturdan türer — böylece
// her kesim aynı kural motorundan geçer (JEKB taş galerisi).
import { MonturMesh, getWasm, meshToManifold, manifoldToMesh, manifoldHacim, isaretliHacim } from "./csg";
import { MonturRecete, turet, TAS_ORAN } from "./recete";
import { tasMesh } from "./tas";

const TOL_MM = 0.02;

export type MonturParca = { ad: string; mesh: MonturMesh; hacimMm3: number };

export type MonturUretim = {
  parcalar: MonturParca[];   // omuz: [gövde]; peg: [şank, kafa]
  tas: MonturMesh;
  hacimMm3: number;          // toplam metal
  denetimler: [string, string][];
  olculer: [string, string][];
};

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM */

/** Girdle konturu (xz düzleminde poligon) — ölçek 1.0 = girdle. */
function girdleKontur(r: MonturRecete, olcek: number): [number, number][] {
  const D = r.tas.capMm * olcek;
  if (r.tas.kesim === "prenses") {
    const h = D / 2;
    return [[h, h], [-h, h], [-h, -h], [h, -h]];
  }
  const boy = r.tas.kesim === "oval" ? (r.tas.capMm * r.tas.ovalOran * olcek) : D;
  const pts: [number, number][] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    pts.push([(boy / 2) * Math.cos(a), (D / 2) * Math.sin(a)]);
  }
  return pts;
}

/** Kontur offset (dışa doğru büyütme — bezel duvarı vb. için basit ölçekleme). */
function konturOfset(pts: [number, number][], ofsetMm: number): [number, number][] {
  return pts.map(([x, z]) => {
    const L = Math.hypot(x, z) || 1;
    return [x + (x / L) * ofsetMm, z + (z / L) * ofsetMm];
  });
}

/** Tırnak yerleşimi: kontur üzerinde açılar (JEKB: prenses köşelere). */
function prongAcilari(r: MonturRecete): number[] {
  const n = r.kafa.tirnakSayisi;
  if (r.tas.kesim === "prenses") return [45, 135, 225, 315].map((d) => (d * Math.PI) / 180);
  const of = n === 4 ? Math.PI / 4 : Math.PI / 6;
  return Array.from({ length: n }, (_, i) => of + (i / n) * 2 * Math.PI);
}

/** Konturun a açısındaki yarıçapı (x-z izdüşümü). */
function konturYaricap(r: MonturRecete, a: number): number {
  const D = r.tas.capMm;
  if (r.tas.kesim === "prenses") {
    // kare köşegen yönlerinde (45°'ler) köşe yarıçapı
    return (D / 2) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
  }
  const bx = r.tas.kesim === "oval" ? (D * r.tas.ovalOran) / 2 : D / 2;
  const bz = D / 2;
  return (bx * bz) / Math.hypot(bz * Math.cos(a), bx * Math.sin(a));
}

/** Şank süpürmesi (v1 ile aynı — MS1-MS3). */
function sankMesh(r: MonturRecete, icCapMm: number): MonturMesh {
  const t = r.sank.kalinlikMm;
  const w = r.sank.genislikMm;
  const Rc = icCapMm / 2 + t / 2;
  const sec: [number, number][] = [];
  if (r.sank.kesit === "yarimYuvarlak") {
    const nE = 16;
    for (let i = 0; i <= nE; i++) {
      const a = (i / nE) * Math.PI;
      sec.push([-t / 2 + t * Math.sin(a), (w / 2) * Math.cos(a)]);
    }
    const nF = 6;
    for (let i = 1; i < nF; i++) sec.push([-t / 2, -w / 2 + (i / nF) * w]);
  } else {
    const rc = 0.25 * t;
    const hu = t / 2 - rc, hv = w / 2 - rc;
    const nK = 5;
    const kose: [number, number, number][] = [
      [hu, hv, 0], [-hu, hv, Math.PI / 2], [-hu, -hv, Math.PI], [hu, -hv, -Math.PI / 2],
    ];
    for (const [cu, cv, a0] of kose) {
      for (let q = 0; q <= nK; q++) {
        const a = a0 + (q / nK) * (Math.PI / 2);
        sec.push([cu + rc * Math.cos(a), cv + rc * Math.sin(a)]);
      }
    }
  }
  const nC = sec.length;
  const N = Math.max(96, Math.ceil((2 * Math.PI * Rc) / Math.sqrt(8 * Rc * TOL_MM)));
  const positions = new Float64Array(N * nC * 3);
  for (let i = 0; i < N; i++) {
    const fi = (i / N) * 2 * Math.PI;
    const s = 1 + (r.sank.taperOran - 1) * Math.pow(Math.max(0, Math.cos(fi)), 2);
    const sx = Math.sin(fi), cy = Math.cos(fi);
    for (let j = 0; j < nC; j++) {
      const [u, v] = sec[j];
      const rad = Rc + u;
      const k = (i * nC + j) * 3;
      positions[k] = rad * sx;
      positions[k + 1] = rad * cy;
      positions[k + 2] = v * s;
    }
  }
  const indices = new Uint32Array(N * nC * 6);
  let wI = 0;
  for (let i = 0; i < N; i++) {
    const ip = (i + 1) % N;
    for (let j = 0; j < nC; j++) {
      const jp = (j + 1) % nC;
      const a = i * nC + j, b = ip * nC + j, c = ip * nC + jp, e = i * nC + jp;
      indices[wI++] = a; indices[wI++] = b; indices[wI++] = c;
      indices[wI++] = a; indices[wI++] = c; indices[wI++] = e;
    }
  }
  const mesh: MonturMesh = { positions, indices };
  if (isaretliHacim(mesh) < 0) {
    for (let tt = 0; tt < indices.length; tt += 3) {
      const tmp = indices[tt + 1]; indices[tt + 1] = indices[tt + 2]; indices[tt + 2] = tmp;
    }
  }
  return mesh;
}

/** Prenses taş mesh'i (kare parlak yaklaşık profili — BILGI.md [PRATİK]). */
function prensesMesh(kenarMm: number): MonturMesh {
  const D = kenarMm;
  const tabla = 0.70 * D;
  const tac = TAS_ORAN.tac * D;
  const girdle = TAS_ORAN.girdle * D;
  const derinlik = 0.72 * D;
  const pavyon = derinlik - tac - girdle;
  // katman kareleri (yarı-kenar, y): tabla → girdle üst → girdle alt → culet
  const kat: [number, number][] = [
    [tabla / 2, 0], [D / 2, -tac], [D / 2, -tac - girdle],
  ];
  const positions = new Float64Array((kat.length * 4 + 2) * 3);
  positions.set([0, 0, 0], 0); // tabla merkezi (kutup)
  kat.forEach(([h, y], i) => {
    const köşeler: [number, number][] = [[h, h], [-h, h], [-h, -h], [h, -h]];
    köşeler.forEach(([x, z], j) => {
      const k = (1 + i * 4 + j) * 3;
      positions[k] = x; positions[k + 1] = y; positions[k + 2] = z;
    });
  });
  const guney = kat.length * 4 + 1;
  positions.set([0, -tac - girdle - pavyon, 0], guney * 3);
  const tris: number[] = [];
  const ring = (i: number, j: number) => 1 + i * 4 + (j % 4);
  for (let j = 0; j < 4; j++) tris.push(0, ring(0, j + 1), ring(0, j));
  for (let i = 0; i + 1 < kat.length; i++) {
    for (let j = 0; j < 4; j++) {
      tris.push(ring(i, j), ring(i, j + 1), ring(i + 1, j + 1));
      tris.push(ring(i, j), ring(i + 1, j + 1), ring(i + 1, j));
    }
  }
  for (let j = 0; j < 4; j++) tris.push(guney, ring(kat.length - 1, j), ring(kat.length - 1, j + 1));
  const mesh: MonturMesh = { positions: Float64Array.from(positions), indices: new Uint32Array(tris) };
  if (isaretliHacim(mesh) < 0) {
    const ix = mesh.indices;
    for (let t = 0; t < ix.length; t += 3) { const tmp = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = tmp; }
  }
  return mesh;
}

/** Reçeteden montür üret (v2). */
export async function monturUret(r: MonturRecete): Promise<MonturUretim> {
  const w = await getWasm();
  const { Manifold } = w;
  const tr = turet(r);
  const D = r.tas.capMm;
  const denetimler: [string, string][] = [];
  const peg = r.kafa.tip === "tirnak" && r.kafa.baglanti === "peg";

  // taş yükseklik zinciri (MK4)
  const ySankDis = tr.icCapMm / 2 + r.sank.kalinlikMm;
  const yCulet = ySankDis + 0.5;
  const yGirdleAlt = yCulet + tr.pavyonMm;
  const yGirdleUst = yGirdleAlt + tr.girdleMm;
  const yTabla = yGirdleUst + tr.tacMm;

  // ---- seat negatifi (kesim-genel; MK6/S2)
  const seatNegatif = (): any => {
    const kontur = girdleKontur(r, 0.98);
    const bant = Manifold.extrude([kontur], tr.girdleMm + 0.3)
      .rotate([90, 0, 0]).translate([0, yGirdleUst + 0.15, 0]);
    // extrude +z yönünde büyür; rotate 90 x → −y... yönü translate ile düzelt:
    // (pratik: bandı girdle üstünden aşağı sarkıt)
    const koni = Manifold.extrude([kontur], tr.pavyonMm, 24, 0, [0.02, 0.02])
      .rotate([90, 0, 0]).translate([0, yGirdleAlt, 0]);
    const s = bant.add(koni);
    bant.delete(); koni.delete();
    return s;
  };

  // ---- şank
  let sank: any = meshToManifold(w, sankMesh(r, tr.icCapMm));

  // ---- kafa
  let kafa: any = null;
  const kafaEkle = (m: any) => {
    if (!kafa) { kafa = m; return; }
    const k2 = kafa.add(m);
    kafa.delete(); m.delete();
    kafa = k2;
  };

  if (r.kafa.tip === "tirnak") {
    const dp = tr.tirnakCapMm;
    const acilar = prongAcilari(r);
    const tulip = r.kafa.basketStil === "tulip";
    const yUc = yGirdleUst + 0.5 * tr.tacMm;                 // S8
    const yTaban = peg ? yGirdleAlt - 0.8 - 1.0 : ySankDis - 1.2;
    // prong ekseni yarıçapları (üst: kontur + binme; taban: tulip'te dar)
    const rUst = (a: number) => konturYaricap(r, a) + 0.25 * dp;   // MK3
    const rTabanF = (a: number) => (tulip ? 0.55 * rUst(a) : rUst(a)); // JEKB tulip
    for (const a of acilar) {
      const boy = yUc - yTaban;
      const rU = rUst(a), rT = rTabanF(a);
      const tiltRad = Math.atan2(rU - rT, boy);       // JEKB tulip eğimi
      const govdeP = Manifold.cylinder(boy / Math.cos(tiltRad), dp / 2, dp / 2, 20, true)
        .rotate([90, 0, 0])                            // eksen +y
        .rotate([0, 0, -(tiltRad * 180) / Math.PI])    // radyale (+x) eğ
        .translate([(rU + rT) / 2, (yUc + yTaban) / 2, 0])
        .rotate([0, -(a * 180) / Math.PI, 0]);         // kendi açısına çevir
      const uc = Manifold.sphere(dp / 2, 20)
        .translate([rU, yUc, 0])
        .rotate([0, -(a * 180) / Math.PI, 0]);
      kafaEkle(govdeP);
      kafaEkle(uc);
    }
    // ---- rail'ler (JEKB: tek / gizli / çift / yok)
    const railTel = 0.8 * dp;                                  // MK5
    const railYap = (y: number, disR: (a: number) => number, ad: string) => {
      // kontur-uyumlu halka: dış ve iç poligon extrude farkı
      const n = 48;
      const dis: [number, number][] = [], ic: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI;
        const rd = disR(a);
        dis.push([rd * Math.cos(a), rd * Math.sin(a)]);
        ic.push([(rd - railTel) * Math.cos(a), (rd - railTel) * Math.sin(a)]);
      }
      const dH = Manifold.extrude([dis], railTel).rotate([90, 0, 0]).translate([0, y + railTel / 2, 0]);
      const iH = Manifold.extrude([ic], railTel + 0.2).rotate([90, 0, 0]).translate([0, y + railTel / 2 + 0.1, 0]);
      const halka = dH.subtract(iH);
      dH.delete(); iH.delete();
      kafaEkle(halka);
      void ad;
    };
    const rProngAt = (a: number, y: number) => {
      const boy = yUc - yTaban;
      const t01 = Math.min(1, Math.max(0, (y - yTaban) / boy));
      return rTabanF(a) + (rUst(a) - rTabanF(a)) * t01;
    };
    if (r.kafa.rail === "tek" || r.kafa.rail === "cift") {
      const y1 = yGirdleAlt - 0.8;
      railYap(y1, (a) => rProngAt(a, y1) + railTel * 0.35, "üst");
      if (r.kafa.rail === "cift") {
        const aralik = Math.max(1.0, tr.pavyonMm * 0.5);
        const y2 = y1 - aralik;
        railYap(y2, (a) => rProngAt(a, y2) + railTel * 0.35, "alt"); // paralel, eşit aralık
        denetimler.push(["Çift rail (JEKB)", `aralık ${aralik.toFixed(2)} mm — paralel ✓`]);
      }
    } else if (r.kafa.rail === "gizli") {
      const y1 = yGirdleAlt - 0.5;
      // gizli (JEKB): KONTUR-UYUMLU — her açıda dış yarıçap girdle
      // izdüşümünün 0.05 içinde kalır (üstten görünmezlik KURULUŞ GEREĞİ)
      // ve prong iç yüzüne 0.15 gömme hedeflenir (bağlantı).
      const gizliDis = (a: number) =>
        Math.min(rProngAt(a, y1) - dp / 2 + 0.15 + railTel, konturYaricap(r, a) - 0.05);
      railYap(y1, gizliDis, "gizli");
      // bağlantı denetimi: prong açılarında rail, prong iç yüzüne değiyor mu?
      const kopuk = acilar.some((a) => gizliDis(a) < rProngAt(a, y1) - dp / 2 + 0.05);
      denetimler.push(["Gizli rail (JEKB)", kopuk
        ? "△ bazı tırnaklara bağlantı zayıf — taş/tırnak oranını büyüt"
        : "✓ üstten görünmez (kontur-uyumlu) · tüm tırnaklara bağlı"]);
    }
    // ---- peg (JEKB Peg Head)
    if (peg) {
      const pegCap = 1.2, pegBoy = 2.5;
      const pegSil = Manifold.cylinder(pegBoy + 1.0, pegCap / 2, pegCap / 2, 20, true)
        .rotate([90, 0, 0]).translate([0, yTaban - pegBoy / 2 + 0.5, 0]);
      kafaEkle(pegSil);
      // şank üstüne delik
      const delik = Manifold.cylinder(pegBoy + 0.6, (pegCap + 0.1) / 2, (pegCap + 0.1) / 2, 20, true)
        .rotate([90, 0, 0]).translate([0, ySankDis - pegBoy / 2 + 0.2, 0]);
      const s2 = sank.subtract(delik);
      sank.delete(); delik.delete();
      sank = s2;
      denetimler.push(["Peg (JEKB)", `Ø ${pegCap.toFixed(1)} × ${pegBoy.toFixed(1)} mm — kafa AYRI parça, lehimle monte`]);
    }
    // seat kes (kafadan)
    {
      const neg = seatNegatif();
      const k2 = kafa.subtract(neg);
      kafa.delete(); neg.delete();
      kafa = k2;
    }
    denetimler.push(["Tırnak (MK2/S7)", `Ø ${dp.toFixed(2)} mm × ${acilar.length} ${dp < 0.6 ? "△ 0.6 altı" : "✓"}${r.tas.kesim === "prenses" ? " · köşelerde (JEKB)" : ""}`]);
    denetimler.push(["Bearing (JEKB/S2/S9)", "girdle %98 · binme 0.25×tırnak ✓"]);
  } else {
    // ---- bezel (kesim-genel kontur)
    const duvar = r.kafa.bezelDuvarMm;
    const yTaban = ySankDis - 0.8;
    const yUst = yGirdleUst + 0.4;                       // MB2
    const boy = yUst - yTaban;
    const disK = konturOfset(girdleKontur(r, 0.98), duvar);
    let bezel: any = Manifold.extrude([disK], boy).rotate([90, 0, 0]).translate([0, yUst, 0]);
    const oturma = Manifold.extrude([girdleKontur(r, 0.98)], yUst - yGirdleAlt + 0.1)
      .rotate([90, 0, 0]).translate([0, yUst + 0.05, 0]);
    const azure = Manifold.extrude([girdleKontur(r, 0.6)], boy + 2)
      .rotate([90, 0, 0]).translate([0, yUst + 1, 0]);
    const koni = Manifold.extrude([girdleKontur(r, 0.98)], tr.pavyonMm, 24, 0, [0.02, 0.02])
      .rotate([90, 0, 0]).translate([0, yGirdleAlt, 0]);
    for (const kes of [oturma, azure, koni]) {
      const b2 = bezel.subtract(kes);
      bezel.delete(); kes.delete();
      bezel = b2;
    }
    kafaEkle(bezel);
    denetimler.push(["Bezel duvarı (MB1)", `${duvar.toFixed(2)} mm ${duvar < 0.7 ? "△ öneri 0.7" : "✓"}`]);
    denetimler.push(["Azure (MB3/S12)", "kontur %60 ışık deliği ✓"]);
  }

  // ---- parça birleştirme
  const parcalar: MonturParca[] = [];
  if (peg) {
    const kafaHacim = manifoldHacim(kafa);
    parcalar.push({ ad: "Kafa (peg)", mesh: manifoldToMesh(kafa), hacimMm3: kafaHacim });
    kafa.delete();
    const sankHacim = manifoldHacim(sank);
    parcalar.push({ ad: "Şank", mesh: manifoldToMesh(sank), hacimMm3: sankHacim });
    sank.delete();
  } else {
    const g = sank.add(kafa);
    sank.delete(); kafa.delete();
    const hacim = manifoldHacim(g);
    parcalar.push({ ad: "Gövde", mesh: manifoldToMesh(g), hacimMm3: hacim });
    g.delete();
  }
  const toplam = parcalar.reduce((s, p) => s + p.hacimMm3, 0);

  // ---- taş önizleme (kesime göre)
  let tasM: MonturMesh;
  if (r.tas.kesim === "prenses") {
    tasM = prensesMesh(D);
    for (let i = 0; i < tasM.positions.length; i += 3) tasM.positions[i + 1] += yTabla;
  } else {
    const tRaw = tasMesh(D, 24);
    tasM = { positions: Float64Array.from(tRaw.positions), indices: Uint32Array.from(tRaw.indices) };
    const sx = r.tas.kesim === "oval" ? r.tas.ovalOran : 1;
    for (let i = 0; i < tasM.positions.length; i += 3) {
      const x = tasM.positions[i], y = tasM.positions[i + 1], z = tasM.positions[i + 2];
      tasM.positions[i] = x * sx;
      tasM.positions[i + 1] = z + yTabla;
      tasM.positions[i + 2] = y;
    }
  }

  denetimler.push(["Culet boşluğu (MK4/S10)", "0.50 mm ✓"]);
  const olculer: [string, string][] = [
    ["Yüzük ölçüsü (MR1)", `EU ${r.olcu.euSize} · iç çap ${tr.icCapMm.toFixed(2)} mm`],
    ["Taş", `${r.tas.kesim === "prenses" ? "prenses " + D.toFixed(2) + " mm kenar" : r.tas.kesim === "oval" ? `oval ${D.toFixed(2)}×${tr.boyMm.toFixed(2)} mm` : `yuvarlak Ø ${D.toFixed(2)} mm`} ≈ ${tr.ct.toFixed(2)} ct`],
    ["Şank (MS1)", `${r.sank.genislikMm.toFixed(1)} × ${r.sank.kalinlikMm.toFixed(1)} mm · taper ${r.sank.taperOran.toFixed(2)}×`],
    ["Kafa", r.kafa.tip === "bezel" ? "bezel" : `${r.kafa.basketStil === "tulip" ? "tulip" : "düz"} basket · rail: ${r.kafa.rail} · bağlantı: ${r.kafa.baglanti}`],
  ];
  return { parcalar, tas: tasM, hacimMm3: toplam, denetimler, olculer };
}

export { TAS_ORAN };
