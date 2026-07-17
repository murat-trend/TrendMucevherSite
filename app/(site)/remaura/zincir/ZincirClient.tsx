"use client";

// ZİNCİR — parametrik zincir üretim aracı. SADECE süper-admin.
// Görsel dil: suyolu kalıbı (koyu #0A0A0C + altın #D4AF37, sol tip menüsü,
// 3D viewer, sağ kontroller, üretim raporu). Motor: lib/remaura/zincir
// (ZINCIR.md kural kütüphanesi — her sayı kural kimliği taşır, keyfi sayı yok).
// Ajur delme, ajur sayfasının desen kütüphanesini yeniden kullanır.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZincirViewer, ViewMesh, ViewerMod } from "./ZincirViewer";
import {
  MADENLER, MadenId, TIPLER, ZincirTipId, TRAS, AJUR, OLCU, telSinir, SAPORT,
} from "@/lib/remaura/zincir/kurallar";
import {
  geoTuret, dizilim, montajDuz, montajDaire, rapor, ZincirRapor, Yer,
  gramTahmin, pappusHacimMm3, daireBuk, saportlar, SaportKonum,
} from "@/lib/remaura/zincir/zincir";
import type { BaklaMesh, TelKesit, YuzeyDoku } from "@/lib/remaura/zincir/bakla";
import { isaretliHacim } from "@/lib/remaura/zincir/bakla";
import { baklaUret, autoAjur, dizilimDenetim, KesisimSonuc, BaklaUretim, orguUret } from "@/lib/remaura/zincir/islem";
import { orguOlc } from "@/lib/remaura/zincir/orgu";
import { buildYilan, buildBaliksirti, boruKesitAlanMm2 } from "@/lib/remaura/zincir/boru";
import { toBinarySTL } from "@/lib/remaura/zincir/stl";
import { PATTERNS } from "@/app/(site)/remaura/ajur/lib/patterns";

// K5 katalog: sol menü grupları — hepsi aktif; örgü/boru "masif yorum"
// rozetiyle gelir (gerçek örme makine işidir, K2)
const KATALOG: { baslik: string; rozet?: string; tipler: ZincirTipId[] }[] = [
  { baslik: "Baklalı", tipler: ["kuba", "gurmet", "figaro", "forse", "doc", "venedik"] },
  { baslik: "Örme", rozet: "masif yorum", tipler: ["halat", "spiga"] },
  { baslik: "Boru", rozet: "dokulu gövde", tipler: ["yilan", "baliksirti"] },
];

const AJUR_DESENLERI = PATTERNS.filter((p) => p.tile);

const ALTIN_AYAR: { id: MadenId; ad: string }[] = [
  { id: "au8", ad: "8K" }, { id: "au14", ad: "14K" },
  { id: "au18", ad: "18K" }, { id: "au22", ad: "22K" },
];

const UZUNLUK_PRESET = [
  { ad: "Bileklik K 18", mm: 180 }, { ad: "Bileklik E 21", mm: 210 },
  { ad: "Kolye 45", mm: 450 }, { ad: "Kolye 50", mm: 500 },
  { ad: "Kolye 55", mm: 550 }, { ad: "Kolye 60", mm: 600 },
];

type UretimSonuc =
  | {
      yapi: "bakla";
      kisa: BaklaUretim;
      uzun: BaklaUretim | null;
      // S3 atlamalı doku: B-varyant baklalar (tek indeksler)
      kisaB: BaklaUretim | null;
      uzunB: BaklaUretim | null;
      raporData: ZincirRapor;
    }
  | {
      // K5 örgü/boru: tek gövde — bakla/dizilim/denetim kavramları yok
      yapi: "govde";
      mesh: BaklaMesh;
      gram: number;
      gCm: number;
      uzunlukMm: number;
      bilgi: [string, string][]; // rapor satırları (ad, değer)
    };

