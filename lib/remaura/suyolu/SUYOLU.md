# SUYOLU.md — Suyolu Bileklik Kural Kütüphanesi (v2)

Bu dosya, suyolu (tennis) bileklik aracının TEK kural kaynağıdır ve "Jewelry
Design Rules Engine" vizyonunun ilk kural kümesidir. SUYOLU AYRI BİR İŞTİR:
telkari/geometri sayfasıyla bağı yoktur — tüm suyolu kodu lib/remaura/suyolu/,
sayfası app/(site)/remaura/suyolu/, belgeleri Desktop/Suyolu/ altında yaşar
(Murat kuralı, 2026-07-16: "kod aramayalım sağda solda").
Kaynak: 10 bağımsız araştırma raporu (2 tur, 2026-07-16): kimlik ·
antropometri/dönmeme · kelepçe mekaniği · kanal/yuva/tolerans · taş aralığı+tırnak
(Stuller resmi CAD/CAM Standartları PDF tam metin) · reçine baskı+cast-in-place
(Santa Fe 2004 tam metin) · bakla/mafsal kinematiği (patentler+ISO 286) · metal
çekmesi (Progold Santa Fe 2018 dilatometri) · porozite/tij · GIA-HRD kesim
oranları (HRD 2022 resmi broşür tam metin).

İLKE: **keyfi sayı yok.** Güven etiketleri:
`[KANITLI]` resmi standart/akademik/ölçülmüş · `[PRATİK]` çoklu bağımsız sektör
kaynağı · `[TEK]` tek kaynak · `[HESAP]` kanıtlı girdiden türetilmiş ·
`[KALİBRE]` kaynak yok — atölye ölçümüyle doğrulanacak.
Kural numaraları motora girecek kimliklerdir (T=taş, S=oturtma, B=bakla/mafsal,
Ö=ölçülendirme, M=malzeme/mekanik, D=döküm, P=baskı, G=güvenlik).

---

## 0. KİMLİK — KARAR VERİLDİ (Murat, 2026-07-16)

**Suyolu bileklik = TENNIS BRACELET:** eşit boyutlu taşların TEK SIRA, KESİNTİSİZ
dizildiği **esnek, baklalı, çift emniyet klipsli** bileklik. Tanımlayıcı öğe TAŞ
SIRASI; taşsız suyolu ürünü piyasada yok. `[PRATİK]`
- Geleneksel/etnografik "suyolu" = kenar bordür motifi (dalga/zigzag şerit) —
  AYRI kavram `[KANITLI — DergiPark]`; o yorum /remaura/geometri'deki telkari
  dalga kelepçe modelinde yaşıyor (bu sayfanın konusu değil).
- Sert varyant: "suyolu kelepçe" (oval sert kelepçe + taş sırası) `[TEK]` —
  §3 kelepçe kuralları onun için saklanır.
- Terim ailesi: su yolu kolye (tennis chain) · tamtur/yarımtur yüzük (eternity)
  — aynı taş-sırası motoru genellenir. `[PRATİK]`
- UI dili: "kesintisiz akan taş sırası" güvenli; "su kanalı taşları" etimolojisi
  doğrulanmamış pazarlama anlatısı — ürün metnine YAZILMAZ.
- Ayar/ağırlık pratiği: pırlantalı 14K tipik; zirkonlu 8K/14K; altın suyolu
  ağırlık bandı ~4-20 g. `[PRATİK]`

---

## 1. ÖLÇÜLENDİRME (Ö) — antropometri temelli

### 1.1 Bilek verileri
| Parametre | Değer | Güven |
|---|---|---|
| Kadın bilek çevresi ort. | 150-152 mm (aralık 140-165) | `[KANITLI — US mil/MedlinePlus/NHANES]` |
| Erkek bilek çevresi ort. | 172-175 mm (aralık 165-183) | `[KANITLI — Natick 2017]` |
| Bilek genişliği (yanal) | E 59 / K 52 mm | `[KANITLI — CDC]` |
| Bilek yüksekliği (sırt-avuç) | E ~50 / K ~44 mm | `[HESAP]` |
| Bilek oval oranı (en:boy) | ~1.18 (1.15-1.20) | `[HESAP]` — 3D tarama `[KALİBRE]` |
| El (knuckle) çevresi standart | 190-200 mm | `[PRATİK]` |
| Türk yetişkin persentilleri | YOK (sadece 6-17 yaş DAMTCA II) | `[KALİBRE]` |

