# KILIT.md — Kilit Kural Kütüphanesi (v1)

Bu dosya, kilit aracının TEK kural kaynağıdır ("Jewelry Design Rules Engine"
ailesinin üçüncü kümesi — SUYOLU.md, ZINCIR.md kardeşi). KİLİT AYRI BİR İŞTİR:
tüm kod lib/remaura/kilit/, sayfa app/(site)/remaura/kilit/ altında yaşar.
Kaynak: 1 odaklı araştırma raporu (2026-07-17): Ganoksin kutu kilit reçeteleri
(Brepohl + Box Clasp Fabrication tam ölçülü) · patentler (US4881305 kilit
mekanizması, US4314389, US5309616/US5231740 lehimsiz dil) · Orchid toggle
matematiği · istakoz/mıknatıs komponent tabloları. Zincir bağı: ZINCIR.md §8
Küba kutu kilit serisi (iç standart).

İLKE: **keyfi sayı yok.** Etiketler: `[KANITLI]` patent/standart ·
`[PRATİK]` çoklu sektör kaynağı · `[TEK]` tek kaynak · `[HESAP]` türetilmiş ·
`[KALİBRE]` kaynak yok — atölye/prototip doğrulaması.
Kural kimlikleri: KK=kutu kilit, TG=toggle, KN=kanca, HZ=hazır komponent,
MB=mıknatıs, GE=genel/eşleşme.

---

## 0. ÜRETİM GERÇEĞİ HARİTASI (hangi parça nasıl üretilir)

| Parça | Üretim | Dayanak |
|---|---|---|
| Kutu gövde (duvarlar + uç plaka + dekor üst) | **DÖKÜM** | `[PRATİK]` |
| **Dil (V-yay)** | **HADDE SAC — DÖKÜLMEZ.** Döküm/tavlı metal yay tutmaz; lehim tavı bile yayı öldürür → sert sacdan bük, lehimsiz (lazer/punta) monte | `[PRATİK — Orchid çok kaynak + US5309616 ailesi]` |
| Buton bloğu | döküm veya sac, dile kaynak | `[TEK — Ganoksin]` |
| Sekiz emniyeti: tüp yatak + bilye | döküm (gövdeye); sekiz halkası TEL | `[PRATİK]` |
| Toggle bar + halka, kanca | **DÖKÜM olur** (yay yok; kancada hadde tel tercih) | `[PRATİK]` |
| İstakoz, yaylı halka | **HAZIR SATIN AL** (iç çelik sarmal yay — dökülemez) | `[PRATİK]` |
| Mıknatıs | ASLA dökülmez (NdFeB Curie ~310-340°C, çalışma ≤80°C; döküm >900°C) — yuva dökülür, mıknatıs sonradan yapıştırılır | `[KANITLI fizik]` |

Araç bu haritayı UI'da rozetle gösterir: "döküm" / "sac — referans model" /
"hazır alınır".

---

## 1. KUTU KİLİT (KK) — Küba/gurmet standardı

### 1.1 Kutu gövde
- **KK1 — dış ölçü (zincir genişliği w'den):** genişlik = w (zincirle hizalı);
  boy **L ≈ 18 + 0.75·w** — ZINCIR.md K-2 serisine ±1 mm oturur (6→21×6 …
  14→28×14). `[HESAP — seri uyumlu; seri TEK/iç standart]`
- **KK2 — duvar sacı:** **0.5 mm** (w<8) / **0.7 mm** (w≥8, erkek sınıfı).
  `[PRATİK — Brepohl + Fabrication]`
- **KK3 — iç yükseklik:** dil serbest yaylanmalı → iç H ≈ **2.75 × katlı dil
  kalınlığı** (2.5-3 bandı ortası). `[PRATİK ilke + HESAP sayı]`
- **KK4 — üst buton penceresi:** genişlik = buton + 0.2; boy = buton + basma
  stroku; pencerenin **ARKA kenarı DİK** (kilit yüzeyi — rampa dilde, çıkışta
  dik dudak; US4881305 mekanizması). `[KANITLI ilke / KALİBRE sayı]`
- **KK5 — giriş yuvası (ön):** yükseklik = katlı dil + **0.05-0.1**, en =
  dil eni + **0.1**. `[TEK + HESAP]`

### 1.2 Dil (sac — referans model)
- **KK6 — sac kalınlığı:** **0.4 mm** (w<8) / **0.7 mm** (w≥8) — boyutla
  ölçeklenir. `[PRATİK 0.4 + TEK 0.7 + HESAP köprü]`
- **KK7 — dil boyu ≈ kutu iç derinliği** (tırnak pencere arka kenarına
  oturur); dil eni = kutu iç eni − 0.2. `[PRATİK]`
- **KK8 — V serbest açıklığı:** giriş yuvasının **1.5-2×**'i (takarken
  sıkışır); derece kaynağı YOK — tipik V tepe açısı ~8-15°. `[HESAP — KALİBRE]`
- **KK9 — buton (detent):** 10 mm sınıfında **2×3 mm blok, çentik 0.7,
  taşma 0.7, toplam H 3** — w ile oransal ölçeklenir (×w/10). `[TEK — Ganoksin]`
