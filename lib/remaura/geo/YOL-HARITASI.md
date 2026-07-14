# YOL-HARITASI.md — Geometri Çekirdeği Büyüme Planı

Kaynak: 4 bağımsız araştırma ajanı sentezi (2026-07-14; Murat'ın istek listesi:
tel örgü dokusu, parça seç/taşı/ölçekle/motif değiştir, segment+kırılma önleme,
bombe, SVG yükleme+çizim penceresi). TELKARI.md tasarım anayasasıdır; bu dosya
İNŞAAT sırasıdır. Her madde: ne, neden, zorluk, dayanak.

## MİMARİ TEMEL — Reçete v2 (her şeyin altındaki tek karar)

Belge = düz parça deposu + deterministik üretici (tldraw belge modeli +
OpenSCAD üretim modeli; feature-tree DEĞİL — kırılgan referans zinciri bize
gereksiz). Mesh asla doğruluk kaynağı değildir; doğruluk = reçete JSON.

```ts
Recipe { version, units:'mm', globals:{...}, cells: Cell[], parts: PartSpec[], joints: Joint[] }
PartSpec {
  id,                                  // stabil kimlik — asla değişmez
  motif: { type, params },             // DOLDURUCU (değiştirilebilir)
  placement: { cellId?, boundary?, anchors? }, // SLOT (motiften bağımsız bağlam)
  transform: { position, rotation, scale },    // kullanıcı düzenlemesi
  meta: { region?, locked?, label? },
}
Joint { a, b, points, kind:'solder'|'frame'|'wrap' }  // lehim/temas grafı
```

- **Slot+doldurucu ayrımı** motif değiştirmenin güvencesi: tip değişir,
  placement/id/joints kalır. Her motif builder'ı aynı imzayı almak ZORUNDA:
  `build(placement, params) -> geometry`.
- **Joints grafı** üç işe birden yarar: hücre-tıkla-grup-seç, taşıma sonrası
  "lehim koptu" uyarısı, union öncesi bağlılık denetimi (havada parça testi).
- Üretici kod joints'i ZATEN biliyor (spiral kuyruğu nereye değiyor) — üretim
  anında açıkça yaz, proximity hesabını sadece taşıma-sonrası doğrulamada kullan.