**Ö1 — Motor girdisi ÇEVREDİR** (baklalar çevreyi sarar); "bilek 55-65mm" tarzı
tek sayı bağlam karışıklığıdır (genişlik 52-59 ≠ çevre 146-183 ≠ bangle iç çapı
53-70 — üçü ayrı büyüklük). `[KANITLI — bağlam çözümlemesi]`

### 1.2 Esnek (tennis) bileklik boyu
- **Ö2:** Bileklik iç çevresi = bilek çevresi + **12.7 mm (normal)** /
  **+25.4 mm (bol)**. `[PRATİK — Whiteflash]` Kadın standart boy 7" (17.8cm).
- **Ö3:** Bakla sayısı N = (bilek çevresi + pay) / bakla boyu L;
  tipik L = **5-10 mm**, tipik N = **35-50**. `[PRATİK]`
- **Ö4:** Boy ayarı bakla ekleyip çıkararak (bakla başına 5-10mm) — tasarım
  baklayı "çıkarılabilir" kurmalı. `[PRATİK]`

### 1.3 Kapalı halka / sert kelepçe (sert varyant için)
- **Ö5:** Kapalı bilezik BİLEKTEN değil ELDEN geçer: iç çap D = el çevresi/π;
  S/M/L = 56/60/63 mm; iki beden arasında BÜYÜĞÜ seç. `[PRATİK]`
- **Ö6:** Oval bangle = yuvarlak bedenin uzun ekseni +3 mm. `[TEK]`
- **Ö7:** Cuff açıklığı 20-25 mm güvenli bant; açıklık < bilek yüksekliği
  (~44-50mm); iç çevre dar bantta bilek −6mm. `[PRATİK]`

---

## 2. DÖNMEME + KONFOR

- **Ö8:** Oval form + doğru sıkılık BİRLİKTE (gevşek oval de döner). Oval iç
  form oranı 1:1.15-1.20. `[PRATİK + HESAP]`
- **Ö9:** Esnek tennis bileklikte dönme tasarım gereği kabul edilir — çözüm
  her açıdan eşit görünüm (kesintisiz taş sırası). Klips karşı-ağırlık etkisi
  `[KALİBRE]`.
- **Ö10:** Bant eklem üstüne oturmaz, dolaşımı kısmaz. `[KANITLI — Gemperle 1998]`
- **Ö11:** Günlük konfor ağırlık: kadın tüm-gün 5-15g, genel 10-20g. `[PRATİK]`
- Top-heavy dönme eşiği (gram asimetri): `[KALİBRE]`.

---

## 3. SERT KELEPÇE MEKANİĞİ (M) — yalnız sert varyant

- **M1 (ANA FORMÜL):** Gap açılma sehimi δ = 3π·P·R³/(E·I), I = w·t³/12.
  **Kalıcı yamulma sınırı δ_max = 3π·σy·R²/(E·t)** — genişlik formülden düşer;
  yamulmazlık yalnız t, R, σy/E'ye bağlı. Tasarım: esneme talebi ≤ 0.8×δ_max.
  `[KANITLI — Castigliano]` Örnek (R30/t2/E75GPa): tavlı Ag 7mm, sert 22mm →
  kelepçede SERT temper şart.
- **M2:** Kelepçe dolu-kesit kalınlığı 2-4 mm (2 alt sınır); kavisli kesit düz
  şeritten belirgin rijit. `[PRATİK — Ganoksin]`
- **M3:** Ürün notu: "bükerek takmayın; bileğin yan tarafından geçirin". `[PRATİK]`
- **M4 malzeme kartları:** Ag925: E≈75GPa±%10`[KALİBRE]`, σy 124MPa (tavlı),
  UTS 207-283 (tavlı) → 496-552 (sert), ρ 10.36 `[KANITLI — ESPI]`.
  Au22K UTS 220→390; Au18K 520→810, E 75-79GPa `[KANITLI — Total Materia]`.
  Karat akma tahmini σy≈3×HV — sadece ön boyutlandırma `[HESAP-KALİBRE]`.
