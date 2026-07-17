# ZINCIR.md — Zincir Kural Kütüphanesi (v1)

Bu dosya, zincir aracının TEK kural kaynağıdır ("Jewelry Design Rules Engine"
ailesinin ikinci kural kümesi — birincisi SUYOLU.md). ZİNCİR AYRI BİR İŞTİR:
tüm zincir kodu lib/remaura/zincir/, sayfası app/(site)/remaura/zincir/ altında
yaşar (Murat kuralı: "kod aramayalım sağda solda").
Kaynak: 3 bağımsız araştırma raporu (2026-07-16): bakla geometrisi+kinematik
(patentler + Ganoksin usta forumu + SIGGRAPH 2023 DIM) · hollow/ajur hafifletme
(mooring-zinciri FEA + perfore kabuk literatürü + döküm servis kılavuzları) ·
taksonomi+ölçü standartları (üretici/perakendeci tabloları + TR piyasa adları).

İLKE: **keyfi sayı yok.** Güven etiketleri:
`[KANITLI]` resmi standart/akademik/patent · `[PRATİK]` çoklu bağımsız sektör
kaynağı · `[TEK]` tek kaynak · `[HESAP]` kanıtlı girdiden türetilmiş ·
`[KALİBRE]` kaynak yok — atölye ölçümüyle doğrulanacak.
Kural kimlikleri: K=kimlik/tip, Ö=ölçülendirme, B=bakla geometrisi,
D=dizilim/kinematik, T=traş, A=ajur/hafifletme, C=döküm, G=gramaj.

---

## 0. KİMLİK (K) — tip kataloğu ve v1 kapsamı

**K1 — v1 tipleri (torus-süpürme ailesi, CAD+döküm anlamlı):** forse (cable),
gurmet (curb), Küba (Miami cuban), figaro, doç (rolo — forsenin boy=en hali).
`[PRATİK]` Çapa (mariner) v2 adayı (forse + orta bar).
- **K2 — makine örgüsü gerçeği:** halat/rope, venedik/box, franco, spiga/wheat,
  balıksırtı/herringbone, yılan/snake gerçek üretimde makine örgüsüdür; tekil
  bakla CAD'i birebir karşılık DEĞİLDİR. `[PRATİK]`
- **K5 — masif yorumlar (Murat, 2026-07-17: "diğerleri de aktif olsun"):**
  K2 tipleri araçta MASİF DÖKÜM YORUMU olarak aktiftir (UI rozetli):
  - *halat* = 3 damar helis, %12 gömme ile tek gövde (TELKARI §1.6; pitch
    3×çap — burgu bandı 2.5-4× `[PRATİK]`) — burma geleneğinin karşılığı.
  - *spiga* = 4 damar süper-helis (ana sarım + ikincil kıvrım) `[KALİBRE]`.
  - *yılan* = açık uçlu boru (et 0.8 C4; uçlar döküm drenajı A5) + helis pul
    çentiği (displacement — CSG yok, su geçirmez) `[KALİBRE]`.
  - *balıksırtı* = masif yassı şerit + iki sıra zıt çevron çentiği; esnek
    DEĞİLDİR `[KALİBRE]`.
  - *venedik* = bakla motorundan: kare tel + halka (v1 "kare telli doç"
    yorumu; kare ÇERÇEVE omurga v2 adayı).
  - Kolyede görünümü örgü/boru tiplerinde gerçek BÜKMEdir (x→çember haritası);
    STL görünüme göre iner — kolye masif dökülecekse BÜKÜK STL kullanılır.
  - franco hâlâ dışarıda (curb-çift kilit; v2 değerlendirmesi).
- **K3 — Türkçe/İngilizce ad eşlemesi** `[PRATİK — midas.com.tr, alexmakina,
  bilezikci, gumush]`: cable=**forse**, rolo=**doç**, curb=**gurmet**,
  cuban=**Küba**, figaro=figaro (üretici dilinde "3+1"), rope=halat,
  box=venedik/küp, snake=yılan, herringbone=balıksırtı, mariner=çapa/denizci.
- **K4 — tip tanımları:** forse = oval halkalar 90° dik alternasyonla `[PRATİK]`;
  gurmet = oval bakla bükülüp yassılaştırılır, tüm baklalar tek düzlemde yatar
  `[PRATİK]`; Küba = gurmetin dolgun kesitli, sıkı dizilimli (örtüşme ~%50),
  çift yüzü traşlı hali `[PRATİK]`; figaro = gurmet tabanlı desen dizisi
  (3 kısa + 1 uzun standart) `[PRATİK]`.