- Parça-bazlı memoization: hash(motif+placement) -> geometry cache; transform
  geometriye pişirilmez (Object3D'ye uygulanır) — düzenleme bedava.
- Undo: SNAPSHOT tabanlı (reçete KB mertebesinde) — gesture sınırında push
  (pointerup/slider release), redo yeni push'ta temizlenir. Command pattern'e
  gerek yok.

## FAZ 1 — KOLAY + YÜKSEK ETKİ (sıradaki inşaat)

### 1.1 Döküm kural motoru + kırılganlık skoru (Murat'ın "segment" sezgisi)
Tel başına anlık analiz (tarayıcıda ms): kesit sabiti kapalı form (I=πr⁴/4,
Umetani-Schmidt kesit yaklaşımı) + desteksiz açıklık L (en yakın iki temas
arası) → L/d oranı eşik aşarsa sarı/kırmızı vurgu. Eşikler: Ag925 dolgu teli
<0.6mm uyarı / <0.5mm hata; çerçeve ≥0.8mm; L/d > ~20 uyarı.
DÜRÜST NOT: L/d eşiği için hakemli yayın YOK (dört ajan da aradı) — zanaat
gözlemi ~10-30 aralığı; Murat'ın kendi döküm sonuçlarıyla KALİBRE edilecek
(üretim-pipeline "keyfi sayı yok" ilkesine istisna değil: deneysel kalibrasyon
da kaynaktır, kaynağı yazılır). Dayanak: Formlabs/Materialise döküm kılavuzları,
Umetani&Schmidt 2013, Zhou 2013 worst-case.

### 1.2 Burgu tel (Murat'ın "tel örgü"sü — telkarinin kimliği)
Her damar = omurga + döner ofset: strand_i(s) = C(s) + a·[cos(φ_i+2πs/P)·N +
sin(...)·B]. s = YAY UZUNLUĞU (t değil!). Paralel-taşıma çerçevemiz işin zor
kısmını zaten çözüyor — RMF şart, Frenet yasak. 2 damar = aynı süpürme φ=0 ve
φ=π ile iki kez. Pitch: P ≈ 2.5-4×toplam çap (sıkı burgu ~40-45° helis açısı;
türetilmiş tahmin, slider 1.5×D-8×D).
ÖNEMLİ OTANTİKLİK DERSİ: gerçek telkari teli burgu + YASSILAŞTIRMADIR
(haddeden geçer) → "flatten" parametresi (eliptik profil) şart.
Örgü (3+ damar): radyal salınım ekle a(s)=a0+a1·cos(k·θ) — görsel yaklaşım,
döküm STL'de union kaynaştırır. Mesh yükü: halka aralığı ≤ P/16; LOD/normal-map
ancak yük gerçek soruna dönüşürse (premature yapma).

### 1.3 Boolean union — tek gövde STL + gerçek gramaj
manifold-3d: bbox-tabanlı ikili union ağacı (yakın/küçük önce), her ara
Manifold'a delete() (WASM GC yok — sızıntı!). Union yalnız dışa aktarım/
gramaj/analiz anında; düzenleme sırasında parçalar AYRI kalır (undo bedava).
TEMAS KURALI (yeni anayasa maddesi): teğet temas yasak — kasıtlı gömme
(çapın %10-15'i, ~50-100µm): hem boolean sağlam hem "lehim boynu" kalın.
Union sonrası bbox/çap regresyon ölçümü teste eklenir (mikron sözü).

## FAZ 2 — ORTA (editörleşme)

### 2.1 Parça editörü (seç/taşı/ölçekle/döndür)
Raycast (pointerdown; tüp geometrilerine three-mesh-bvh, firstHitOnly) →
userData.partId → EMISSIVE vurgu (#b76e79; OutlinePass'a girme) →
TransformControls (yerleşik; dragging-changed'de OrbitControls kilidi;
mouseUp'ta reçeteye commit + snapshot + joint mesafe denetimi → "lehim koptu"
rozeti). Granül dizileri: InstancedMesh + instanceId picking (ileride).
**Z-KATMAN (Murat, 2026-07-14):** iş akışı "önce zemin, sonra parçalar üste/
alta" — seçili parçayı z'de adımlı taşıma (Üste Al / Alta Al; adım ≈ tel çapı)
+ katmanlar arası temas/lehim denetimi. Planar telkariye derinlik katmanı.
**TEL ÇAPI DEĞİŞMEZLİĞİ (Murat, 2026-07-14):** parça ölçeklenince OMURGA
ölçeklenir, tel çapı SABİT kalır — çap malzeme özelliğidir (kuyumcu teli
çeker, şişirmez). + "Ölçüleri standarda döndür" düğmesi (çapları reçete
varsayılanına sıfırlar). Reçete v2'de scale yalnız placement'a uygulanır.

### 2.2 Motif değiştirme (retarget)
Seçili parça → motif paleti → motif.type değişir, ortak parametreler
(telÇapı/yoğunluk/yön) TAŞINIR, tip-özel olanlar varsayılana döner;
placement/id/joints sabit → tek parça rebuild → joint temas doğrulaması.
Şekil uydurma merdiveni: v1 bbox-fit → v2 FFD latis → v3 2D Green coordinates
(cage: motif CP'leri hedef hücre sınırına akar, tel çapı sabit kalır).
**PROMPT-İLE-MOTİF (Murat, 2026-07-14 — "spirali seç, 'gül' yaz, güle
evrilsin"):** seçili parça varken komut alanı motif adına da bakar → motif
kütüphanesinde eşleşme varsa retarget o motife (v1: kütüphane eşleşmesi —
spiral/s-scroll/gül/yaprak/rumi...; v2: kütüphanede olmayan isim → AI motif
üretimi: isimden 2D eğri seti üret, placement'a otur). Komut alanı + editör
+ retarget'in evliliği — "başka bir dünya kapısı".

### 2.3 Bombe (doming)
MESH'E DEĞİL OMURGAYA uygula, sonra süpür (tel kesiti dairesel ve mikron-sabit
kalır) — Rhino FlowAlongSrf mantığı. Harita: jeodezik polar (azimuthal
equidistant): (r,φ) → R·(sin(r/R)cosφ, sin(r/R)sinφ, cos(r/R)) — radyal
uzunluklar TAM korunur, çevresel kısalma sığ bombede %1-3. Z-displacement
KURMA (kesit yatıyor). Haritalama sonrası: yeniden örnekle (eğrilik arttı) +
uzunluk delta raporu (µm) + komşu omurga min-mesafe < 2r ise üst-üste-binme
uyarısı. Derin bombe uyarısı: çevresel büzülme teller arası binme yaratır
(zanaatte de dapping hafif deforme eder — biraz bozulma otantik).

### 2.4 SVG içe aktarma v1
Parser: three.js SVGLoader (bedava: tüm öğeler + transform zinciri + use/defs
+ CSS) → ShapePath curve'leri korunur → KENDİ adaptif flattening'imiz
(flatness testi, tolerans mm, ~0.05mm default; getPoints(N) sabit bölme —
KULLANMA) → arc-length yeniden örnekleme.
SEMANTİK SÖZLEŞME: stroke'lu path = tel omurgası, stroke-width = TEL ÇAPI
(kullanıcı Illustrator'da kalınlığı görsel çizer!); kapalı fill'li şekil =
kontur teli (uyarıyla). Rol kuralı: katman adı öneki (cerceve:/dolgu:/granul:)
inkscape:label → data-name → id sırasıyla; fallback stroke-width kümeleme;
içe aktarma panelinde kullanıcı eşlemeyi düzeltir.
TEMİZLİK GEÇİDİ (Fusion 360 dersi — "yüzlerce mini spline" tuzağı): endpoint
kaynaklama ~0.05mm, sıfır segment atma, viewBox→mm ölçek diyaloğu.
Export: omurgaları M/L/C kayıpsız geri yaz (rol=katman+stroke-width) →
ROUND-TRIP testi (bizim export bizim import'tan geçmeli).

## FAZ 3 — BÜYÜK (stüdyoluk)

### 3.1 SVG çizim penceresi: paper.js (bezier segment/handle düzenleme +
boolean + flatten matematiği hazır; fabric bezier editörü yok, svg.js çıplak).
Üstüne: grid + endpoint + RADYAL SİMETRİ snap (telkari için altın özellik).
### 3.1b AI SVG ÜRETİMİ (Murat, 2026-07-14 — "desen nasıl üretiyorsak SVG
tasarımı da öyle"): Nakkaş kalıbının vektör kardeşi — üretken model raster
değil SVG path üretir (LLM'e stroke'lu SVG yazdırma + bizim rol/kalınlık
sözleşmemiz) VEYA kendi prosedürel üreticilerimiz (Wong/Fermat/spiral aileleri)
+ AI parametre seçimi. Üretilen SVG aynı içe-aktarma hattından geçer (tek
boru: üret→incele→düzelt→tel). PAZAR NOTU: Ortadoğu/Arap dünyası/Hindistan/
Özbekistan = telkari cenneti — motif kütüphanesi bölgesel aileler halinde
kurulmalı (Mardin/Midyat, Prizren, Arap arabesk, Hint jali, Özbek filigran) —
hem tasarım dili hem satış coğrafyası.
### 3.2 Otomatik dolgu ailesi (literatür hazır):
- Wong 1998 adaptif büyüme (largest-empty-circle + büyüme kuralları → scroll
  dolgusu; TS'de en kolay makale, telkariye şaşırtıcı uygun) — kolay-orta.
- Connected Fermat Spirals (Zhao 2016, kod açık): keyfi hücrede TEK kesintisiz
  spiral tel — orta.
- Zehnder 2016 elastik relax + snap-to-connect: teller arası min mesafe +
  eşik altına inen otomatik kavşaklanır — "iyi bağlı filigre" garantisi — orta.
- Chen 2016 filigre sentezi / Tu 2020 autocomplete ("yarım çizdiğini tamamla")
  — zor, ufukta.
### 3.3 Stabilite-farkında budama (Neveu 2022, kod açık): yoğun dolgudan
gereksiz telleri at / kritik telleri işaretle — orta-zor.
### 3.4 DecoBrush tarzı "telkari fırçası": yol çiz → motif dizilir — orta.

## MENÜ İSKELETİ (Kimi tasarımına girecek)
Modeller · Düzenle (parça seç/taşı/motif değiştir) · Doku (burgu/yassı/pitch) ·
Analiz (kırılganlık haritası + döküm kuralları) · İçe/Dışa Aktar (SVG yükle /
SVG çiz / STL) · Kütüphane — üst çubukta Komut alanı + Geri/İleri al.

## KAYNAK ÖZETİ
SIGGRAPH ailesi: Chen 2016 filigre sentezi · Zehnder 2016 ornamental curve
networks (bize en yakın makale) · Garg 2014 wire mesh (Chebyshev) · Zhou 2014
topology-constrained vector patterns · Tu 2020 continuous curve textures ·
Dumas 2015 · Wong 1998 floral ornament · DecoBrush 2014 · Zhao 2016 Fermat ·
Zhou 2013 worst-case · Umetani-Schmidt 2013 kesit · Neveu 2022 (kod açık) ·
Bergou 2008 elastic rods. Pratik: Formlabs/Materialise döküm kılavuzları,
Ganoksin telkari teli, Rhino FlowAlongSrf, manifold-3d tartışmaları,
three-mesh-bvh, tldraw/three.js-editor belge/undo modelleri, SVGLoader/
svg-path-properties/paper.js değerlendirmesi. Ayrıntı: 4 ajan raporu
(oturum 2026-07-14).
