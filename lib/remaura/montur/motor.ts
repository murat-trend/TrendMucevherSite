// MONTÜR MOTORU — GEOMETRİ (reçete → mesh; MONTUR.md kuralları)
// Gövde = şank ∪ kafa − taş yuvası (tek döküm parçası). Taş STL'e girmez
// (MT1) — önizleme + yuva referansı. Eksenler: parmak ekseni z, taş +y üstte.
import { MonturMesh, getWasm, meshToManifold, manifoldToMesh, manifoldHacim, isaretliHacim } from "./csg";
import { MonturRecete, turet, TAS_ORAN } from "./recete";
import { tasMesh } from "./tas";

const TOL_MM = 0.02;

export type MonturUretim = {
  govde: MonturMesh;        // döküm parçası
  tas: MonturMesh;          // önizleme (ayrı malzeme)
  hacimMm3: number;
  denetimler: [string, string][];
  olculer: [string, string][];
};

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM */

/** Şank süpürmesi: çember omurga (XY düzlemi, üst +y), kesit taper'lı. */
function sankMesh(r: MonturRecete, icCapMm: number): MonturMesh {
  const t = r.sank.kalinlikMm;
  const w = r.sank.genislikMm;
  const Rc = icCapMm / 2 + t / 2;

  // kesit noktaları (u: radyal, v: eksenel/parmak yönü z)
  const sec: [number, number][] = [];
  if (r.sank.kesit === "yarimYuvarlak") {
    // MS2: iç düz, dış yarım elips
    const nE = 16;
    for (let i = 0; i <= nE; i++) {
      const a = (i / nE) * Math.PI; // 0 → π
      sec.push([-t / 2 + t * Math.sin(a), (w / 2) * Math.cos(a)]);
    }
    const nF = 6;
    for (let i = 1; i < nF; i++) sec.push([-t / 2, -w / 2 + (i / nF) * w]);
  } else {
    // dikdörtgen (yuvarlak köşe rc = 0.25·t)
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
    const fi = (i / N) * 2 * Math.PI; // 0 = üst (+y)
    // MS3 taper: üstte genişlik büyür, cos² geçiş (kavisli omuz)
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

/** Reçeteden montür üret. */
export async function monturUret(r: MonturRecete): Promise<MonturUretim> {
  const w = await getWasm();
  const { Manifold } = w;
  const tr = turet(r);
  const D = r.tas.capMm;
  const denetimler: [string, string][] = [];

  // ---- taş konumu (MK4): culet, şank dış üstünden 0.5 yukarıda
  const ySankDis = tr.icCapMm / 2 + r.sank.kalinlikMm;
  const yCulet = ySankDis + 0.5;
  const yGirdleAlt = yCulet + tr.pavyonMm;
  const yGirdleUst = yGirdleAlt + tr.girdleMm;
  const yTabla = yGirdleUst + tr.tacMm;

  // ---- gövde: şank
  let govde: any = meshToManifold(w, sankMesh(r, tr.icCapMm));

  if (r.kafa.tip === "tirnak") {
    const dp = tr.tirnakCapMm;
    const rYer = D / 2 + 0.25 * dp;            // MK3: içe binme 0.25·dp
    const yTaban = ySankDis - 1.2;              // şanka gömülü taban
    const yUc = yGirdleUst + 0.5 * tr.tacMm;    // S8: crown yarısı
    const n = r.kafa.tirnakSayisi;
    const of = n === 4 ? Math.PI / 4 : 0;       // 4'lü omuzlara oturur
    for (let i = 0; i < n; i++) {
      const a = of + (i / n) * 2 * Math.PI;
      const px = rYer * Math.cos(a), pz = rYer * Math.sin(a);
      const boy = yUc - yTaban;
      const p = Manifold.cylinder(boy, dp / 2, dp / 2, 24, true)
        .rotate([90, 0, 0])
        .translate([px, yTaban + boy / 2, pz]);
      const uc = Manifold.sphere(dp / 2, 24).translate([px, yUc, pz]);
      let g2 = govde.add(p); govde.delete(); p.delete(); govde = g2;
      g2 = govde.add(uc); govde.delete(); uc.delete(); govde = g2;
    }
    // MK5: galeri raili — kendi torusumuz yerine manifold döner süpürme:
    // ince silindir halkası (tüp) ≈ torus: revolve yok → 24 segmentli poligon
    // torusu meshle kur (basit): burada silindirik bant kullanıyoruz
    const railTel = 0.8 * dp;
    const yRail = yGirdleAlt - 0.8;
    const railDis = Manifold.cylinder(railTel, rYer + railTel / 2, rYer + railTel / 2, 48, true);
    const railIc = Manifold.cylinder(railTel + 0.2, rYer - railTel / 2, rYer - railTel / 2, 48, true);
    let rail = railDis.subtract(railIc);
    railDis.delete(); railIc.delete();
    const rail2 = rail.rotate([90, 0, 0]).translate([0, yRail, 0]);
    rail.delete(); rail = rail2;
    {
      const g2 = govde.add(rail); govde.delete(); rail.delete(); govde = g2;
    }
    // MK6: seat — %98 girdle silindiri + pavyon konisi negatifi
    const seatSil = Manifold.cylinder(tr.girdleMm + 0.3, (0.98 * D) / 2, (0.98 * D) / 2, 48, true)
      .rotate([90, 0, 0]).translate([0, (yGirdleAlt + yGirdleUst) / 2, 0]);
    const koni = Manifold.cylinder(tr.pavyonMm, 0.05, (0.98 * D) / 2, 48, true)
      .rotate([-90, 0, 0]).translate([0, (yCulet + yGirdleAlt) / 2, 0]);
    let g2 = govde.subtract(seatSil); govde.delete(); seatSil.delete(); govde = g2;
    g2 = govde.subtract(koni); govde.delete(); koni.delete(); govde = g2;
    denetimler.push(["Tırnak (MK2/S7)", `Ø ${dp.toFixed(2)} mm × ${n} ${dp < 0.6 ? "△ 0.6 altı — döküm riskli" : "✓"}`]);
    denetimler.push(["Seat (MK6/S2)", "girdle %98 sıkı geçme · binme 0.25×tırnak (S9 sınırında) ✓"]);
  } else {
    // ---- bezel (MB1-MB3)
    const duvar = r.kafa.bezelDuvarMm;
    const disCap = 0.98 * D + 2 * duvar;
    const yTaban = ySankDis - 0.8;              // şanka gömülü etek
    const yUst = yGirdleUst + 0.4;              // MB2 sıvama payı
    const boy = yUst - yTaban;
    let bezel: any = Manifold.cylinder(boy, disCap / 2, disCap / 2, 64, true)
      .rotate([90, 0, 0]).translate([0, yTaban + boy / 2, 0]);
    // üst oturma: %98 girdle çapı, girdle altından üste
    const oturma = Manifold.cylinder(yUst - yGirdleAlt + 0.1, (0.98 * D) / 2, (0.98 * D) / 2, 48, true)
      .rotate([90, 0, 0]).translate([0, (yGirdleAlt + yUst) / 2 + 0.05, 0]);
    // pavyon boşluğu + azure (S12 %60)
    const koni = Manifold.cylinder(tr.pavyonMm, 0.05, (0.98 * D) / 2, 48, true)
      .rotate([-90, 0, 0]).translate([0, (yCulet + yGirdleAlt) / 2, 0]);
    const azure = Manifold.cylinder(boy + 2, (0.6 * D) / 2, (0.6 * D) / 2, 48, true)
      .rotate([90, 0, 0]).translate([0, yTaban + boy / 2, 0]);
    for (const kes of [oturma, koni, azure]) {
      const b2 = bezel.subtract(kes);
      bezel.delete(); kes.delete();
      bezel = b2;
    }
    const g2 = govde.add(bezel); govde.delete(); bezel.delete(); govde = g2;
    denetimler.push(["Bezel duvarı (MB1)", `${duvar.toFixed(2)} mm ${duvar < 0.7 ? "△ öneri 0.7" : "✓"}`]);
    denetimler.push(["Azure (MB3/S12)", `Ø ${(0.6 * D).toFixed(2)} mm ışık deliği ✓`]);
  }

  const hacim = manifoldHacim(govde);
  const govdeMesh = manifoldToMesh(govde);
  govde.delete();

  // ---- taş önizleme: suyolu tası z-aşağı üretir → +y üste döndür + taşı
  const tRaw = tasMesh(D, 24);
  const tasM: MonturMesh = { positions: Float64Array.from(tRaw.positions), indices: Uint32Array.from(tRaw.indices) };
  for (let i = 0; i < tasM.positions.length; i += 3) {
    const x = tasM.positions[i], y = tasM.positions[i + 1], z = tasM.positions[i + 2];
    // (x,y,z) tabla z=0, gövde −z → döndür: y_new = z + yTabla
    tasM.positions[i] = x;
    tasM.positions[i + 1] = z + yTabla;
    tasM.positions[i + 2] = y;
  }

  denetimler.push(["Culet boşluğu (MK4/S10)", "0.50 mm ✓ (kuruluş gereği)"]);
  const olculer: [string, string][] = [
    ["Yüzük ölçüsü (MR1)", `EU ${r.olcu.euSize} · iç çap ${tr.icCapMm.toFixed(2)} mm`],
    ["Taş (T1/T2)", `Ø ${D.toFixed(2)} mm ≈ ${tr.ct.toFixed(2)} ct`],
    ["Şank (MS1)", `${r.sank.genislikMm.toFixed(1)} × ${r.sank.kalinlikMm.toFixed(1)} mm · ${r.sank.kesit === "yarimYuvarlak" ? "yarım yuvarlak" : "dikdörtgen"} · taper ${r.sank.taperOran.toFixed(2)}×`],
    ["Tabla yüksekliği", `${(yTabla - ySankDis).toFixed(1)} mm (şank üstünden)`],
  ];
  return { govde: govdeMesh, tas: tasM, hacimMm3: hacim, denetimler, olculer };
}

export { TAS_ORAN };