- **M5:** Döküm ≈ tavlanmış (en yumuşak) hal; çekilmiş tel 2-2.5× güçlü. `[KANITLI]`
- **M6 ajur cezası:** delik alanı %20 → etkin E −%26; %50 → −%73 (doğrusal
  değil). Her enine kesitte sürekli metal yolu şart. `[KANITLI — MDPI; takı
  ölçeği KALİBRE]`

---

## 4. TAŞ GEOMETRİSİ (T) — yuvarlak pırlanta/CZ

### 4.1 HRD Excellent bantları (resmi 2022 broşür — kanıtlı)
| Parametre | Excellent | Güven |
|---|---|---|
| Tabla | %52-62 | `[KANITLI — HRD]` (GIA yaygın bandı aynı `[PRATİK]`) |
| Taç açısı | 31.3-36.7° (GIA 31.5-36.5°) | `[KANITLI]` |
| Pavyon açısı | 40.6-41.8° | `[KANITLI]` |
| Taç yüksekliği | %12.0-17.0 | `[KANITLI]` |
| Pavyon derinliği | %43.0-44.5 | `[KANITLI]` |
| Girdle | %2.5-4.5 (Medium) | `[KANITLI]` |
| Toplam derinlik | %58.5-63.5 | `[KANITLI]` |
| Culet | ≤%0.9 | `[KANITLI]` |
| Alt yarım fasetler | %70-85 | `[KANITLI]` |

- **T1 (CAD taş modeli):** yükseklik = **0.61 × çap** (HRD EX bandı ortası);
  taç (girdle üstü) = **0.15 × çap**; girdle %3; pavyon %43.5. İç tutarlılık:
  15+3+43.5 = 61.5 ✓. `[HESAP — kanıtlı bantlardan]`
- **T2:** Motor mm-ÖNCELİKLİ çalışır; karat türetilmiş değerdir:
  ct = çap² × derinlik(mm) × 0.0061. `[PRATİK — çok kaynak]`
  mm→ct çapaları `[KANITLI — Stuller resmi tablo]`: 1.0→0.005 · 1.3→0.01 ·
  1.8→0.025 · 2.0→0.03 · 3.0→0.10 · 3.5→0.16 · 4.1→0.25 · 5.2→0.50 · 6.4→1.00.
- **T3 kalibre/elek:** 1.10-1.60mm arası 0.05mm bandlar; 1.60-3.80mm arası
  0.10mm bandlar → çap toleransı ±0.025-0.05mm. `[PRATİK]` Tedarikçi beyanı:
  CZ ±0.02, doğal ±0.05. `[TEK]`
- **T4 CZ:** yoğunluk 5.6-6.0 (pırlanta 3.52) → aynı mm'de ~1.7× ağır; CZ aynı
  mm serisiyle kesilir, karat etiketi "pırlanta eşdeğeri"dir — motorda CZ için
  gerçek gram = eşdeğer ct × 1.7 düzeltmesi. `[KANITLI (yoğunluk) + PRATİK]`
- **T5:** Suyolu taş bandı pratik aralığı 1.5-3.5mm (bakla başına 1 taş);
  tüm taşlar eş boy/renk. `[PRATİK]`

---

## 5. TAŞ OTURTMA (S)

### 5.1 Kanal (channel) — baget ve yuvarlak için tipik
- **S1:** Kanal açıklığı = taş çapının **%90-95'i** (Stuller: yuvarlak %95,
  prenses/baget %98) — girdle her yanda duvara gömülür. `[KANITLI — Weishaar
  + Stuller PDF]`
- **S2:** Yuva kesici **girdle ölçüsünün %98'i** (≈%2 sıkı geçme; 2mm taşta
  0.04mm). `[KANITLI — Stuller]`
- **S3:** Kanal derinliği = taş derinliğinin **%75-100'ü** (sığ → pilot delik
  görünür; derin → montür zayıflar). `[KANITLI — Weishaar]`
- **S4:** Kanal duvarı taş boyuna göre: **0.50mm (<1.8) / 0.65mm (1.8-2.5) /
  0.80mm (>2.5mm taş)**. `[KANITLI — Stuller]`
- **S5:** Tabla konumu: **≤3.0mm taş flush** (metalle hizada); >3.0mm hafif
  üstte. `[KANITLI — Weishaar]`
- **S6:** Baget: köşelere metal teması YASAK (en kırılgan nokta); sayısal
  tolerans `[KALİBRE]`. `[KANITLI (yasak) — Lewy]`