---

## 1. ÖLÇÜLENDİRME (Ö)

- **Ö1 — kolye boyları:** 40/45/50/55/60 cm standart kademeler; kadın standardı
  **45 cm** ("princess"), erkek standardı **50-55 cm**. `[PRATİK — Brilliant
  Earth, Borsheims, Statement Collective]`
- **Ö2 — bileklik boyları:** kadın 16.5-19 (standart 18), erkek 19-23
  (standart 20-21.5 cm). `[PRATİK — James Avery + cuban size-chart'lar]`
- **Ö3 — halhal:** 23-25 cm standart; kural = bilek çevresi + 0.5-2.5 cm. `[PRATİK]`
- **Ö4 — genişlik bantları (Küba/erkek):** 2-4 ince/unisex · 3-6 günlük ·
  **6-8 en popüler (8 mm en çok satan)** · 8-12 iri · 12+ sahne. `[PRATİK —
  goldzenn, frostnyc, 6ixice]`
- **Ö5 — bakla sayısı:** N = yuvarla(uzunluk / adım); gerçekleşen uzunluk
  N × adım olarak RAPOR edilir (suyolu Ö3 ile aynı yaklaşım). `[HESAP]`

---

## 2. BAKLA GEOMETRİSİ (B) — tek sayısal birincil kaynak Ganoksin usta forumu; patentler süreç verir, ölçü vermez

Genişlik W kullanıcı girdisidir; kalan her şey türer:

- **B1 — tel çapı:** d = **W/3** (görsel model) — ağırlık-doğru model **W/3.5**
  (8 mm/1.97 g-cm piyasa çapasına kalibrasyon sonucu). `[TEK — Ganoksin 12mm
  cuban: 4mm tel] + [HESAP]` Motor W/3.5 ile başlar → G1 çapasına kalibre.
