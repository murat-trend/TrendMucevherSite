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
- Modeller: `kelebekOzgun.ts` (ANA ÖRNEK — tüm kurallar uygulanmış),
  `telkari.ts` (damla), `telkariArabesk.ts`, `telkariKelebek.ts` (foto
  kopya, arşiv/ibret)
- Sayfa: `app/(site)/remaura/geometri` · Testler: `scripts/geo_*.ts` (tsx)
- Koç araçları: `scripts/coach_extract_outline.py` (foto→silüet, doku
  kapılı) — ileride "kullanıcı foto yükler→temizlenir" ürün özelliğinin çekirdeği

## 6. YAPILACAKLAR SIRASI (2026-07-14 durumu)

1. Ucuz estetik turu: fisto picot + kuyruk ucu boncuğu + apex kıvrımı +
   odak/kademe ayarı (Murat komutu bekleniyor)
2. Kanat bombesi (z-dome haritası)
3. Burgu tel dokusu (helis süpürme)
4. Boolean birleşim (manifold-3d): tek gövde STL + gerçek gramaj
5. Yassı şerit tel (dikdörtgen profil süpürme)
6. Taş yuvası primitifi (opsiyon)

## 7. DİL NOTU

Murat "mikron" derken kuyumcu dilini kullanır: **N mikron = N/100 mm**
(30 mikron = 0.30mm). UI'da mm + "kuyumcu mikronu" birlikte gösterilir;
bilimsel µm sadece hassasiyet raporunda.