### 5.2 Tırnak (prong)
- **S7:** Tırnak çapı ≈ taş çapının **~%15'i** (0.6mm@4.1mm, 1.2mm@8.2mm
  verilerinden); mutlak taban **0.45mm** (pinpoint), döküm güvenli 0.6mm.
  "%10 kuralı" kaynakta YOK. `[PRATİK + KANITLI (0.45 Stuller)]`
- **S8:** CAD'de tırnak kubbesinin TABANI = tabla düzlemi; bitmiş uç crown'un
  ~yarısına kadar, tablaya taşmaz. `[KANITLI — Stuller]`
- **S9:** Yuva (seat) kesme derinliği: CAD'de tırnak kalınlığının **≤%25'i**
  (Stuller); mutlak üst sınır %33 (Lewy "ötesi gerçek zayıflık"). Kaynaklar
  %25-50 arasında çelişir — motor %25 uygular, %33'te uyarır. `[KANITLI —
  çelişki belgeli]`
- **S10:** Pavyon-galeri boşluğu: pırlanta 0.2-0.3mm / renkli taş 0.3-0.5mm;
  culet-cilt/ray boşluğu ≥0.5mm; galeri rayları arası ≥0.4mm. `[KANITLI — Stuller
  + Ganoksin]`

### 5.3 Taş aralığı ve genel
- **S11:** Taşlar arası girdle-girdle minimum **0.15mm**; girdle TEMASI YASAK
  (döküm/soğuma taşı çatlatır). `[KANITLI — Stuller + Rio Grande/Dalloz]`
  Atölye bandı 0.1-0.35mm; merkez-merkez adım ≈ çap + 0.2-0.3mm. `[PRATİK]`
- **S12:** Işık deliği (azure/pilot) = taş çapının **%50-67'si**; pilot delik
  derinliği ≤ 2×çap. `[PRATİK + KANITLI (Stuller)]`
- **S13 — TOLERANS HÜKMÜ:** "+0.05 sıkı / +0.10 gevşek" bir endüstri standardı
  DEĞİL (çürütüldü). Doğru model: (a) elde mıhlama → yuva CAD'de nominal/altında
  (S2 %98), son sıkılığı mıhlamacı verir; (b) cast-in-place snap-fit → taş çapı
  +0.05…0.12mm `[TEK]`. Sıkılık sabit sayı değil, taş tolerans sınıfına (T3)
  bağlı parametre. `[KANITLI — çoklu kaynak sentezi]`
- **S14:** Mıhlamacı payı: taş temas bölgelerine +0.5-0.6mm ekstra metal
  (pipe); üretim/polisaj ~0.2mm metal alır → CAD = bitmiş + 0.2mm. Parçaların
  boolean bindirmesi ≥0.15mm. `[KANITLI — Stuller + PRATİK — Ganoksin]`

---

## 6. BAKLA / MAFSAL KİNEMATİĞİ (B)

- **B1 (pim çapı FORMÜL, sabit değil):** çift kesme d ≥ √(2·P·SF/(π·0.577·σy));
  P=200N (saat normu, ISO 6425 bağlamı), SF=2 → sterling'de d≈1.0mm.
  Saat pratiği 0.7-1.5mm pim. "1.00mm mutlak minimum" değil — malzeme+yük
  türetir. `[KANITLI (formül+200N) + HESAP]`
- **B2:** Knuckle (mafsal borusu) dış çap ≥ d_pim + 2×0.8mm (döküm et kuralının
  deliğe uygulanması; Omega'nın 0.1mm çelik tüpü değerli metalde geçersiz).
  `[HESAP-KALİBRE]`
- **B3 alıştırma:** dönebilir pim: çapta 5-20µm boşluk (ISO 286 H7/g6, ≤3mm:
  2-18µm); alternatif sürtünmeli (force-fit — taş yüzü yukarı kalır, tennis
  için tercih parametresi). `[KANITLI — ISO 286 + Ganoksin]`
- **B4 eklem açısı:** gereken açı θ = 2·arcsin(L/(2R)); muhafazakâr lokal
  R_min ≈ 20mm ile kontrol et. `[KANITLI geometri; R_min HESAP]`
- **B5 stop açıları (patentli):** içe bükülme θ_max = **16-18°** (bakla alt
  pahı 5-10°, tipik 8°; üst yüzeyler temas eder — kesintisiz görünüm);
  ters katlanma **0° dik omuz** (anti-fold). `[KANITLI — EP0196996B1 +
  US6345492B1]`
- **B6:** Taş çarpışma denetimi θ_max konumunda komşu taş/yuva kesişim testi
  olarak yapılır (fiziksel stop'un CAD karşılığı). `[HESAP]`
- **B7:** Düz yüzlü baklada gap g ≥ 2·h·tan(θ_max/2); pahlı tasarımda g≈0.
  `[HESAP + patent]`
- **B8:** Menteşe knuckle sayısı TEK (3,5,7); pim deliğe hafif sıkı çakılır;
  lehim eklem hattından/pim deliğinden UZAK (lehim = yorulmada zayıf halka,
  PubMed kanıtlı). `[PRATİK + KANITLI]`
- **B9 yorulma:** Au/Ag FCC → yorulma limiti YOK; tasarım σ_dalgalanma ≤
  0.3-0.4×UTS @10⁷, çentikte ×0.5. `[KANITLI (limitsizlik) + HESAP —
  S-N eğrisi yayını yok, KALİBRE]`
- **B10 kilit:** box clasp dil ~10×6×0.4mm + kutu 0.5mm sac + **sekiz emniyeti
  zorunlu** (çift emniyet = zanaat konvansiyonu). Hedef: her eklem/klips 200N.
  ASTM F2999 sayısal eşiği paywall — `[KALİBRE/satın al]`. `[PRATİK + KANITLI]`
- **B11 bakla eti:** döküm bakla yapısal et ≥0.8mm (Au) / 0.8-1.0mm (Ag);
  taş taşıyan bakla duvarı → §5 kuralları. `[KANITLI — Materialise]`

---

## 7. DÖKÜM (D)

### 7.1 Çekme (shrinkage) — iddia karnesi işlenmiş
- **D1:** Altın alaşımları lineer döküm çekmesi **%1.25-1.7** (dental akademik
  ölçümler; Progold dilatometri uyumlu). Murat iddiası "%1.2-1.8" DOĞRULANDI.
  `[KANITLI]`
- **D2:** Ag925 lineer ~**%1.5-2.5** (fizik ~%2.0 destekler; birincil Ag925
  ölçümü yok). İddia "≈%2" KISMEN. `[PRATİK + KALİBRE]`
- **D3:** Platin "%1" iddiası ÇÜRÜTÜLDÜ — birincil kaynak yok, fizik ~%1.5-1.6
  imler; pratik ölçekleme %1-3. `[KANITLI (çürütme) + PRATİK]`
- **D4:** Revetman genleşmesi metal çekmesini kısmen/tamamen telafi eder →
  NET katsayı prosese özgüdür; evrensel sayı YOK. CAD telafisi başlangıcı:
  direkt reçine dökümde +%1-3 (kesite göre); toplam zincir %1-6 (Hoover).
  **Kesin katsayı Murat'ın zincirinde test dökümle kalibre edilir** (bilinen
  çaplı tel dök-ölç). `[KANITLI (prensip) + KALİBRE (katsayı)]`

### 7.2 Minimum ölçüler — iddia karnesi işlenmiş
- **D5:** "18K 0.60 / Ag925 0.70 / Pt 0.80 duvar" tablosu ÇÜRÜTÜLDÜ (sıralama
  kaynaklara ters: gümüş dökümsel olarak EN kolay alaşım — Materialise Ag 0.6 /
  Au 0.8; Pt 0.80 doğrulandı `[TEK]`). Motor tablosu `[KANITLI — servis kılavuzları]`:
  genel dış duvar **0.8mm** · gümüş gloss 0.6 · bant/yüzük bandı **≥1.0** ·
  şank 1.2 · claw/bezel 0.45-0.5 · kanal duvarı 0.35-0.50 (Stuller, taş boyuna
  göre §S4 ile birlikte) · detay Ø0.35×h0.4 · parça arası ≥0.3.
- **D6:** "tırnak 0.60" makul orta değer `[PRATİK]`, "bezel 0.70 minimum"
  ÇÜRÜTÜLDÜ (yayınlı min 0.45-0.5; 0.70 muhafazakâr tercih) — motor: min 0.5,
  öneri 0.7. "bağlantı 1.00" dolaylı destekli (yüzük bandı 1.0/şank 1.2).
- **D7 saha verisi:** 0.3mm duvar dolmaz · 0.5mm dolar ama distorsiyonlu ·
  0.75mm sorunsuz. `[TEK — saha]` 0.3mm filigre teli ancak ÇOK noktadan
  beslemeyle dökülür. `[PRATİK — Formlabs]`
- **D8:** Polisaj kaybı 0.10-0.20mm → CAD = hedef + pay (S14 ile aynı). `[KANITLI]`

### 7.3 Porozite / tij
- **D9:** Katılaşma büzülmesi Au/Ag hacimce %4-6; eğilim: beyaz Au > sarı Au >
  sterling. `[KANITLI — Fischer-Bühner]`
- **D10:** Kalın-ince-kalın tuzağı: ince kesit kapı gibi donar, arkadaki kalın
  kesit beslenemez → porozite. Kesit geçişi 5→3→5mm kabul, 10→1→10 kötü.
  `[KANITLI + TEK (sayısal)]`
- **D11 tij:** en ağır kesite bağlanır; kesit alanı bağlantının %70-150'si;
  parçanın en ağır kesitinden ≥%25 kalın; besleme tiji ≤19mm; birleşime fillet;
  yuvarlak tij yassıdan üstün. `[KANITLI/PRATİK — Bell/Hoover]`
- **D12 cast-in-place (taşla döküm):** dayanır: elmas/yakut/safir/garnet/CZ;
  YASAK: ametist/zümrüt/opal/inci/peridot/topaz/turmalin/turkuaz/kuvars/organik.
  Burnout tepe **630°C + 6 saat** (730 değil); quench YASAK (yavaş soğut);
  elmas flask ≤1000°F katkısız / ≤1200°F katkılı; CZ ~700-730°C flask, boric
  acid CZ'de kullanılmaz; pratik taş sınırı ≤2mm. `[KANITLI — Rio Grande +
  Santa Fe 2004 (McKeer) tam metin]`

---

## 8. 3D BASKI (P) — reçine (takı yazıcıları)

- **P1 (Formlabs resmi):** duvar (destekli/desteksiz) ≥0.2mm · kabartma ≥0.1 ·
  oyma ≥0.15 · **delik ≥0.5mm (küçüğü baskıda kapanır)** · boşluk ≥0.4-0.5 ·
  desteksiz çıkıntı ≤5.0mm & ≥10° · köprü ≤29mm. `[KANITLI]`
- **P2:** Delik/cepler **2×bleed küçük basılır** (bleed reçineye göre 10-110µm/
  yüzey) → hassas geçmelere ≥0.1mm pay (silindirik 0.15). Taş yuvası zaten
  S2/S13 gereği dökümden sonra burla bitirilir — baskı telafisine yaslanma.
  `[KANITLI (mekanizma) + PRATİK]`
- **P3 (CW40 resmi):** post-cure GEREKMEZ; yapılırsa <%1 çekme + distorsiyon
  (hassas yuvalı parçada atla); oda sıcaklığı üstünde post-cure yasak;
  baskıdan sonra **3 gün içinde dök**; IPA tam buharlaşmalı. `[KANITLI]`
- **P4:** Destek teması: Castable Wax pratiğinde ~0.35mm touchpoint. `[KANITLI]`
- **P5:** XY piksel: B9 30-50µm, Asiga 27-62µm; "±µm parça doğruluğu" resmi
  değeri hiçbir üreticide YOK. `[KANITLI (yokluk tespiti)]`

---

## 9. GÜVENLİK (G)

- **G1:** Uç/kenar: tam yuvarlatma (radyüs ≥ t/2), dış kenarlara ≥0.2-0.3mm
  fillet. `[KALİBRE — F2923 keskinlik ilkesinden]`
- **G2:** Standartlar: ASTM F2999 (yetişkin, mekanik tehlike), F2923 (çocuk),
  EN 71-1. Bileklik rijitliği/kopması için sayısal eşik yayını YOK (F2999
  metni satın alınmalı). `[KANITLI — boşluk tespiti]`

---

## 10. MURAT İDDİA KARNESİ (yapıştırılan AI özetinin doğrulaması)

| İddia | Hüküm |
|---|---|
| Altın çekme %1.2-1.8 | ✅ DOĞRULANDI (D1) |
| Gümüş çekme ~%2 | 🟡 KISMEN (D2 — fizik destekler, birincil ölçüm yok) |
| Platin çekme ~%1 | ❌ ÇÜRÜTÜLDÜ (D3) |
| 18K 0.60 / Ag 0.70 / Pt 0.80 duvar | ❌ tablo ÇÜRÜTÜLDÜ (D5 — sıralama ters); Pt 0.80 ✅ |
| Destek 0.45mm | 🟡 KISMEN (0.45 = Stuller pinpoint tırnak çapı) |
| Tırnak 0.60mm | 🟡 KISMEN (makul orta değer; min 0.45 kanıtlı) |
| Çerçeve/bezel 0.70mm | ❌ "minimum" olarak ÇÜRÜTÜLDÜ (yayınlı 0.45-0.5); muhafazakâr öneri olarak OK |
| Bağlantı 1.00mm | 🟡 KISMEN (dolaylı: yüzük bandı 1.0/şank 1.2; pim için B1 formülü esas) |
| Yuva +0.05 oturmaz / +0.10 sallanır | ❌ standart olarak ÇÜRÜTÜLDÜ (S13 — cast-in-place'te kısmen) |
| Bilek 55-65mm | ❌ BAĞLAM KARIŞIK (Ö1 — genişlik/çevre/iç çap üç ayrı büyüklük) |
| Mafsal 1.00mm minimum | 🟡 KISMEN (B1 — formül esas; 1.0 sterling varsayılan sonucu) |

---

## 11. KALİBRASYON LİSTESİ (atölye doğrulaması — kaynak yok/yetersiz)

1. Döküm çekme katsayısı — Murat'ın zinciri (yazıcı+revetman+metal) test dökümü
   (bilinen çaplı tel dök-ölç). EN ÖNEMLİSİ.
2. Ag925 sert temper akma + alaşım-özel E (tek çekme testi).
3. Türk yetişkin bilek çevresi persentilleri (müşteri ölçüm defteri).
4. Bilek dış oval oranı ölçümü (1.18 hesap).
5. Kanal rayı et kalınlığı ray-özgü değeri; baget kanal toleransları.
6. Tırnak radyal overlap mm'si (türetme: 0.25×tırnak Ø).
7. Bakla adım (pitch) formülünün saha doğrulaması (yazılı kaynak yok).
8. ASTM F2999 sayısal eşikler (standart satın al).
9. Au/Ag alaşım S-N (yorulma) eğrisi; lehim başına dayanım kaybı.
10. GIA girdle sınıflarının resmi % sınırları (görüntü-PDF çözülemedi).
11. CZ kesim toleransı farkları.
12. Top-heavy dönme eşiği; bant eni ↔ fleksiyon konforu.

---

## 12. KAYNAKÇA (ana — tam URL'ler araştırma raporlarında)

Resmi/kanıtlı: **Stuller CAD/CAM Production Standards PDF** (tam metin) ·
**HRD Antwerp Cut Grade Brochure 2022** (tam metin) · **Santa Fe Symposium**:
McKeer 2004 Stone-in-Place (tam metin), Progold 2018 dilatometri (tam metin),
Fischer-Bühner JTF 2019 · GIA Cut Estimation Tables (kısmi) · Rio Grande/Teague
Stone-in-Place PDF · Dalloz wax casting guideline · Formlabs resmi tasarım/CW40
dokümanları · Materialise/Shapeways/Castimize/Cooksongold/Morris&Watson döküm
kılavuzları · ESPI Metals Ag925 · Total Materia Au alaşımları · ISO 286 (H7/g6)
· Patentler EP0196996B1, US6345492B1 · Cambridge DANotes (Castigliano) ·
MDPI Metals 15:711 · CDC/Natick/NASA/MedlinePlus antropometri · Gemperle 1998 ·
J Prosthetic Dentistry 1966 (döküm çekmesi) · Ott & Raub Gold Bulletin ·
Klotz PGM casting · DergiPark (suyolu motifi, Erdoğan).
Pratik: Ganoksin makaleleri (Weishaar kanal, Lewy claw/flush/baget, Bell sprue,
hinge/catches) · Stuller Bench Jeweler · Hoover & Strong · Hauser & Miller ·
Perrin saat parçaları · Whiteflash/LeonDiamond (tennis) · sieve/mm-ct tabloları.