export function ZincirClient() {
  const [tip, setTip] = useState<ZincirTipId>("kuba");
  const [genislikMm, setGenislikMm] = useState<number>(OLCU.genislikVarsayilanMm);
  // B8: null = kural varsayılanı (dolu hal); sayı = kullanıcı seçimi (hedef gramaj)
  const [telSecimMm, setTelSecimMm] = useState<number | null>(null);
  const [uzunlukMm, setUzunlukMm] = useState<number>(210);
  const [metalTur, setMetalTur] = useState<"altin" | "gumus" | "platin">("gumus");
  const [ayar, setAyar] = useState<MadenId>("au14");
  const [trasOrani, setTrasOrani] = useState<number>(TIPLER.kuba.trasVarsayilan);
  // S1-S4 stil katmanı (2026-07-16 foto referansı: faset/çekiç/kare/atlamalı/çift metal)
  const [kesit, setKesit] = useState<TelKesit>("yuvarlak");
  const [doku, setDoku] = useState<YuzeyDoku>("parlak");
  const [dokuDesen, setDokuDesen] = useState<"hepsi" | "atlamali">("hepsi");
  const [ciftMetal, setCiftMetal] = useState(false);
  const [maden2, setMaden2] = useState<MadenId>("ag925");
  // SP: saport (Murat 2026-07-17 — yandan döküm tiji / alttan reçine desteği)
  const [saportKonum, setSaportKonum] = useState<"yok" | SaportKonum>("yok");
  const [saportBoyMm, setSaportBoyMm] = useState<number>(SAPORT.boyVarsayilanMm);
  const [saportHer, setSaportHer] = useState(false);
  const [ajurAcik, setAjurAcik] = useState(false);
  const [ajurDesen, setAjurDesen] = useState<string>("petek");
  const [ajurDoz, setAjurDoz] = useState(0.7);
  const [busy, setBusy] = useState(false);
  const [gorunum, setGorunum] = useState<"yerde" | "kolyede">("yerde");
  // varsayılan MAT: form okunur (Murat 2026-07-17: "parladığı için görünmüyor")
  const [viewerMod, setViewerMod] = useState<ViewerMod>("mat");
  const [sonuc, setSonuc] = useState<UretimSonuc | null>(null);
  const [denetim, setDenetim] = useState<KesisimSonuc | "calisiyor" | null>(null);
  const [meshes, setMeshes] = useState<ViewMesh[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const uretimSayac = useRef(0);
  // B8 anlık gram tahmini düzeltmesi: kesinHacim/analitik — TİP BAŞINA tutulur
  // (Murat 2026-07-17: "her model kendi kuralları içinde çalışır" — Küba
  // katsayısı balıksırtı tahminine karışmaz). Başlangıçlar ölçülmüş bantlardan.
  const kFaktorlar = useRef<Partial<Record<ZincirTipId, number>>>({});
  const kFaktorOku = (t: ZincirTipId): number =>
    kFaktorlar.current[t] ?? (TIPLER[t].yapi === "bakla" ? 0.95 : TIPLER[t].yapi === "orgu" ? 0.89 : 1);

  const maden: MadenId = metalTur === "gumus" ? "ag925" : metalTur === "platin" ? "pt950" : ayar;
  const kart = TIPLER[tip];
  const sinir = useMemo(() => telSinir(tip, genislikMm), [tip, genislikMm]);
  const telCapMm = useMemo(
    () => Math.min(Math.max(telSecimMm ?? sinir.varsayilanMm, sinir.minMm), sinir.maxMm),
    [telSecimMm, sinir],
  );
  const tahmin = useMemo(() => {
    const rho = MADENLER[maden].yogunlukGmm3;
    // K5: yapıya göre analitik tahmin (slider oynarken CSG kurulmaz)
    if (kart.yapi === "orgu") {
      const o = orguOlc(tip as "halat" | "spiga", genislikMm, uzunlukMm);
      const r = o.damarCapMm / 2;
      const gram = o.damarSayisi * Math.PI * r * r * o.damarBoyMm * kFaktorOku(tip) * rho;
      return { gram, gCm: gram / (uzunlukMm / 10) };
    }
    if (kart.yapi === "boru") {
      const gram = boruKesitAlanMm2(tip as "yilan" | "baliksirti", genislikMm) *
        uzunlukMm * kFaktorOku(tip) * rho;
      return { gram, gCm: gram / (uzunlukMm / 10) };
    }
    const t = gramTahmin({ tip, genislikMm, uzunlukMm, telCapMm, maden, kFaktor: kFaktorOku(tip) });
    if (ciftMetal) {
      // S4: baklaların ~yarısı 2. metal — ortalama yoğunluk düzeltmesi
      const oran = (MADENLER[maden].yogunlukGmm3 + MADENLER[maden2].yogunlukGmm3) /
        (2 * MADENLER[maden].yogunlukGmm3);
      return { ...t, gram: t.gram * oran, gCm: t.gCm * oran };
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kFaktorlar sonuc ile tazelenir
  }, [tip, kart, genislikMm, uzunlukMm, telCapMm, maden, maden2, ciftMetal, sonuc]);

  const bildir = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // SP: kural-türevli saport çapı (D11: ≈0.9×tel, taban 0.8)
  const saportCapMm = useMemo(
    () => Math.min(SAPORT.capTavanMm, Math.max(SAPORT.capTabanMm, SAPORT.capOran * telCapMm)),
    [telCapMm],
  );

  const kurMeshler = useCallback((s: UretimSonuc, g: "yerde" | "kolyede") => {
    if (s.yapi === "govde") {
      // K5: tek gövde — kolyede görünümü gerçek BÜKME'dir (masif yorum)
      setMeshes([g === "kolyede" ? daireBuk(s.mesh, s.uzunlukMm) : s.mesh]);
      return;
    }
    const diz = dizilim(s.raporData.tip, genislikMm, uzunlukMm, s.raporData.telCapMm);
    const set = {
      kisa: s.kisa.mesh,
      kisaAyna: s.kisa.mesh, // curb ailesi özdeş baklalar — ayna kullanılmıyor
      uzun: s.uzun?.mesh,
      uzunAyna: s.uzun?.mesh,
      kisaB: s.kisaB?.mesh,
      uzunB: s.uzunB?.mesh,
    };
    // S3/S4: tek indeksli baklalar B-varyant (atlamalı doku ve/veya 2. metal)
    const yerler: Yer[] = diz.yerler.map((y, i) => ({ ...y, varyant: i % 2 === 1 }));
    const montaj = (yl: Yer[]) =>
      g === "kolyede" ? montajDaire(set, yl, diz.gercekUzunlukMm) : montajDuz(set, yl);
    const sonMeshler: ViewMesh[] = ciftMetal
      ? [
          { ...montaj(yerler.filter((_, i) => i % 2 === 0)), maden },
          { ...montaj(yerler.filter((_, i) => i % 2 === 1)), maden: maden2 },
        ]
      : [montaj(yerler)];
    // SP: saportlar yalnız YERDE (düz) diziliminde gösterilir/eklenir
    if (saportKonum !== "yok" && g === "yerde") {
      sonMeshler.push(saportlar({
        yerler, konum: saportKonum, capMm: saportCapMm, boyMm: saportBoyMm,
        disEnMm: s.raporData.baklaDisEnMm, kalinlikMm: s.raporData.kalinlikMm,
        herBakla: saportHer, gommeMm: SAPORT.gommeMm,
      }));
    }
    setMeshes(sonMeshler);
  }, [genislikMm, uzunlukMm, ciftMetal, maden, maden2, saportKonum, saportCapMm, saportBoyMm, saportHer]);

  const olustur = useCallback(async () => {
    // busy kilidi YOK: tip değişiminde otomatik yeniden üretim üst üste
    // gelebilir — bayat sonuçları uretimSayac eler (son tıklanan kazanır)
    setBusy(true);
    const benimSiram = ++uretimSayac.current;
    try {
      const k = TIPLER[tip];
      // ---- K5: örgü/boru gövde akışı (bakla/dizilim/denetim yok)
      if (k.yapi !== "bakla") {
        let mesh: BaklaMesh, hacim: number, bilgi: [string, string][];
        if (k.yapi === "orgu") {
          const u = await orguUret(tip as "halat" | "spiga", genislikMm, uzunlukMm);
          if (benimSiram !== uretimSayac.current) return;
          mesh = u.mesh; hacim = u.hacimMm3;
          const rD = u.bilgi.damarCapMm / 2;
          const analitik = u.bilgi.damarSayisi * Math.PI * rD * rD * u.bilgi.damarBoyMm;
          kFaktorlar.current[tip] = hacim / analitik;
          bilgi = [
            ["Damar", `${u.bilgi.damarSayisi} × Ø ${u.bilgi.damarCapMm.toFixed(2)} mm`],
            ["Sarım adımı", `${u.bilgi.pitchMm.toFixed(1)} mm`],
            ["Yapı", "tek gövde masif örgü yorumu (K5) — gömme %12"],
          ];
        } else {
          const u = tip === "yilan"
            ? buildYilan(genislikMm, uzunlukMm)
            : buildBaliksirti(genislikMm, uzunlukMm);
          if (benimSiram !== uretimSayac.current) return;
          mesh = u.mesh; hacim = isaretliHacim(u.mesh);
          kFaktorlar.current[tip] = hacim / (boruKesitAlanMm2(tip as "yilan" | "baliksirti", genislikMm) * uzunlukMm);
          bilgi = tip === "yilan"
            ? [["Et kalınlığı", "0.80 mm (C4)"],
               ["Yapı", "açık uçlu dokulu boru (K5) — uçlar döküm drenajı (A5)"]]
            : [["Şerit kalınlığı", `${u.bilgi.kalinlikMm.toFixed(2)} mm`],
               ["Yapı", "masif çevronlu şerit (K5) — esnek değildir"]];
        }
        const gram = hacim * MADENLER[maden].yogunlukGmm3;
        const s: UretimSonuc = {
          yapi: "govde", mesh, gram, gCm: gram / (uzunlukMm / 10), uzunlukMm, bilgi,
        };
        setSonuc(s);
        kurMeshler(s, gorunum);
        setDenetim(null);
        bildir("Model oluşturuldu");
        return;
      }

      const { kisa, uzun } = geoTuret(tip, genislikMm, telCapMm);
      const ajur = ajurAcik && k.ajurUygun ? autoAjur(kisa, ajurDesen, ajurDoz) : null;
      const ajurUzun = ajurAcik && k.ajurUygun && uzun ? autoAjur(uzun, ajurDesen, ajurDoz) : null;
      const tras = k.bukumDeg ? trasOrani : 0;
      // S3: atlamalı desende A-bakla parlak, B-bakla dokulu; "hepsi"nde A dokulu
      const atlamali = dokuDesen === "atlamali" && doku !== "parlak";
      const dokuA: YuzeyDoku = atlamali ? "parlak" : doku;
      const uretKisa = (dk: YuzeyDoku) =>
        baklaUret({ ...kisa, kesit, doku: dk, yatisDeg: 0, trasOrani: tras, ajur });
      const uretUzun = (dk: YuzeyDoku) =>
        uzun
          ? baklaUret({ ...uzun, kesit, doku: dk, yatisDeg: 0, trasOrani: tras, ajur: ajurUzun })
          : Promise.resolve(null);
      const bKisa = await uretKisa(dokuA);
      const bUzun = await uretUzun(dokuA);
      const bKisaB = atlamali ? await uretKisa(doku) : null;
      const bUzunB = atlamali ? await uretUzun(doku) : null;
      if (benimSiram !== uretimSayac.current) return; // eski üretim, at
      kFaktorlar.current[tip] = bKisa.hacimMm3 / pappusHacimMm3(kisa); // B8 tahmin düzeltmesi
      const r = rapor({
        tip, genislikMm, uzunlukMm, telCapMm, maden,
        hacimKisaMm3: bKisa.hacimMm3, hacimDoluKisaMm3: bKisa.hacimDoluMm3,
        hacimUzunMm3: bUzun?.hacimMm3, hacimDoluUzunMm3: bUzun?.hacimDoluMm3,
        kalinlikMm: bKisa.kalinlikMm,
        delikSayisi: bKisa.delikSayisi,
        delikAlanOrani: bKisa.delikAlanOrani,
      });
      // S4 çift metal + S3 varyant hacmi: gramı parite bazında yeniden hesapla
      if (ciftMetal || atlamali) {
        const diz = dizilim(tip, genislikMm, uzunlukMm, telCapMm);
        const vol = (turu: string, b: boolean) =>
          turu === "uzun"
            ? (b ? bUzunB?.hacimMm3 : bUzun?.hacimMm3) ?? bKisa.hacimMm3
            : (b ? bKisaB?.hacimMm3 : null) ?? bKisa.hacimMm3;
        let gram = 0;
        diz.yerler.forEach((y, i) => {
          const b = i % 2 === 1;
          gram += vol(y.turu, b) * MADENLER[ciftMetal && b ? maden2 : maden].yogunlukGmm3;
        });
        r.gram = gram;
        r.gCm = gram / (r.gercekUzunlukMm / 10);
      }
      const s: UretimSonuc = { yapi: "bakla", kisa: bKisa, uzun: bUzun, kisaB: bKisaB, uzunB: bUzunB, raporData: r };
      setSonuc(s);
      kurMeshler(s, gorunum);
      bildir("Model oluşturuldu");

      // D4 + C2 denetimi arka planda (7 CSG kurulumu — birkaç sn sürebilir)
      setDenetim("calisiyor");
      dizilimDenetim({
        geo: kisa, yatisDeg: 0, trasOrani: k.bukumDeg ? trasOrani : 0,
        adimMm: r.adimOrtMm, komsuRotXDeg: k.bukumDeg ? 0 : 90,
      }).then((d) => {
        if (benimSiram === uretimSayac.current) setDenetim(d);
      }).catch(() => {
        if (benimSiram === uretimSayac.current) setDenetim(null);
      });
    } catch {
      bildir("Model üretilemedi — parametreleri kontrol et");
    } finally {
      setBusy(false);
    }
  }, [tip, genislikMm, uzunlukMm, telCapMm, maden, maden2, ciftMetal, trasOrani, kesit, doku, dokuDesen, ajurAcik, ajurDesen, ajurDoz, gorunum, kurMeshler, bildir]);

  const gorunumDegistir = (g: "yerde" | "kolyede") => {
    setGorunum(g);
    if (sonuc) kurMeshler(sonuc, g);
  };

  const tipSec = (id: ZincirTipId) => {
    if (id === tip) return;
    setTip(id);
    setTrasOrani(TIPLER[id].trasVarsayilan);
    setTelSecimMm(null); // yeni tip → kural varsayılanı tel (B8)
    setKesit(TIPLER[id].kesitVarsayilan ?? "yuvarlak"); // venedik = kare (K4)
    if (!TIPLER[id].ajurUygun) setAjurAcik(false);
    // TİP İZOLASYONU (Murat 2026-07-17): eski tipin modeli/raporu ekranda
    // KALMAZ — anında temizlenir, yeni tip otomatik üretilir (aşağıdaki effect)
    setSonuc(null);
    setDenetim(null);
    setMeshes([]);
  };

  // tip değişince otomatik yeniden üret (eski model yeni tipin altında durmasın)
  const ilkTipRef = useRef(true);
  useEffect(() => {
    if (ilkTipRef.current) { ilkTipRef.current = false; return; }
    void olustur();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız tip değişimi
  }, [tip]);

  // ilk açılışta bir kez üret
  useEffect(() => {
    void olustur();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız ilk render
  }, []);

  // SP: saport ayarı değişince görünümü tazele (yeniden üretim gerekmez)
  useEffect(() => {
    if (sonuc) kurMeshler(sonuc, gorunum);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız saport ayarları
  }, [saportKonum, saportBoyMm, saportHer]);

  const indir = (buf: ArrayBuffer, ad: string) => {
    const url = URL.createObjectURL(new Blob([buf], { type: "model/stl" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = ad;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stlTekBakla = () => {
    if (!sonuc || sonuc.yapi !== "bakla") return;
    const parcalar = [sonuc.kisa.mesh];
    if (saportKonum !== "yok") {
      parcalar.push(saportlar({
        yerler: [{ turu: "kisa", ayna: false, dxMm: 0, rotXDeg: 0 }],
        konum: saportKonum, capMm: saportCapMm, boyMm: saportBoyMm,
        disEnMm: sonuc.raporData.baklaDisEnMm, kalinlikMm: sonuc.raporData.kalinlikMm,
        herBakla: true, gommeMm: SAPORT.gommeMm,
      }));
    }
    indir(toBinarySTL(parcalar, "Remaura Zincir — tek bakla"),
      `zincir-${tip}-bakla-${genislikMm}mm.stl`);
    bildir("Tek bakla STL indirildi (üretim birimi)");
  };
  // KOMPLE: iç içe geçmiş zincir — print-in-place + tek döküm adayı (C1);
  // C2/C3 uyarıları rapor panelinde
  const stlKomple = () => {
    if (!sonuc) return;
    if (sonuc.yapi === "govde") {
      // K5: görünüme göre iner — kolyede = gerçek bükülmüş gövde (masif yorum)
      const m = gorunum === "kolyede" ? daireBuk(sonuc.mesh, sonuc.uzunlukMm) : sonuc.mesh;
      indir(toBinarySTL([m], "Remaura Zincir — gövde"),
        `zincir-${tip}-${(sonuc.uzunlukMm / 10).toFixed(0)}cm-${gorunum}.stl`);
      bildir(`Gövde STL indirildi (${gorunum === "kolyede" ? "çembere bükülmüş" : "düz"} — K5 masif yorum)`);
      return;
    }
    const diz = dizilim(tip, genislikMm, uzunlukMm, sonuc.raporData.telCapMm);
    const set = {
      kisa: sonuc.kisa.mesh, kisaAyna: sonuc.kisa.mesh,
      uzun: sonuc.uzun?.mesh, uzunAyna: sonuc.uzun?.mesh,
      kisaB: sonuc.kisaB?.mesh, uzunB: sonuc.uzunB?.mesh,
    };
    const yerler: Yer[] = diz.yerler.map((y, i) => ({ ...y, varyant: i % 2 === 1 }));
    const cmAd = (sonuc.raporData.gercekUzunlukMm / 10).toFixed(0);
    // SP: saport çubukları (varsa) dosyaya gömülü iner
    const rods = saportKonum !== "yok"
      ? saportlar({
          yerler, konum: saportKonum, capMm: saportCapMm, boyMm: saportBoyMm,
          disEnMm: sonuc.raporData.baklaDisEnMm, kalinlikMm: sonuc.raporData.kalinlikMm,
          herBakla: saportHer, gommeMm: SAPORT.gommeMm,
        })
      : null;
    if (ciftMetal) {
      // S4: metal başına ayrı STL — dökümde iki metal ayrı dökülüp geçirilir
      const aParca = [montajDuz(set, yerler.filter((_, i) => i % 2 === 0))];
      if (rods) aParca.push(rods);
      indir(toBinarySTL(aParca, "Remaura Zincir — metal A"),
        `zincir-${tip}-${cmAd}cm-${maden}.stl`);
      indir(toBinarySTL([montajDuz(set, yerler.filter((_, i) => i % 2 === 1))], "Remaura Zincir — metal B"),
        `zincir-${tip}-${cmAd}cm-${maden2}.stl`);
      bildir("İki STL indirildi (metal başına) — montaj: baklalar geçirilip lehimlenir (C6)");
      return;
    }
    const parcalar = [montajDuz(set, yerler)];
    if (rods) parcalar.push(rods);
    indir(toBinarySTL(parcalar, "Remaura Zincir — komple"),
      `zincir-${tip}-${cmAd}cm-${genislikMm}mm${rods ? "-saportlu" : ""}.stl`);
    bildir(`Komple STL indirildi: ${sonuc.raporData.n} bakla iç içe${rods ? " + saportlar" : ""} (C2 boşluk denetimine bak)`);
  };

  const ekranGoruntusu = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#zincir-viewer canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `zincir-${tip}-${genislikMm}mm-${Date.now()}.png`;
    a.click();
    bildir("Ekran görüntüsü indirildi");
  };

  const panel = "rounded-xl border border-[#2A2A35] bg-[#141418] p-4";
  const r = sonuc?.yapi === "bakla" ? sonuc.raporData : null;
  const govde = sonuc?.yapi === "govde" ? sonuc : null;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7]">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-[#2A2A35] px-5 py-3">
        <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium tracking-wide text-[#D4AF37]">
          ZİNCİR
        </span>
        <h1 className="font-display text-xl font-medium tracking-[-0.02em]">Zincir Stüdyosu</h1>
        <span className="ml-auto font-mono text-[11px] text-white/35">kural motoru: ZINCIR.md · süper-admin</span>
      </div>

      <div className="flex">
        {/* sol: tip menüsü */}
        <aside className="hidden w-64 shrink-0 flex-col gap-2 border-r border-[#2A2A35] bg-[#141418] p-4 lg:flex">
          <div className="mb-1">
            <h2 className="font-display text-base font-semibold text-[#D4AF37]">Model Kataloğu</h2>
            <div className="mt-1 h-0.5 w-10 bg-[#D4AF37]" />
          </div>
          {KATALOG.map((grup) => (
            <div key={grup.baslik} className="mb-1">
              <div className="mb-1.5 mt-2 flex items-baseline justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{grup.baslik}</span>
                {grup.rozet && (
                  <span className="rounded border border-[#2A2A35] px-1.5 py-0.5 text-[9px] text-white/30">{grup.rozet}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {grup.tipler.map((id) => {
                  const k = TIPLER[id];
                  const aktif = tip === id;
                  return (
                    <button
                      key={id}
                      onClick={() => tipSec(id)}
                      className={`flex h-12 flex-col justify-center rounded-xl border px-4 text-left transition-all ${
                        aktif
                          ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                          : "border-transparent text-[#F5F5F7] hover:bg-[#1C1C22]"
                      }`}
                    >
                      <span className="text-sm font-medium">{k.ad}</span>
                      <span className="truncate text-[10px] text-white/30">{k.aciklama}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="mt-auto text-[10px] leading-relaxed text-white/25">
            Örme/boru grupları MASİF döküm yorumudur — gerçek örme zincir
            makine işidir (ZINCIR.md K2/K5); bakla grubu birebir üretim modelidir.
          </p>
        </aside>

        {/* ana içerik */}
        <main className="min-w-0 flex-1 p-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <h2 className="font-display text-2xl font-semibold text-[#D4AF37]">{kart.ad}</h2>
              <div className="mt-1 h-0.5 w-20 bg-[#D4AF37]" />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* viewer */}
              <div id="zincir-viewer" className="relative min-h-[440px] overflow-hidden rounded-2xl border border-[#2A2A35] bg-[#101014] lg:col-span-7">
                <ZincirViewer meshes={meshes} maden={maden} fitKey={`${gorunum}-${tip}`} mod={viewerMod} />
                {busy && (
                  <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 font-mono text-[11px] text-[#D4AF37]">
                    üretiliyor…
                  </div>
                )}
                <div className="absolute right-3 top-3 flex gap-2">
                  {/* malzeme modu: MAT varsayılan — form okunur; Parlak = sunum */}
                  <div className="flex overflow-hidden rounded-lg border border-[#2A2A35] bg-black/50 font-mono text-[11px]">
                    {([["mat", "Mat"], ["metal", "Parlak"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => setViewerMod(id)}
                        className={`px-3 py-1.5 transition-colors ${
                          viewerMod === id ? "bg-[#D4AF37] font-semibold text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                  <div className="flex overflow-hidden rounded-lg border border-[#2A2A35] bg-black/50 font-mono text-[11px]">
                    {([["yerde", "Yerde"], ["kolyede", "Kolyede"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => gorunumDegistir(id)}
                        className={`px-3 py-1.5 transition-colors ${
                          gorunum === id ? "bg-[#D4AF37] font-semibold text-[#0A0A0C]" : "text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* kontroller */}
              <div className="flex flex-col gap-4 lg:col-span-5">
                {/* ölçüler */}
                <div className={panel}>
                  <h3 className="font-display text-lg font-semibold">
                    <span className="mr-1.5 text-[#D4AF37]">1 ·</span>Ölçüler
                  </h3>
                  <p className="mb-3 text-xs text-[#9CA3AF]">
                    {kart.yapi === "bakla"
                      ? "Genişlik dış görünümü, tel çapı metali belirler (B8) — teli incelterek hedef grama in"
                      : "Genişlik gövde çapını belirler — gram tahmini anlık güncellenir"}
                  </p>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Zincir genişliği (dış görünüm)</span>
                    <span className="font-mono text-[13px]">{genislikMm.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range" min={OLCU.genislikMinMm} max={OLCU.genislikMaxMm} step={0.5} value={genislikMm}
                    onChange={(e) => setGenislikMm(parseFloat(e.target.value))}
                    className="range-slider w-full"
                  />

                  {/* B8: bakla kalınlığı (tel çapı) — hedef gramaj kullanıcıda */}
                  {kart.yapi === "bakla" ? (
                    <>
                      <div className="mb-1.5 mt-4 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Bakla kalınlığı (tel çapı)</span>
                        <span className="font-mono text-[13px]">
                          Ø {telCapMm.toFixed(2)} mm
                          {telSecimMm !== null && (
                            <button
                              onClick={() => setTelSecimMm(null)}
                              className="ml-2 rounded border border-[#2A2A35] px-1.5 py-0.5 text-[10px] text-[#9CA3AF] hover:text-white"
                            >
                              varsayılana dön
                            </button>
                          )}
                        </span>
                      </div>
                      <input
                        type="range" min={sinir.minMm} max={sinir.maxMm} step={0.02} value={telCapMm}
                        onChange={(e) => setTelSecimMm(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-[10px] text-white/30">
                          ince ← {sinir.minMm.toFixed(2)} · dolu → {sinir.maxMm.toFixed(2)} mm
                          {telCapMm < 0.8 && " · △ 0.8 altı döküm riskli (D7)"}
                        </span>
                        <span className="font-mono text-[11px] text-[#D4AF37]">
                          ≈ {tahmin.gram.toFixed(1)} g · {tahmin.gCm.toFixed(2)} g/cm
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 flex items-baseline justify-between rounded-lg border border-[#2A2A35] bg-[#0A0A0C] px-3 py-2">
                      <span className="text-[11px] text-[#9CA3AF]">Anlık gram tahmini</span>
                      <span className="font-mono text-[12px] text-[#D4AF37]">
                        ≈ {tahmin.gram.toFixed(1)} g · {tahmin.gCm.toFixed(2)} g/cm
                      </span>
                    </div>
                  )}

                  <div className="mb-1.5 mt-4 flex items-baseline justify-between">
                    <span className="text-xs text-[#9CA3AF]">Uzunluk (kilit hariç)</span>
                    <span className="font-mono text-[13px]">{(uzunlukMm / 10).toFixed(1)} cm</span>
                  </div>
                  <input
                    type="range" min={OLCU.uzunlukMinMm} max={OLCU.uzunlukMaxMm} step={5} value={uzunlukMm}
                    onChange={(e) => setUzunlukMm(parseInt(e.target.value, 10))}
                    className="range-slider w-full"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {UZUNLUK_PRESET.map((p) => (
                      <button
                        key={p.mm}
                        onClick={() => setUzunlukMm(p.mm)}
                        className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${
                          uzunlukMm === p.mm
                            ? "border-[#D4AF37] text-[#D4AF37]"
                            : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {p.ad}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2 · stil & doku + işleme (traş/ajur) — yalnız baklalı tipler */}
                {kart.yapi === "bakla" && (
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">
                    <span className="mr-1.5 text-[#D4AF37]">2 ·</span>Stil & Doku
                  </h3>
                  {/* S1-S4: kesit / doku / desen / çift metal */}
                  <div className="mb-3 rounded-lg border border-[#2A2A35] bg-[#0A0A0C] p-3">
                    {kart.kesitVarsayilan ? (
                      // tip kimliği kesiti KİLİTLER (venedik = kare; K4) —
                      // başka tipin kuralı buraya sızmaz
                      <div className="mb-2 rounded-md border border-[#2A2A35] px-2 py-1.5 text-[11px] text-white/40">
                        Tel kesiti: <span className="text-[#D4AF37]">kare</span> — {kart.ad} kimliği (K4), değiştirilemez
                      </div>
                    ) : (
                      <div className="mb-2 grid grid-cols-2 gap-1.5">
                        {([["yuvarlak", "Yuvarlak tel"], ["kare", "Kare tel"]] as const).map(([id, ad]) => (
                          <button
                            key={id}
                            onClick={() => { setKesit(id); if (id === "kare" && doku === "faset") setDoku("parlak"); }}
                            className={`rounded-md border py-1.5 text-[11px] transition-colors ${
                              kesit === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                            }`}
                          >
                            {ad}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mb-2 grid grid-cols-3 gap-1.5">
                      {([["parlak", "Parlak"], ["cekic", "Çekiç (dövme)"], ["faset", "Faset"]] as const).map(([id, ad]) => {
                        const kapali = id === "faset" && kesit === "kare";
                        return (
                          <button
                            key={id}
                            disabled={kapali}
                            onClick={() => setDoku(id)}
                            className={`rounded-md border py-1.5 text-[11px] transition-colors ${
                              kapali ? "cursor-not-allowed border-[#2A2A35] text-white/15"
                                : doku === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                            }`}
                          >
                            {ad}
                          </button>
                        );
                      })}
                    </div>
                    {doku !== "parlak" && (
                      <div className="mb-2 grid grid-cols-2 gap-1.5">
                        {([["hepsi", "Tüm baklalar dokulu"], ["atlamali", "Bir atlamalı (parlak/dokulu)"]] as const).map(([id, ad]) => (
                          <button
                            key={id}
                            onClick={() => setDokuDesen(id)}
                            className={`rounded-md border py-1.5 text-[11px] transition-colors ${
                              dokuDesen === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                            }`}
                          >
                            {ad}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#9CA3AF]">İki metal (bir atlamalı)</span>
                      <button
                        onClick={() => setCiftMetal((v) => !v)}
                        className={`h-5 w-10 rounded-full border transition-colors ${
                          ciftMetal ? "border-[#D4AF37] bg-[#D4AF37]/30" : "border-[#2A2A35] bg-[#141418]"
                        }`}
                      >
                        <span className={`block h-3.5 w-3.5 rounded-full bg-[#D4AF37] transition-transform ${ciftMetal ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>
                    {ciftMetal && (
                      <>
                        <div className="mt-2 grid grid-cols-4 gap-1.5">
                          {([["au14", "14K Sarı"], ["au14r", "14K Roz"], ["ag925", "Gümüş"], ["pt950", "Platin"]] as const).map(([id, ad]) => (
                            <button
                              key={id}
                              onClick={() => setMaden2(id)}
                              className={`rounded-md border py-1.5 text-[10px] transition-colors ${
                                maden2 === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                              }`}
                            >
                              {ad}
                            </button>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">
                          Metal başına ayrı STL iner — üretimde iki grup ayrı dökülür,
                          baklalar geçirilip lehimlenir (C6).
                        </p>
                      </>
                    )}
                  </div>

                  {kart.bukumDeg !== 0 && (
                    <>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-xs text-[#9CA3AF]">Traş (diamond-cut, T1-T4)</span>
                        <span className="font-mono text-[13px]">%{(trasOrani * 100).toFixed(0)}</span>
                      </div>
                      <input
                        type="range" min={0} max={TRAS.maxOran} step={0.01} value={trasOrani}
                        onChange={(e) => setTrasOrani(parseFloat(e.target.value))}
                        className="range-slider w-full"
                      />
                    </>
                  )}

                  {kart.ajurUygun && (
                    <div className="mt-3 rounded-lg border border-[#2A2A35] bg-[#0A0A0C] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#F5F5F7]">Ajur hafifletme (A1-A4)</span>
                        <button
                          onClick={() => setAjurAcik((v) => !v)}
                          className={`h-6 w-11 rounded-full border transition-colors ${
                            ajurAcik ? "border-[#D4AF37] bg-[#D4AF37]/30" : "border-[#2A2A35] bg-[#141418]"
                          }`}
                        >
                          <span className={`block h-4 w-4 rounded-full bg-[#D4AF37] transition-transform ${ajurAcik ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      {ajurAcik && (
                        <>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {AJUR_DESENLERI.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => setAjurDesen(d.id)}
                                className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                                  ajurDesen === d.id
                                    ? "border-[#D4AF37] text-[#D4AF37]"
                                    : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                                }`}
                              >
                                {d.labelTr}
                              </button>
                            ))}
                          </div>
                          <div className="mb-1 mt-2 flex items-baseline justify-between">
                            <span className="text-[11px] text-[#9CA3AF]">Doz</span>
                            <span className="font-mono text-[12px]">%{(ajurDoz * 100).toFixed(0)}</span>
                          </div>
                          <input
                            type="range" min={0.3} max={1} step={0.05} value={ajurDoz}
                            onChange={(e) => setAjurDoz(parseFloat(e.target.value))}
                            className="range-slider w-full"
                          />
                          <p className="mt-1 text-[10px] leading-relaxed text-white/30">
                            Delikler yalnız düz yan bantlara açılır; uç kıvrımlar
                            (yük bölgesi) korunur (A1-A2). Duvar ≥ {AJUR.duvarMm} mm.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                )}

                {/* 3 · maden */}
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">
                    <span className="mr-1.5 text-[#D4AF37]">{kart.yapi === "bakla" ? "3" : "2"} ·</span>Maden
                  </h3>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {([["altin", "Altın"], ["gumus", "Gümüş 925"], ["platin", "Platin 950"]] as const).map(([id, ad]) => (
                      <button
                        key={id}
                        onClick={() => setMetalTur(id)}
                        className={`rounded-lg border py-2.5 text-xs font-medium transition-all ${
                          metalTur === id
                            ? "border-[#D4AF37] bg-[#1C1C22] text-[#D4AF37]"
                            : "border-[#2A2A35] bg-[#0A0A0C] text-[#9CA3AF] hover:text-white"
                        }`}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                  {metalTur === "altin" && (
                    <div className="flex gap-2">
                      {ALTIN_AYAR.map((k) => (
                        <button
                          key={k.id}
                          onClick={() => setAyar(k.id)}
                          className={`flex-1 rounded-lg border py-2 font-mono text-xs transition-all ${
                            ayar === k.id
                              ? "border-[#D4AF37] bg-[#D4AF37] font-semibold text-[#0A0A0C]"
                              : "border-[#2A2A35] bg-[#1C1C22] text-[#F5F5F7]"
                          }`}
                        >
                          {k.ad}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* SP: saport — yandan döküm tiji / alttan reçine desteği */}
                {kart.yapi === "bakla" && (
                  <div className={panel}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <h3 className="font-display text-base font-semibold">Saport</h3>
                      <span className="font-mono text-[11px] text-white/35">
                        Ø {saportCapMm.toFixed(2)} mm (D11: ≈0.9×tel)
                      </span>
                    </div>
                    <div className="mb-2 grid grid-cols-3 gap-1.5">
                      {([["yok", "Yok"], ["yandan", "Yandan (döküm)"], ["alttan", "Alttan (reçine)"]] as const).map(([id, ad]) => (
                        <button
                          key={id}
                          onClick={() => setSaportKonum(id)}
                          className={`rounded-md border py-1.5 text-[11px] transition-colors ${
                            saportKonum === id ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                          }`}
                        >
                          {ad}
                        </button>
                      ))}
                    </div>
                    {saportKonum !== "yok" && (
                      <>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-[11px] text-[#9CA3AF]">Saport boyu</span>
                          <span className="font-mono text-[12px]">{saportBoyMm.toFixed(1)} mm</span>
                        </div>
                        <input
                          type="range" min={SAPORT.boyMinMm} max={SAPORT.boyMaxMm} step={0.5} value={saportBoyMm}
                          onChange={(e) => setSaportBoyMm(parseFloat(e.target.value))}
                          className="range-slider w-full"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] text-[#9CA3AF]">Sıklık</span>
                          <div className="flex gap-1.5">
                            {([["atlamali", "Bir atlamalı"], ["hepsi", "Her bakla"]] as const).map(([id, ad]) => (
                              <button
                                key={id}
                                onClick={() => setSaportHer(id === "hepsi")}
                                className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                                  (id === "hepsi") === saportHer ? "border-[#D4AF37] text-[#D4AF37]" : "border-[#2A2A35] text-[#9CA3AF] hover:text-white"
                                }`}
                              >
                                {ad}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">
                          Çubuk baklaya {SAPORT.gommeMm} mm gömülür, STL&apos;e dahil iner;
                          gram raporuna katılmaz (tij dökümde kesilir). Dik dönen
                          baklalara (forse/doç/venedik tek indeksler) takılmaz.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* aksiyonlar */}
                <div className="flex gap-2">
                  <button
                    onClick={olustur}
                    disabled={busy}
                    className="h-12 flex-1 rounded-lg bg-[#D4AF37] text-sm font-semibold text-[#0A0A0C] transition-all hover:bg-[#F0D878] disabled:opacity-60"
                  >
                    {busy ? "Üretiliyor…" : "Model Oluştur"}
                  </button>
                  <button
                    onClick={ekranGoruntusu}
                    className="h-12 rounded-lg border border-[#2A2A35] bg-[#141418] px-4 text-sm text-[#9CA3AF] transition-colors hover:text-white"
                  >
                    Görüntü
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={stlTekBakla}
                    disabled={!sonuc || sonuc.yapi !== "bakla"}
                    className="h-11 flex-1 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[13px] font-medium text-[#D4AF37] transition-colors hover:bg-[#D4AF37]/20 disabled:opacity-40"
                  >
                    STL — Tek Bakla
                  </button>
                  <button
                    onClick={stlKomple}
                    disabled={!sonuc}
                    className="h-11 flex-1 rounded-lg border border-[#2A2A35] bg-[#141418] text-[13px] text-[#9CA3AF] transition-colors hover:text-white disabled:opacity-40"
                  >
                    STL — Komple (iç içe)
                  </button>
                </div>
              </div>
            </div>

            {/* üretim raporu — K5 gövde tipleri */}
            {govde && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Üretim Raporu</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    <Row k="Gövde çapı/eni" v={`${genislikMm.toFixed(1)} mm`} />
                    <Row k="Uzunluk" v={`${(govde.uzunlukMm / 10).toFixed(1)} cm (kilit hariç)`} />
                    <Row k="Maden" v={MADENLER[maden].ad} />
                    <Row k="Metal ağırlığı (model)" v={`${govde.gram.toFixed(1)} g · ${govde.gCm.toFixed(2)} g/cm`} vurgu />
                    {govde.bilgi.map(([bk, bv]) => <Row key={bk} k={bk} v={bv} />)}
                  </dl>
                </div>
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Üretim Notu (K5)</h3>
                  <p className="text-[11.5px] leading-relaxed text-white/50">
                    Bu tip MASİF döküm yorumudur: gerçek {kart.ad.toLowerCase()} zinciri
                    makine örgüsüdür ve esnektir (K2); buradaki gövde tek parça dökülür,
                    esnemez. Kolye/bileklik olarak kullanılacaksa <b>Kolyede</b> görünümüne
                    geçip STL&apos;i o halde indir — gövde çembere bükülmüş dökülür.
                    Döküm çekmesi ~%{(maden === "ag925" ? 2.0 : 1.5).toFixed(1)} ve polisaj
                    kaybı ayrıca düşünülmeli (C4-C5).
                  </p>
                </div>
              </div>
            )}

            {/* üretim raporu */}
            {r && (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold text-[#D4AF37]">Üretim Raporu</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    <Row k="Bakla sayısı" v={`${r.n} adet`} />
                    <Row k="Tel çapı" v={`Ø ${r.telCapMm.toFixed(2)} mm`} />
                    <Row k="Bakla (dış boy × en)" v={`${r.baklaDisBoyMm.toFixed(2)} × ${r.baklaDisEnMm.toFixed(2)} mm`} />
                    <Row k="Kalınlık (traş sonrası)" v={`${r.kalinlikMm.toFixed(2)} mm`} />
                    <Row k="Adım (ort.)" v={`${r.adimOrtMm.toFixed(2)} mm`} />
                    <Row k="Gerçekleşen uzunluk" v={`${(r.gercekUzunlukMm / 10).toFixed(1)} cm (kilit hariç)`} />
                    <Row k="Maden" v={MADENLER[r.maden].ad} />
                    <Row k="Metal ağırlığı (model)" v={`${r.gram.toFixed(1)} g · ${r.gCm.toFixed(2)} g/cm`} vurgu />
                    {r.hafifletmeYuzde > 0.05 && (
                      <Row k="Ajur kazancı" v={`−%${r.hafifletmeYuzde.toFixed(1)} (${r.delikSayisi} delik/bakla)`} vurgu />
                    )}
                  </dl>
                </div>
                <div className={panel}>
                  <h3 className="mb-3 font-display text-lg font-semibold">Kural Denetimi</h3>
                  <dl className="space-y-1.5 font-mono text-[12.5px]">
                    {denetim === "calisiyor" && <Row k="Kesişim denetimi (D4)" v="çalışıyor…" />}
                    {denetim && denetim !== "calisiyor" && (
                      <>
                        <Row k="Komşu çakışma (D4)" v={denetim.komsuCakismaMm3 < 1e-6 ? "0 ✓" : `${denetim.komsuCakismaMm3.toFixed(3)} mm³ ✗ İHLAL`} />
                        <Row k="2. komşu çakışma (D4)" v={denetim.ikinciCakismaMm3 < 1e-6 ? "0 ✓" : `${denetim.ikinciCakismaMm3.toFixed(3)} mm³ ✗ İHLAL`} />
                        <Row k="Boşluk ≥0.2 (C2 mutlak)" v={denetim.bosluk02 ? "✓" : "✗ baklalar kaynayabilir"} />
                        <Row k="Boşluk ≥0.3 (C2 önerilen)" v={denetim.bosluk03 ? "✓" : "— temaslı dizilim (uyarı)"} />
                      </>
                    )}
                    {r.delikAlanOrani > 0 && (
                      <Row
                        k="Delik alan oranı (A3)"
                        v={`%${(r.delikAlanOrani * 100).toFixed(0)} ${r.delikAlanOrani > 0.3 ? "✗ tavan aşıldı" : r.delikAlanOrani > 0.2 ? "△ E kaybı>%26" : "✓"}`}
                      />
                    )}
                    <Row k="Bükülme yarıçapı (D3)" v={Number.isFinite(r.bukulmeYaricapiMm) ? `≈ ${r.bukulmeYaricapiMm.toFixed(0)} mm` : "—"} />
                  </dl>
                  <p className="mt-3 text-[10.5px] leading-relaxed text-white/30">
                    Gram, CAD modelinin gerçek hacminden hesaplanır; döküm çekmesi
                    ~%{r.cekmePayiYuzde.toFixed(1)} ve polisaj kaybı ayrı düşünülmeli (C4-C5,
                    katsayı test dökümüyle kalibre — ZINCIR.md §9). Komple STL iç içe
                    üründür: üçüncü-parti döküm servisleri reddedebilir (C3) —
                    kendi dökümhane akışı veya tek bakla + montaj önerilir.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg border border-[#2A2A35] bg-[#1C1C22] px-6 py-3 text-sm font-medium text-emerald-400 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, vurgu }: { k: string; v: string; vurgu?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-white/45">{k}</dt>
      <dd className={vurgu ? "text-[#D4AF37]" : "text-white/90"}>{v}</dd>
    </div>
  );
}