- **KK10 — kalite sesi:** doğru kilit "duyulur klik" verir. `[PRATİK]`

### 1.3 Emniyet
- **KK11 — sekiz emniyeti:** w≥6 → 1 adet, w≥10 → 2 adet (piyasa pratiği).
  Hazır boylar: 10×2.75, 11.5×2.75, 12.5×3, 12.5×4 mm; tel ~0.8-1.0.
  Tüp yatak + bilye gövdeye dökülür, sekiz teli ayrı. `[PRATİK]`
- **KK12 — tutma kuvveti:** ASTM F2999 clasp-tension eşiği ücretli standartta
  — sayı YOK `[KALİBRE]`. Pratik bant: takma-çıkarma 5-20N parmak kuvveti;
  kaza yükünü sekiz emniyeti alır. `[HESAP]`

## 2. TOGGLE (TG)

- **TG1 — ANA KURAL: bar boyu ≥ 2.0 × halka iç çapı; güvenli 2.2-2.5×**
  (barın yarısı halkadan geçmeli; kısa bar düşürür). `[PRATİK — Orchid
  Toggle Math + WireJewelry]`
- **TG2 — teller:** halka teli = zincir teli, min **1.4**; bar teli =
  halka × 1.2-1.4, min **1.9**. `[TEK — piyasa örneği + HESAP]`
- **TG3 — kullanım:** ağır kolyede uygun (yerçekimi barı dik tutar); GEVŞEK
  bileklikte riskli — UI uyarısı. `[PRATİK]`
- **TG4:** tamamı dökülür (yay yok). `[PRATİK]`

## 3. KANCA (KN — S/çoban kancası)

- **KN1:** kanca GERİLİM altında çalışır (zincir çekişi kapalı tutar);
  serbest kullanımda emniyetsiz — ağır parçada tek başına KULLANMA. `[PRATİK
  — Brepohl]`
- **KN2 — ölçüler:** tel = zincir teli × **1.2-1.5**, min 1.0; iç yarıçap ≥
  **2×tel**; ağız açıklığı = karşı halka teli + **0.3**. `[HESAP — KALİBRE]`
- **KN3:** döküm olur; gerilimli kancada hadde tel + çekiç sertleştirme
  tercih. `[PRATİK]`

## 4. HAZIR KOMPONENTLER (HZ) — dökülmez, satın alınır

- **HZ1 — istakoz boy tablosu** `[PRATİK]`: 9-10mm→≤2mm zincir ·
  12mm→2-4mm · 15mm→4-6mm · 21mm→6-8mm · 30mm→çok ağır.
- **HZ2 — yaylı halka:** istakozdan zayıf; yalnız hafif kolye (5-11mm boylar).

## 5. MIKNATIS (MB) — v2 adayı

- **MB1:** yuva dökülür, NdFeB sonradan yapıştırılır (Curie). `[KANITLI]`
- **MB2:** tipik 5×5 / 6×5 / 7×7 / 8×6 mm silindir; 4.8mm çap ≈ 6.4N çekme;
  kolye için min ~3N. `[PRATİK]`
- **MB3:** ağır bileklikte TEK BAŞINA ASLA (darbe/çekme + ferröz yapışma);
  kalp piline 3 cm uyarısı. `[PRATİK]`

## 6. EŞLEŞME (GE) — zincir → kilit seçimi

- **GE1:** ≤4 mm zincir → istakoz (hazır) · 4-6 mm → büyük istakoz VEYA kutu ·
  **≥6 mm → kutu kilit + sekiz emniyeti** (≥10 mm çift sekiz). `[PRATİK]`
- **GE2:** kutu kilit ölçüsü ZINCIR.md K-2 serisinden / KK1 formülünden.

## 7. KALİBRASYON LİSTESİ

1. Dil V serbest açıklık oranı (1.5-2×) + klik hissi — sac prototip + el testi.
2. Buton pencere stroku ve dik dudak teması — ilk döküm + sac dil montajı.
3. ASTM F2999 tutma eşiği (standart satın alınırsa).
4. Kanca ağız açıklığı (+0.3) saha testi.
5. KK1 boy formülünün 6-14 mm dışına ekstrapolasyonu.

## 8. DERS DEFTERİ

- 2026-07-17 (kuruluş): zincir aracının TÜM dersleri baştan uygulandı — mat
  viewer varsayılan, tip değişiminde oto-üretim + izolasyon, hacim≈analitik
  testleri, kural-önce (motor rapor gelmeden yazılmadı).

## 9. KAYNAKÇA

Ganoksin: Box Clasp Fabrication (tam ölçülü reçete) · Chain & Bracelet
Catches 1-2 (Brepohl) · Install Figure-8 Catch · Orchid: Rehardening clasp
tongue (dil dökülmez kanıtı), Toggle Clasp Math. Patentler: US4881305 (kilit
mekanizması), US4314389, US5309616/US5231740 (lehimsiz dil = yay korunur).
ASTM F2999 (eşik ücretli). K&J Magnetics / first4magnets / Superior Magnetics
(mıknatıs). CalFindings (sekiz). Tedarikçi istakoz tabloları. Tam URL'ler
araştırma raporunda (oturum 2026-07-17).
