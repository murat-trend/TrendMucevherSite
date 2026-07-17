// KİLİT MOTORU — TİP ÜRETİCİLERİ (kutu / toggle / kanca)
// Kurallar KILIT.md'den; keyfi sayı yok. Kutu gövde manifold CSG, dil/toggle/
// kanca primitif mesh + gerekirse union. Her parça AYRI STL parçasıdır
// (montaj gerçeği: dil sacdan bükülür — CAD referans modeli verilir).
import { KilitMesh, getWasm, meshToManifold, manifoldToMesh, manifoldHacim, isaretliHacim } from "./csg";
import { torusMesh, silindirMesh, acikTupMesh } from "./primitifler";
import { KUTU, TOGGLE, KANCA } from "./kurallar";

export type Parca = {
  ad: string;
  mesh: KilitMesh;
  hacimMm3: number;
  uretim: "dokum" | "sac";
  dosyaAd: string;
};

export type KilitUretim = {
  parcalar: Parca[];
  bilgi: [string, string][];   // rapor satırları
  uyarilar: string[];
};

/* eslint-disable @typescript-eslint/no-explicit-any -- manifold-3d WASM */

/** KUTU KİLİT (KK1-KK9): gövde DÖKÜM + dil SAC referans modeli. */
export async function kutuKilitUret(zincirGenislikMm: number): Promise<KilitUretim> {
  const w = zincirGenislikMm;
  const wasm = await getWasm();
  const { Manifold } = wasm;

  // ---- ölçüler (KK1-KK7)
  const L = KUTU.boyFn(w);
  const t = KUTU.duvarMm(w);
  const sac = KUTU.dilSacMm(w);
  const katli = 2 * sac;
  const giris = katli + KUTU.girisPayYukMm;         // KK5
  const icH = KUTU.icYukseklikOran * katli;          // KK3
  const H = icH + 2 * t;
  const icEn = w - 2 * t;
  const dilEn = icEn - KUTU.dilEnPayMm;              // KK7
  const icDerinlik = L - 2 * t;
  const dilBoy = icDerinlik;                          // KK7
  const olcek = w / 10;                               // KK9 buton ölçeği
  const butonEn = KUTU.buton10.enMm * olcek;
  const butonBoy = KUTU.buton10.boyMm * olcek;
  const butonH = KUTU.buton10.hMm * olcek;
  const pencereBoy = butonBoy + KUTU.butonStrokMm;    // KK4
  const pencereEn = butonEn + 0.2;

  // ---- gövde CSG (x: boy [−L/2 ön, +L/2 arka], y: en, z: yükseklik)
  let govde: any = Manifold.cube([L, w, H], true);
  // iç boşluk
  {
    const ic = Manifold.cube([icDerinlik, icEn, icH], true);
    const g2 = govde.subtract(ic);
    govde.delete(); ic.delete();
    govde = g2;
  }
  // ön giriş yuvası (KK5): ön duvarı dil kesitinde deler, iç tabana hizalı
  {
    const zTaban = -icH / 2 + giris / 2; // yuva iç tabandan başlar
    const yuva = Manifold.cube([t + 0.4, dilEn + KUTU.girisPayEnMm, giris], true)
      .translate([-L / 2 + t / 2, 0, zTaban]);
    const g2 = govde.subtract(yuva);
    govde.delete(); yuva.delete();
    govde = g2;
  }
  // üst buton penceresi (KK4): arka kenarı DİK kilit yüzeyi, arka iç duvara yakın
  {
    const pencereArkaX = L / 2 - t - 0.3;
    const pencere = Manifold.cube([pencereBoy, pencereEn, t + 0.4], true)
      .translate([pencereArkaX - pencereBoy / 2, 0, H / 2 - t / 2]);
    const g2 = govde.subtract(pencere);
    govde.delete(); pencere.delete();
    govde = g2;
  }
  // arka bağlantı halkası (zincir son baklası): torus, arka yüze gömülü
  {
    const telH = Math.max(0.8, t + 0.3);
    const Rc = (KUTU.halkaDelikMm + telH) / 2;
    const halka = meshToManifold(wasm, torusMesh(Rc, telH / 2, [L / 2 + Rc - 0.5, 0, 0], "y"));
    const g2 = govde.add(halka);
    govde.delete(); halka.delete();
    govde = g2;
  }
  const govdeHacim = manifoldHacim(govde);
  const govdeMesh = manifoldToMesh(govde);
  govde.delete();

  // ---- dil (SAC referans): taban + eğik V yaprağı + buton + arka halka
  const vAcik = KUTU.vSerbestOran * giris;            // KK8 serbest açıklık
  const yaprakBoy = dilBoy * 0.85;
  const aci = Math.asin(Math.min(0.6, (vAcik - sac) / yaprakBoy));
  let dil: any = Manifold.cube([dilBoy, dilEn, sac], true);
  {
    // V yaprağı: arkadan (katlama) öne doğru yükselir
    const yaprak = Manifold.cube([yaprakBoy, dilEn, sac], true)
      .rotate([0, -(aci * 180) / Math.PI, 0])
      .translate([-(dilBoy - yaprakBoy) / 2 + 0, 0, sac / 2 + (yaprakBoy / 2) * Math.sin(aci)]);
    const d2 = dil.add(yaprak);
    dil.delete(); yaprak.delete();
    dil = d2;
  }
  {
    // buton (KK9): yaprağın ön ucunda, üste taşar
    const bx = -dilBoy / 2 + butonBoy / 2 + 0.2;
    const bz = sac + yaprakBoy * Math.sin(aci);
    const buton = Manifold.cube([butonBoy, butonEn, butonH], true)
      .translate([bx, 0, bz]);
    const d2 = dil.add(buton);
    dil.delete(); buton.delete();
    dil = d2;
  }
  {
    // arka bağlantı halkası
    const rT = Math.max(0.5, sac);
    const Rc = (KUTU.halkaDelikMm + 2 * rT) / 2;
    const halka = meshToManifold(wasm, torusMesh(Rc, rT, [dilBoy / 2 + Rc - 0.4, 0, 0], "y"));
    const d2 = dil.add(halka);
    dil.delete(); halka.delete();
    dil = d2;
  }
  const dilHacim = manifoldHacim(dil);
  const dilMesh = manifoldToMesh(dil);
  dil.delete();
  // önizleme yerleşimi: dil kutunun solunda ayrı durur (montaj parçası)
  for (let i = 0; i < dilMesh.positions.length; i += 3) {
    dilMesh.positions[i] -= L + 6;
  }

  const sekiz = w >= 10 ? 2 : w >= 6 ? 1 : 0; // KK11
  return {
    parcalar: [
      { ad: "Kutu gövde", mesh: govdeMesh, hacimMm3: govdeHacim, uretim: "dokum", dosyaAd: "kutu-govde" },
      { ad: "Dil (V-yay)", mesh: dilMesh, hacimMm3: dilHacim, uretim: "sac", dosyaAd: "dil-sac-referans" },
    ],
    bilgi: [
      ["Kutu (B×E×Y)", `${L.toFixed(1)} × ${w.toFixed(1)} × ${H.toFixed(2)} mm`],
      ["Duvar / dil sacı (KK2/KK6)", `${t.toFixed(2)} / ${sac.toFixed(2)} mm`],
      ["Giriş yuvası (KK5)", `${(dilEn + KUTU.girisPayEnMm).toFixed(2)} × ${giris.toFixed(2)} mm`],
      ["Buton penceresi (KK4)", `${pencereBoy.toFixed(2)} × ${pencereEn.toFixed(2)} mm — arka kenar DİK`],
      ["V serbest açıklık (KK8)", `${vAcik.toFixed(2)} mm (${KUTU.vSerbestOran}× giriş) [KALİBRE]`],
      ["Sekiz emniyeti (KK11)", sekiz === 0 ? "gerekmez" : `${sekiz} adet (hazır 10-12.5 mm)`],
    ],
    uyarilar: [
      "Dil DÖKÜLMEZ — sert hadde sacdan bükülür, lehimsiz (lazer/punta) monte edilir (tavlama yayı öldürür). STL yalnız referans/mastar.",
      "Klik sesi kalite kriteridir (KK10) — ilk sac prototipte V açıklığı kalibre edilir.",
    ],
  };
}

