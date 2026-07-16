# TELKARI.md — Telkari Tasarım Anayasası

Bu dosya, geometri çekirdeğiyle telkari tasarlarken uyulacak kuralların ve
öğrenilmiş derslerin TEK kaynağıdır. Yeni bir telkari tasarımına başlamadan
önce OKU (Murat'ın talimatı, 2026-07-14: "her seferinde hatırlaman için").
Kaynak: kelebek/arabesk/damla oturumları (2026-07-13/14) — Murat'ın kuyumcu
eleştirileri + hakem ajanı raporları + görsel iterasyon dersleri.

## 1. ÜRETİLEBİLİRLİK KURALLARI (pazarlık yok — telkari fizik işidir)

1. **Yerçekimi kanunu:** Havada duran motif YASAK. Her motif (spiral, halka,
   ilmek) en az İKİ noktadan komşusuna/çerçeveye lehim temasında olmalı.
   - Spiral: yakın kenarlara hafif gömül (r = mesafe − 0.2·telYarıçapı) +
     dış ucundan en uzak köşeye **lehim kuyruğu** çek.
   - İç içe halkalar: aralarına **bağlantı boncukları** (halka çifti başına
     ≥3 gömülü küre) — hem yasal hem inci görünümü bonus.
2. **Kesişme yasak:** Teller birbirinin İÇİNDEN geçemez (bilinçli lehim
   gömmesi hariç). Spiral yerleşimi körlemesine centroid'e DEĞİL, hücre
   içinde tüm kenar+deliklere en uzak noktaya (grid araması) yapılır;
   yarıçap o mesafeyi aşamaz → çakışma yapısal olarak imkânsız olur.
3. **Kırılgan uçlar güçlendirilir:** kuyruk/anten gibi ince konsol uçlara
   boncuk/topuz koy (hem estetik hem mukavemet).
4. **Askı gerçeği:** Geniş parça tek noktadan asılırsa yalpalar → simetrik
   İKİ gizli askı halkası (kordon geçecek yönde delik ekseni). Baş/anten
   gibi ince elemanlar yük TAŞIYAMAZ.
5. **Boşluk göze hitap etmeli:** yapısal boşluklar (kanat zarı gibi) boş
   bırakılmaz — ince, farklı açılı kafes zar gerilir.
6. **Temas = gömme, teğet değil:** parçalar birbirine çapın %10-15'i kadar
   (≈50-100µm) kasıtlı gömülür — hem boolean union sağlam olur hem "lehim
   boynu" kalınlaşır (teğet temas union'da kum saati boynu = kopma noktası).
   [Araştırma sentezi 2026-07-14; oran mühendislik önerisi, kalibre edilebilir]
7. **Bombe OMURGAYA uygulanır, mesh'e değil:** 2D omurga noktaları jeodezik
   polar haritayla küreye taşınır, süpürme haritalanmış omurga üzerinde koşar
   — tel kesiti dairesel ve mikron-sabit kalır (Rhino FlowAlongSrf mantığı).
   Z-displacement yasak (kesit yatırır).
8. **Otantik burgu = burgu + YASSILAŞTIRMA:** gerçek telkari teli iki ince
   telin burulup haddeden geçirilmesidir; burgu dokusuna flatten (eliptik
   profil) parametresi eşlik etmeli. Pitch ≈ 2.5-4 × toplam çap.
9. **Tel çapı malzeme özelliğidir (Murat, 2026-07-14):** parça ölçeklenince
   omurga ölçeklenir, tel çapı SABİT kalır — kuyumcu teli çeker, şişirmez.
   Düzenleme sonrası "ölçüleri standarda döndür" her zaman mümkün olmalı.
10. **Spiral = SIKI sarımlı GÖZ, gevşek kangal değil (2026-07-16 suyolu dersi):**
   tur sayısı yarıçaptan TÜRER (tur aralığı ≈ 2.45·telYarıçapı — komşu turlar
   lehim temasında, kendine-lehim yapıyı taşır), tur sayısı ≤6 ile merkez AÇIK
   bırakılır (disk değil göz okunur, ışık geçer, gram düşer). Gevşek kangalın
   iç turları desteksiz yaydır — kırılganlık analizi 195 L/d ile yakaladı.
11. **Kavisli form (bileklik/yüzük) = düz bantta tasarla, omurgayı silindire
   sar (bend.ts):** §1.7'nin bant hali — x yay uzunluğu, y eksenel, z radyal;
   sarmadan önce kiriş sapması toleransı için yoğunlaştır (s ≤ √(8·R·tol)).
   Tel kesiti mikron-sabit kalır; iç çevre sözü tel İÇ YÜZEYİNDEN verilir
   (omurga yarıçapı = Rin + telYarıçapı).

## 2. TEL HİYERARŞİSİ (çerçeve=1.00 bazlı, koç analizi standardı)

| Kademe | Rol | Oran |
|---|---|---|
| T0 | Dış çerçeve (ideal: yassı şerit — motor henüz yuvarlak) | 1.00 |
| T1 | İç bölme/damar/omurga + astar | 0.73 |
| T2 | Dolgu (spiral, ilmek, iç halka) | ~0.55 (kullanıcı) |
| T3 | Kafes telleri | 0.3 (veya 0.6·T2) |

**Astar (liner) kuralı:** Her T0 çerçevenin iç yüzüne paralel T1 astar tel
(çift-hat görünümü) — klasik telkari imzası.

## 3. ESTETİK İLKELER (2026-07-14 tasarım değerlendirmesi — Murat onayladı)

1. **Odak hiyerarşisi:** Her yer eşit yoğunlukta OLMASIN — kompozisyonun
   kahramanı olsun (göz motifi, merkez çiçek...). Motif boyları akış
   yönünde KADEMELİ (gövdeden kenara büyük→küçük).
2. **Fisto picot:** Kenar fisto düğümlerine minik boncuk dizisi (çiy
   damlası) — kenarı "bitmiş" gösterir, en ucuz en telkari jest.
3. **Uç jesti:** Formun karakter noktasına (kanat apex'i gibi) sıradan
   dolgu değil, oraya AKAN tek zarif kıvrım.
4. **Bombe:** Ölü-düz levha yapma — hafif kubbe/kıvrım (~1.5-2mm) ışığı
   yakalar, "kesilmiş sac" değil "canlı form" okutur. (Motor: z-dome, yapılacak)
5. **Doku kontrastı:** düz çerçeve + BURGULU dolgu teli telkari'nin ruhu.
   (Motor: burgu süpürme, yapılacak — büyük görsel sıçrama)
6. **Kafes çeşitlemesi:** tüm kafesler aynı açı/sıklıkta olmasın (zar 0°,
   hücreler 45° gibi) — göz yorulmasın.
7. **Dolu/boş ritmi:** karışık dolguda boş hücredeki tek cılız spiral
   dengesizlik üretir; ya ikinci mini kıvrım ya seyrek kafes yaması.

## 4. TASARIM SÜRECİ (kanıtlanmış akış)

1. **Özgün tasarım > foto kopyası.** AI-render fotoğrafını koordinat
   koordinat kopyalama DENENDİ ve BAŞARISIZ (tutarsız detaylar, yanlış
   okuma). Doğrusu: konunun ANATOMİSİNDEN tasarla — kelebekte gerçek kanat
   damar sistemi telkari iskeletinin ta kendisi. Doğal yapı = bölme planı.
2. **Reçete önce:** bölgeler, tel kademeleri, motif envanteri, temas
   haritası yazılır; kod reçeteden çizer (koordinatlar normalize [-0.5,0.5]).
3. **Hakem döngüsü:** render'ı dosyaya al (snap_server trick) → bağımsız
   hakem ajanına puanlat (anatomi/benzerlik ×10 + telkari kalitesi ×10 +
   öncelik sıralı somut düzeltme listesi) → uygula → tekrar.
4. **Murat final gözü:** STL'i ZBrush'ta kendisi inceler; onun eleştirisi
   hakem raporundan üstündür.
5. **Mikron sözü her adımda:** her üretilen mesh geri-ölçülür (measure.ts);
   kapalı-manifold şartı; segment sayıları toleranstan türer, keyfi sayı yok.

## 5. MOTOR ENVANTERİ (lib/remaura/geo/)

- `units.ts` — mm/µm, adlandırılmış toleranslar (çıplak tolerans yasak)
- `vec3.ts` `curves.ts` — smoothChain/smoothLoop (Catmull-Rom), joinLoop,
  mirrorX, spiralFn
- `wire.ts` — tolerans-güdümlü tel süpürme + adaptif örnekleme
- `fill.ts` — latticeFill (kafes, delik destekli), insetLoops, pointInPoly
- `granule.ts` — küre (boncuk/inci) + latheMesh (torna: damla, gövde boğumu)
- `measure.ts` — geri ölçüm + manifold denetimi; `stl.ts` — ikili STL
- `bend.ts` — silindir sarma (bileklik/yüzük; form omurgaya, kesit sabit)
- Modeller: `kelebekOzgun.ts` (ANA ÖRNEK — tüm kurallar uygulanmış),
  `suyoluBileklik.ts` (bilezik; kavisli bant + burma omurga + göz/kafes dama),
  `telkari.ts` (damla), `telkariArabesk.ts`, `telkariKelebek.ts` (foto
  kopya, arşiv/ibret)
- Sayfa: `app/(site)/remaura/geometri` · Testler: `scripts/geo_*.ts` (tsx)
- Koç araçları: `scripts/coach_extract_outline.py` (foto→silüet, doku
  kapılı) — ileride "kullanıcı foto yükler→temizlenir" ürün özelliğinin çekirdeği

## 6. YAPILACAKLAR SIRASI

AYRINTILI PLAN → **YOL-HARITASI.md** (4 ajanlık araştırma sentezi, 2026-07-14):
Faz 1 (kolay+etkili): döküm kural motoru+kırılganlık skoru · burgu tel
(+yassılaştırma) · union ağacı+gömme kuralı. Faz 2: reçete v2 + parça editörü
(seç/taşı/motif değiştir) · bombe (omurga-seviyesi) · SVG içe aktarma.
Faz 3: SVG çizim penceresi (paper.js) · otomatik dolgu ailesi (Wong/Fermat/
Zehnder) · stabilite budama. + bekleyen ucuz estetik turu (fisto picot,
kuyruk boncuğu, apex kıvrımı, kademe ayarı) ve yassı şerit tel, taş yuvası.

## 7. DERS DEFTERİ RİTÜELİ (Murat'ın kuralı, 2026-07-14)

**Her model üretiminden/iterasyonundan sonra bu dosya GÜNCELLENİR** — atölye
kendi işinden öğrenir. Üç soru sorulur ve cevaplar ilgili bölüme işlenir:
1. Bu turda hangi kural ihlali/eksiği yakalandı? → §1 (üretilebilirlik) veya
   §3'e (estetik) kural olarak ekle.
2. Murat'ın eleştirisi neydi, hangi genel ilkeye işaret ediyor? → tek seferlik
   düzeltme değil, İLKE olarak yaz (örn. "boncuklar bağlasın" değil
   "yerçekimi kanunu").
3. Hakem/koç ne yakaladı, biz niye kaçırdık? → süreç dersi ise §4'e.
Tarihli kısa girişler aşağıya da düşülür (son 10 tutulur, eskisi ilkelere erir):
- 2026-07-13: foto kopyası başarısız → anatomiden tasarla (§4.1 doğdu)
- 2026-07-13: hakem "havada spiral üretilemez" → yerçekimi kanunu (§1.1)
- 2026-07-14: Murat "iç içe halkalar bağlantısız / zar boşluğu / kesişme" →
  §1.1 boncuk, §1.5 zar, §1.2 grid-arama doğdu
- 2026-07-14: tasarım değerlendirmesi → §3 estetik ilkeleri (Murat onayladı)
- 2026-07-14 (Faz 1): analiz örneklemesi SEYRELTME değil YENİDEN örnekleme
  olmalı — 2 noktalı düz tel ara nokta almazsa temaslar görünmez (bug yakalandı)
- 2026-07-14 (Faz 1): burgu damarı döküm çap kuralında TEK başına değil
  KOMPOZİT çapıyla değerlendirilir (ikili burgu ≈ toplam çapta tek tel gibi
  dökülür) — AnalyzeWire.diaMm ayrımı bunun için var
- 2026-07-14 (kategori düzeltmesi): "kategori ekleyelim" isteğini MODEL
  DÖNÜŞÜMÜ olarak yorumladım (küpe=kanca ekle vs.) — Murat SAF SEÇİM/yer
  hazırlığı istemişti. DERS: yapısal yeni boyut isteklerinde niyeti tek
  cümleyle TEYİT ET (ucuz), varsayımla kurma (pahalı). Donanım kodu pasifte
  (kategori.ts), kategori modelleri gelince eklenti olarak dönebilir.
- 2026-07-14 (doku turu): ÇARŞI DİLİ esastır — "burma" (burgu değil), "boncuk
  tel" (miligren=döküm sonrası çark işi, güherse=ayrık tane dizme; İKİSİ DE
  boncuk tel değildir), "dalgalı/zikzak". Doku seti: düz/burma/yassı burma/
  çift burma S+Z/örgü/boncuk/sarma(kazaziye)/dalgalı. Güherse (yüzeye tane
  serpme) ileride AYRI özellik adayı. Kaynak: İKO sözlüğü + Midyat/Sardis.
- 2026-07-16 (suyolu bileklik): gevşek kangal spiral kırılganlık analizinde
  patladı (L/d 195) → §1.10 doğdu (sıkı sarım + açık merkez göz); analyze.ts'e
  KENDİNE-LEHİM desteği eklendi (aynı telin yay-uzak/uzay-yakın noktaları
  destek; kapalı halkada kapalı — yüzen halka hâlâ havada sayılır).
- 2026-07-16 (hakem turu, suyolu): omurga çıplak düz telken kafesin içinde
  eriyordu → AKAN ÇİZGİ BURMA yapıldı (§3.5'in kanıtı: doku kontrastı tek
  hamlede "gerçek telkari" okutur). Lehim kuyruğu rastgele köşeye değil
  ANLAMLI hedefe gider (göz→omurga + göz→astar çift bağ çubuğu — "göz akan
  çizgiden doğar"). Picot SEYREK değil DÜZENLİ seri olmalı (her yarım periyot,
  iki rayda hizalı). Dama paritesi ZORLANIR (komşu hücre asla aynı dolgu).
- 2026-07-16 (hakem, meander): mazgal omurga "panelli kutu dizisi" okunuyor —
  gerçek meander SÜREKLİ anahtar-çizgidir (kanca kıvrımlı); anahtar-çizgi
  üreteci yapılana kadar meander ikinci sınıf varyant. Karar Murat'ta.

## 8. DİL NOTU

Murat "mikron" derken kuyumcu dilini kullanır: **N mikron = N/100 mm**
(30 mikron = 0.30mm). UI'da mm + "kuyumcu mikronu" birlikte gösterilir;
bilimsel µm sadece hassasiyet raporunda.