- **B2 — Küba (Miami) bakla ölçüleri** `[TEK — Ganoksin JonathanE]`:
  dış boy L_o = **4d + 0.5 mm** → iç boy L_i = **2d + 0.5 mm** (= iki komşu
  tel + 0.5 klerans — Miami sıkılığının tanımı); iç en W_i = **1.0-1.2 × d**.
  - **B2-CAD düzeltmesi (2026-07-16, kesişim taramasıyla kanıtlı):** Ganoksin
    ölçüleri PRES-SONRASI ölçüdür (tel temaslarda yassılaşır). Rijit CAD'de
    ±45° çapraz geçen tel yuvada d/cos45° = 1.41d yer ister → motor:
    **L_i = 2.83d + 0.5, W_i = 1.55d** (bu ölçülerde çakışma 0, C2 0.2mm ✓;
    W_i=1.15d'de 0.6-1.3 mm³ fiziksel çakışma çıkıyordu; 1.5d alan-koruyan
    kesit şişkinliğiyle 0.2'yi kıl payı kaçırıyordu). `[HESAP — tarama]`
- **B3 — klasik gurmet (gevşek):** L_o ≈ **4.7d**, W_i ≈ **1.5-2d**
  (18k el yapımı örnek: 7×3×1.5). `[TEK — Ganoksin Revere hattı]`
- **B4 — forse/doç:** oval L_i ≈ 2.5-3.5d, W_i ≈ 1.5-2d; doç = daire (L=W).
  `[PRATİK]` Chainmaille alt sınırı: dairesel halkada iç çap/tel (AR) < ~2.4
  kilitlenmez. `[KANITLI-topluluk — zlosk ölçüm tablosu]`
- **B5 — büküm (curb/Küba):** bakla kendi uzun ekseni boyunca **toplam 90°**
  bükülür (uçlar ±45°). `[KANITLI — US2140491 non-kink patenti + CAD pratiği]`
  Az bükmek fazla bükmekten iyidir (zanaat kuralı). `[TEK — Ganoksin]`
- **B6 — yatış açısı:** bakla düzlemi zincir eksenine **±45° alternatif**.
  `[PRATİK]` Motorda büküm ve yatış AYRI parametredir; görsel doğrulama +
  D1 kesişim denetimiyle birlikte ayarlanır.
- **B7 — figaro deseni:** adet oranı **3 kısa : 1 uzun** standart (2+1 varyant);
  3:1 ADET oranıdır, boy oranı değil — uzun bakla boyu ≈ **2-2.5 × kısa**
  (serbest parametre). `[PRATİK — gld, statementcollective + dikkat notu]`
- **B8 — tel çapı KULLANICI PARAMETRESİDİR (Murat, 2026-07-16: "hedef gramajı
  yakalayabilmeliyiz; altın maliyeti kullanıcı tercihinde"):** genişlik W dış
  görünümü, tel çapı d metali belirler; iç ölçüler ikisinden türer
  (W_i = W − 2d, L_i = L_o(W) − 2d — d inceldikçe bakla ferahlar, gram düşer;
  gerçek dünya karşılığı ince telli/açık cuban'lar). Sınırlar kural-türevli:
  **max** = iç ende komşu tel + C2 sığmalı → çapraz ailede (W−0.3)/3.41, dik
  ailede (W−0.3)/3 (= eski "dolu" varsayılan üst sınırdır); **min** = 0.5 mm
  (D7 döküm tabanı; 0.8 altı uyarılır). Anlık gram tahmini Pappus hacmi ×
  kesin-üretim düzeltme katsayısıyla verilir. `[HESAP — B2-CAD + D7'den]`

---

## 3. DİZİLİM / KİNEMATİK (D)

- **D1 — adım (pitch):** Küba sıkı dizilim p = **L_i/2 + d**; gergin üst sınır
  p = L_i. Örtüşme oranı p/L_o ≈ **0.50** (Miami imzası). `[HESAP — B2'den]`
  - **D1-CAD (2026-07-16):** motor TEK formül kullanır (tüm tipler):
    **p(a,b) = (L_i(a)+L_i(b))/4 + d + adımPayı** — j±2 dış yüzeyleri arası
    tam adımPayı boşluk kalır. Tarama sonucu paylar: forse/doç **0.15** ·
    gurmet/figaro **0.25** · Küba **0.30** (C2 0.2 sağlanır). Eski forse
    formülü (L_i − d) j±2 çakışması üretiyordu — İPTAL. `[HESAP — tarama]`
- **D2 — eksenel oynama:** Δp = (L_i − 2d)/2; Miami'de **0.25-0.5 mm**
  (yarı-rijit şerit davranışı — tasarım gereği). `[TEK + HESAP]`
- **D3 — bükülme yarıçapı (rapor değeri):** R ≈ p/(2·sin(α/2)),
  α ≈ atan((W_i − d)/p). Yöntem dayanağı: iç içe halka malzemelerde hareket
  sınırını eleman-eleman kontak belirler. `[KANITLI — Tang ve ark., "Beyond
  Chainmail: Discrete Interlocking Materials", SIGGRAPH/TOG 2023 + HESAP]`
- **D4 — kesişim denetimi ŞART:** montaj dizilimi sonrası komşu (j±1) ve
  ikinci komşu (j±2) baklalarla boolean kesişim hacmi **0 olmalı**; ayrıca
  tel çapı + C2 boşluğu kadar şişirilmiş kopya da kesişmemeli (gerçek aralık
  ≥ boşluk garantisi). `[HESAP — motorun mikron sözü]`

---

## 4. TRAŞ / DIAMOND-CUT (T)

- **T1 — pas derinliği:** solid zincirde **0.05-0.10 mm/yüz** (patent:
  0.002-0.004"); hollow'da 0.005-0.2 mm duvara bağlı. `[KANITLI — US5797258,
  US5408820, US5605038]`
- **T2 — "çapın yüzde kaçı taşlanır" için yayın YOK:** motor kuralı: traş
  sonrası kalan kalınlık ≥ **0.8 × d** (kesit alan kaybı <%10 bandı) — keyfi
  olduğu açıkça işaretli, slider kullanıcıda. `[HESAP — KALİBRE]`
- **T3 — traş ağırlık etkisi:** aynı boy zincirde ~%5-15 hafifletme. `[PRATİK]`
- **T4 — pres kalınlığı:** Küba zincir kalınlığı ≈ **1.5-2 × d** (pres sonrası);
  yayınlı sayı yok — motorda traş oranı slider'ı bu bandı hedefler. `[kaynak yok
  — KALİBRE]`
- **T5 — CAD karşılığı:** traş = z'ye simetrik düzlem kesimi (üst+alt, zincir
  düzlemine paralel iki yüz). `[PRATİK]`

---

## 5. AJUR / HAFİFLETME (A) — Murat'ın Küba hafifletme isteği (2026-07-16)

Vekil literatür: mücevher zinciri FEA'sı yayınlanmamış — en yakın kanıt
mooring/conveyor zinciri FEA + perfore kabuk çalışmaları.

- **A1 — bölgeleme (delinebilirlik haritası):** bakla 3 bölgedir:
  (i) **uç yarım-toruslar + iç büküm (intrados)** — gerilme/SCF zirvesi,
  yorulma ömrü en kısa → **DELİK YASAK**; (ii) geçiş bandı → yasak;
  (iii) **düz yan yüzeylerin orta bandı** — düz bacak ömrü kıvrımın ~5 katı →
  delikler YALNIZ burada. `[KANITLI — mooring/conveyor link FEA sentezi]`
- **A2 — uç tamponu:** serbest bölge, bakla ucundan ~**%25 boy** içeride
  başlar (geçiş bandı payı). `[HESAP — KALİBRE]`
- **A3 — delik alan tavanı:** serbest bölgede delik alanı ≤ **%20-30**
  (etkin E kaybı −%26…−%40 bandı); %50'ye ÇIKMA (−%73). Köprü (ligament)
  ≥ delik çapının ~0.5'i. `[KANITLI — MDPI Metals 15 + perfore levha
  literatürü; takı ölçeği KALİBRE]`
- **A4 — duvar:** delik kenarı ile tel kenarı arası ≥ **0.8 mm** (döküm dış
  duvar kuralı — SUYOLU D5 ile aynı kaynak ailesi). `[PRATİK — Materialise/
  Shapeways]` Ajur desen kütüphanesinin kendi minBridge değeri ayrıca uygulanır.
- **A5 — hollow (v2):** hollow = solid × **0.30-0.50** ağırlık; duvar
  0.8-1.0 mm + dent riski uyarısı; drenaj: **≥2 delik, ≥1.5 mm** (tek delikse
  ≥4 mm), zıt uçlarda. Semi-hollow ×0.50-0.75, duvar ≥1.2. `[PRATİK — Ganoksin
  hollow, Materialise, Shapeways, US4651517]` v1'de hollow YOK — ajur var.
- **A6 — ajur cezası hatırlatması:** delik alanı %20 → etkin E −%26; %50 →
  −%73 (doğrusal değil); her enine kesitte sürekli metal yolu şart.
  `[KANITLI — MDPI (SUYOLU M6 ile aynı)]`

---

## 6. DÖKÜM (C) — tek parça iç içe zincir

- **C1 — print-in-place + tek döküm MÜMKÜN:** zincir iç içe geçmiş basılır,
  destekler sprue olarak kullanılır, tek seferde dökülür (WaxJet vaka çalışması:
  "tek entegre parça"). Ana fire modu: çekme/yanlış profil baklaları
  **birbirine kaynatır**. `[TEK — ProtoSpeed + FlashForge]`
- **C2 — bakla arası boşluk:** tasarım **≥0.3 mm** (0.2 mm mutlak alt sınır);
  güvenli bant 0.3-0.5 — dar boşlukta revetman kanadı kırılır → baklalar kaynar.
  `[TEK/PRATİK + HESAP — KALİBRE: kendi dökümhane testi]`
- **C3 — servis uyarısı:** üçüncü-parti döküm servisleri iç içe/hareketli
  parçayı REDDEDEBİLİR (Materialise kuralı: zincir kayıp-mumla yapılmaz,
  parça arası ≥0.3 mm) — UI'da uyarı gösterilir. `[PRATİK]`
- **C4 — duvar/detay minimumları:** SUYOLU D5 tablosu geçerli (genel dış duvar
  0.8 · detay Ø0.35 · parça arası ≥0.3); polisaj kaybı 0.10-0.20 → CAD = hedef
  + pay. `[KANITLI — servis kılavuzları]`
- **C5 — çekme payı:** Au %1.25-1.7 · Ag ~%2 · CAD telafisi başlangıcı +%1-3;
  kesin katsayı test dökümüyle kalibre (SUYOLU D1-D4 aynen). `[KANITLI + KALİBRE]`
- **C6 — geleneksel alternatif:** baklalar tek tek dökülüp elde geçirilir +
  lehimlenir; lehim eklemi yorulmada zayıf halkadır (SUYOLU B8). `[PRATİK]`

---

## 7. GRAMAJ ÇAPALARI (G) — motorun doğrulama noktaları

Motor gramajı GEOMETRİDEN hesaplar (bakla hacmi × N × yoğunluk); aşağıdaki
piyasa değerleri yalnız sanity-check çapasıdır (profil farkı 3-5× oynatır):

- **G1:** 8 mm Miami Küba 14k solid ≈ **1.97 g/cm** (90 g @ 18"). `[TEK —
  danieljewelry]` ← ANA KALİBRASYON ÇAPASI (B1'deki d=W/3.5 bundan).
- **G2:** 4 mm gurmet Ag925 (İtalyan traşlı) ≈ **0.20-0.21 g/cm**. `[TEK —
  metalmastersco, 6 boy iç tutarlı]`
- **G3:** 10 mm gurmet 10k ≈ 1.06 g/cm; 10 mm Miami 10k ≈ 3.0 g/cm →
  **Miami/gurmet ≈ 2.5-3×** (aynı genişlik). `[TEK — milanus]`
- **G4:** 14k curb üretici tablosu (Uverly): 8mm≈0.62 · 10mm≈0.84 · 12mm≈1.31 ·
  14mm≈1.83 g/cm — Miami tablolarının 1/3-1/5'i (profil farkı kanıtı). `[TEK]`
- **G5:** hollow = solid × 0.30-0.50 (6mm 14k örnek: 23.2 vs 59.0 g). `[PRATİK]`
- **G6 — madenler:** SUYOLU M4 yoğunluk kartları aynen (Ag925 10.36 `[KANITLI]`,
  au14 ~13.1, au18 ~15.35, pt950 ~20.7).

---

## 8. KİLİT (v2 — rapor-only şimdilik)

- **K-1:** ≤4 mm → istakoz (lobster); ≥6 mm → **kutu kilit + çift emniyet**
  (Küba standardı). `[PRATİK]`
- **K-2 — Küba kutu kilit serisi** `[TEK — luxususa üretici]`: 6mm→21×6 ·
  8mm→22×8 · 10mm→26×10 · 12mm→27×12 · 14mm→28×14 mm (klips eni = zincir eni).

---

## 9. KALİBRASYON LİSTESİ (atölye doğrulaması)

1. d=W/3.5 katsayısı — Murat'ın hedef gramajına göre (G1 çapası tek kaynak).
2. Traş oranı ↔ görünüm (T2/T4 yayınsız — ZBrush gözüyle).
3. A2 uç tamponu %25 ve A3 tavanı — çekme testi/saha.
4. C2 bakla arası boşluk 0.3-0.5 — kendi dökümhane testi (EN ÖNEMLİSİ:
   baklalar kaynadı mı, döndü mü?).
5. Büküm 90° + yatış 45° kombinasyonunun kendi zincirinde düz yatışı.
6. Ag925 Miami g/cm ölçümü (motor çıktısı vs terazi).

---

## 9-a. SAPORT / TİJ (SP) — Murat, 2026-07-17: "yandan saport veya reçine için alttan"

- **SP1 — çap:** D11 (besleme kesiti bağlantının %70-150'i) → saport çapı =
  **0.9 × tel çapı** (alan ≈ %81), taban 0.8 / tavan 3.0. `[KANITLI D11 + HESAP]`
- **SP2 — konum:** *yandan* (+y, döküm ağacına yatay bağlantı) veya *alttan*
  (−z, reçine baskı desteği). Çubuk baklaya **0.4 gömülür** (dilimleyicide
  kaynar; TELKARI §1.6 gömme mantığı). Boy 2-6 mm (varsayılan 3). `[HESAP]`
- **SP3 — sıklık:** bir atlamalı (varsayılan) / her bakla. Dik dönen baklalara
  (forse/doç/venedik tek indeksler) TAKILMAZ — çubuk yüzeye oturmaz. `[HESAP]`
- **SP4:** saport gramı rapora KATILMAZ (tij dökümde kesilir, geri kazanılır);
  STL'e ayrı gövde olarak gömülü iner. `[PRATİK]`

## 9-b. STİL / DOKU (S) — Murat foto referansı (2026-07-16: "tek modelde kalmamak lazım")

Referans foto 6 stil: parlak dolgun gurmet · faset (diamond-cut) gümüş ·
çekiç/antik gümüş · roz atlamalı dokulu · iki metal panter · kare kesit koyu Küba.

- **S1 — tel kesiti:** yuvarlak (varsayılan) / **kare** (köşe yuvarlatmalı,
  rc=0.2s). Kare kesit ALAN-EŞDEĞER kurulur (alan = πr² — gram ve Pappus
  tahmini yuvarlakla aynı kalır) `[HESAP]`. Köşegen yarıçapı > r → kilitlenme
  zarfı büyür; D4 denetimi gerçek kesitle koşar, taşma orada görünür.
- **S2 — yüzey dokusu (geometriye işlenir, STL'e döker):**
  - *parlak* — düz süpürme (varsayılan).
  - *çekiç (dövme)* — içe basan deterministik çukur alanı; çukur adımı ≈2.6r,
    genlik 0.16r `[KALİBRE — zanaat dokusu, yayın yok]`. Yalnız içe basar →
    zarf büyümez, kendine-kesişme yok.
  - *faset* — az segmentli kesit (10) + halka başına faz oynaması; gerçek
    diamond-cut'ın (T1 patent ailesi) CAD yaklaşığıdır — pas derinliği yerine
    kırık düzlem parıltısı `[HESAP — yaklaşım, dürüst işaret]`. Kare kesitle
    birlikte kullanılmaz (köşe kimliğini bozar).
  - *simli/stardust (foto #4)* — GEOMETRİ DEĞİL yüzey işlemidir (kumlama);
    üretim notu olarak kalır, CAD'de temsil edilmez `[PRATİK]`.
- **S3 — doku deseni:** tümü dokulu / **bir atlamalı** (çift indeks parlak,
  tek indeks dokulu — foto #4 roz örneği). Montajda varyant baklayla çözülür;
  gram, varyant hacimleriyle parite bazında hesaplanır.
- **S4 — iki metal:** bir atlamalı iki metal (foto #5'in bicolor özü);
  önizleme bakla paritesiyle boyanır, METAL BAŞINA AYRI STL iner — üretimde
  iki grup ayrı dökülür, baklalar geçirilip lehimlenir (C6). Gram: parite ×
  yoğunluk. Roz altın kartı: au14r, yoğunluk sarı 14K bandı `[HESAP]`.
- **S5 — v2 adayı:** foto #5'in tam karşılığı (panter/kare-U + bar "fantezi"
  tipi) YENİ TİP gerektirir — torus-süpürme ailesi dışı, ayrı bakla üreteci.

## 10. DERS DEFTERİ (TELKARI.md §7 ritüeli — her turda güncellenir)

- 2026-07-16 (kuruluş turu): **Curb ailesinde TÜM baklalar özdeş ve aynı
  yönlüdür** — büküm uç açılarını kendisi alternate eder (+x ucu +45°, −x ucu
  −45°), komşu uçlar kendiliğinden 90° çaprazlanır. Ayna (z-yansıma) alternansı
  DENENDİ ve BAŞARISIZ (paralel uçlar → 3-13 mm³ çakışma); gerçek curb
  makinesinin tek tip bakla basması bu yüzden.
- 2026-07-16: **Yatış (B6 ±45°) montaj dönüşü DEĞİLDİR** — gövde düz yatar,
  yatışı zaten büküm verir. Tüm baklayı 45° yatırmak traş düzlemini bozdu ve
  çakışma üretti; traş her zaman zincir düzleminde (z) kesilir.
- 2026-07-16: **Usta forumu ölçüleri pres-sonrasıdır** — rijit CAD'e çevirirken
  çapraz geçen telin izdüşümü (d/cosθ) hesaba katılır (B2-CAD). Genel ilke:
  zanaat ölçüsü ≠ CAD ölçüsü; arada deformasyon payı var.
- 2026-07-16: **Miami yoğunluğunda ajur delikleri dışarıdan GÖRÜNMEZ** (%50
  örtüşme komşu baklaları bantların üstüne bindirir) — bu bir hata değil,
  "gizli hafifletme"dir (arkadan kesim gibi); görünür dekoratif ajur isteniyorsa
  seyrek dizilim gerekir. Görünen yüzler uç kıvrımlardır ve A1 gereği zaten
  delinmez. Hafifletme kanıtı hacim farkından raporlanır (−%9 @ Küba 12mm doz 0.7).
- 2026-07-16: Kesit çokgeni daireden küçük kalır → **alan-koruyan yarıçap
  düzeltmesi** (r·√((2π/n)/sin(2π/n))) ile gramaj yansız hale getirildi
  (−%2.7 → ~0 sistematik hata; suyolu/telkari motorlarına da taşınmalı).
- 2026-07-16: Doğrulama çapaları tuttu: Küba 8mm 14k → motor 2.10 g/cm vs
  piyasa 1.97 (G1, %7 — telOran KALİBRE payı içinde) · Küba 12mm Ag925 →
  ~3.4 g/cm vs Uverly ~3.5 (G4 ailesi).
- 2026-07-16 (lint dersi): alan-koruyan yarıçap düzeltmesi yazıldı ama
  KULLANILMAMIŞTI — eslint no-unused-vars yakaladı; "düzeltme eklendi" demek
  yetmez, hacim testi düzeltme SONRASI yeniden koşulmalı (koşuldu: −%0.2).
- 2026-07-17 (Murat: "kareler doğru çalışmıyor… ezbere yaptın" → iki düzeltme):
  (1) büküm KÖŞE BAŞINA açı veriyordu → kare kesit makaslanıyordu; kesit
  başına RİJİT dönüşe alındı (rotasyon x'i korur, halka rijit döner).
  (2) venedik yuvarlak halkaya kare tel giydirilmişti → omurga da KARE
  ÇERÇEVE yapıldı (kareNokta yolu; köşe yayı ≥ d/2 döküm kuralı).
  İLKE: yeni geometri varyantı "parametre değişikliği" ile geçiştirilmez —
  kesit VE omurga gerçek ürün formundan doğrulanır, görsel tur şart.
- 2026-07-17 (aynı tur, sarım dersi tekrarı): saport silindirinin yan yüzü
  kapaklarla ters sarılmıştı — hacim 3× küçük çıktı (divergans testi yakaladı).
  KURAL: her yeni kapalı mesh üreticisine hacim ≈ analitik testi yazılır.
- 2026-07-17 (Murat: "dağınık menü + tüm tipler aktif" → K5 doğdu): sol menü
  gruplu katalog (Baklalı/Örme/Boru), sağ panel numaralı akış kartları
  (1·Ölçüler 2·Stil&Doku 3·Maden). Örme/boru tipleri masif yorumla aktive
  edildi — "yapılamaz" yerine "dürüst yorum + rozet" ilkesi. TEKNİK DERS:
  süpürme uç kapaklarının sarımı duvar kenarlarıyla ZIT gezinmeli (manifold
  şartı) — halat ilk kurulumda NotManifold verdi, kapak yönü düzeltildi.
- 2026-07-16 (Murat ilk eleştirisi → B8 doğdu): "model harika ama KALIN —
  altın maliyeti/satış fiyatı; gramaj kullanıcı tercihine bırakılmalı."
  İLKE: dolu (solid) hal varsayılan ÜST sınırdır, alıcıya sunulan ürünse
  gram/maliyet dengesidir — her zincir tipinde metal dozu (tel çapı) slider
  ile kullanıcıda, anlık gram tahmini yanında. Genişlik (görünüm) ile tel
  (metal) ayrıştırıldı; eski tek-parametreli model iptal.

## 11. KAYNAKÇA (ana)

Patent/akademik: **US2140491** (non-kink curb, 1938) · US628439 (curb makinesi
1899) · US5797258/US5408820/US5605038 (diamond-cut) · US4651517 (hollow rope) ·
**Tang-Coros-Thomaszewski SIGGRAPH/TOG 2023** "Beyond Chainmail: Computational
Modeling of Discrete Interlocking Materials" · MDPI Metals 15:1263 (perfore
kabuk) · ScienceDirect perfore levha eşdeğer sabitler · mooring zinciri yorulma
FEA ailesi (ScienceDirect + JMSE 12:131) · slat conveyor link FEA (ResearchGate).
Pratik: Ganoksin (hollow carat gold; usta forumu bakla ölçüleri — JonathanE,
Revere/Shneyer) · Materialise/Shapeways/Formlabs döküm kılavuzları · Santa Fe
Symposium (Bell 2012 hollow) · ProtoSpeed cuban 3D print kılavuzu · FlashForge
WaxJet vaka · zlosk.com AR ölçüm tablosu · M.A.I.L. · Uverly/Milanus/Daniel
Jewelry/MetalMasters ağırlık tabloları · goldzenn/frostnyc/6ixice boyut
kılavuzları · midas.com.tr/alexmakina/bilezikci/gumush (TR terimler).
Tam URL'ler: 3 araştırma raporu (oturum 2026-07-16).