/** TOGGLE (TG1-TG4): halka + bar — tamamı döküm. */
export async function toggleUret(icCapMm: number, zincirTelMm: number, barOran: number): Promise<KilitUretim> {
  const wasm = await getWasm();
  const halkaTel = Math.max(TOGGLE.halkaTelMinMm, zincirTelMm);
  const barTel = Math.max(TOGGLE.barTelMinMm, halkaTel * TOGGLE.barTelOran);
  const barBoy = barOran * icCapMm;                   // TG1
  const Rc = (icCapMm + halkaTel) / 2;

  // halka + bağlantı kulağı (küçük torus, dış kenara gömülü)
  const kulakR = Math.max(1.2, halkaTel * 0.9);
  let halka: any = meshToManifold(wasm, torusMesh(Rc, halkaTel / 2));
  {
    const kulak = meshToManifold(wasm, torusMesh(kulakR, Math.max(0.5, halkaTel * 0.35), [Rc + halkaTel / 2 + kulakR - 0.4, 0, 0], "x"));
    const h2 = halka.add(kulak);
    halka.delete(); kulak.delete();
    halka = h2;
  }
  const halkaHacim = manifoldHacim(halka);
  const halkaMesh = manifoldToMesh(halka);
  halka.delete();

  // bar + orta kulak (bar y-ekseni boyunca; kulak ortada dik)
  let bar: any = meshToManifold(wasm, silindirMesh(barTel / 2, barBoy, "y"));
  {
    const kulak = meshToManifold(wasm, torusMesh(kulakR, Math.max(0.5, barTel * 0.3), [0, 0, barTel / 2 + kulakR - 0.4], "x"));
    const b2 = bar.add(kulak);
    bar.delete(); kulak.delete();
    bar = b2;
  }
  const barHacim = manifoldHacim(bar);
  const barMesh = manifoldToMesh(bar);
  bar.delete();
  // önizleme yerleşimi: bar halkanın sağında
  for (let i = 0; i < barMesh.positions.length; i += 3) barMesh.positions[i] += Rc + barBoy / 2 + 6;

  return {
    parcalar: [
      { ad: "Halka", mesh: halkaMesh, hacimMm3: halkaHacim, uretim: "dokum", dosyaAd: "toggle-halka" },
      { ad: "Bar (T)", mesh: barMesh, hacimMm3: barHacim, uretim: "dokum", dosyaAd: "toggle-bar" },
    ],
    bilgi: [
      ["Halka iç çapı", `${icCapMm.toFixed(1)} mm · tel Ø ${halkaTel.toFixed(2)}`],
      ["Bar (TG1)", `${barBoy.toFixed(1)} mm = ${barOran.toFixed(1)} × iç çap · tel Ø ${barTel.toFixed(2)}`],
      ["Üretim (TG4)", "tamamı döküm — yay yok"],
    ],
    uyarilar: [
      barOran < 2.2 ? "TG1: bar oranı 2.2 altında — güvenlik payı düşük (2.2-2.5 önerilir)." : "",
      "TG3: gevşek bileklikte riskli — ağır kolyede uygun (yerçekimi barı dik tutar).",
    ].filter(Boolean),
  };
}

/** KANCA (KN1-KN3): S kancası — döküm (gerilimli kullanım). */
export async function kancaUret(zincirTelMm: number, karsiHalkaTelMm: number): Promise<KilitUretim> {
  const tel = Math.max(KANCA.telMinMm, zincirTelMm * KANCA.telOran);
  const rIc = KANCA.icYaricapOran * tel;             // KN2
  const R = rIc + tel / 2;                            // omurga yarıçapı
  const agiz = karsiHalkaTelMm + KANCA.agizPayMm;     // KN2
  // ağız açısı: açık bırakılan yayın kirişi = ağız açıklığı
  const agizAci = 2 * Math.asin(Math.min(0.9, agiz / (2 * R)));

  // S omurgası: üst çemberin alt noktası = alt çemberin üst noktası = orijin.
  // ZIT dolaşım şart (aynı yön "3" üretir — 2026-07-17 görsel dersi):
  // üst yay CW (180°−ağız → −90°, açık uç solda), alt yay CCW (90° → 390°,
  // açık uç sağda — neredeyse kapalı, zincir tarafı).
  const yol: [number, number][] = [];
  const n1 = 48, n2 = 56;
  const ustBas = Math.PI - agizAci;
  for (let i = 0; i <= n1; i++) {
    const a = ustBas + (i / n1) * (-Math.PI / 2 - ustBas);
    yol.push([R * Math.cos(a), R + R * Math.sin(a)]);
  }
  for (let i = 1; i <= n2; i++) {
    const a = Math.PI / 2 + (i / n2) * (Math.PI * (300 / 180));
    yol.push([R * Math.cos(a), -R + R * Math.sin(a)]);
  }
  const mesh = acikTupMesh(yol, tel / 2);
  const hacim = Math.abs(isaretliHacim(mesh));
  return {
    parcalar: [
      { ad: "Kanca (S)", mesh, hacimMm3: hacim, uretim: "dokum", dosyaAd: "kanca-s" },
    ],
    bilgi: [
      ["Tel (KN2)", `Ø ${tel.toFixed(2)} mm (zincir teli × ${KANCA.telOran})`],
      ["İç yarıçap (KN2)", `${rIc.toFixed(2)} mm`],
      ["Ağız açıklığı (KN2)", `${agiz.toFixed(2)} mm (karşı halka + ${KANCA.agizPayMm}) [KALİBRE]`],
    ],
    uyarilar: [
      "KN1: kanca GERİLİM altında çalışır — ağır parçada tek başına emniyetsiz.",
      "KN3: dökümden sonra çekiçle sertleştir; gerilimli kancada hadde tel tercih.",
    ],
  };
}
