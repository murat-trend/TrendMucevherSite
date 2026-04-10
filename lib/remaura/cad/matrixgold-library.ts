// ============================================================
// MatrixGold Komut Kütüphanesi
// Odak: Kadın takıları, taşlı modeller, NURBS modelleme
// Versiyon: 1.0 (basic) — ileride genişletilecek
// ============================================================

export const MATRIXGOLD_LIBRARY = `
# MatrixGold Komut & Teknik Kütüphanesi
# Kadın Takıları / Taşlı Modeller / NURBS Tekniği

---

## 1. RING / YÜZÜK GÖVDE ARAÇLARI

### Ring Rail
- Yüzük tabanı (ray) oluşturur. Tüm yüzük modellerinin başlangıç noktası.
- Menü: Jewelry > Ring Rail
- Parametreler:
  - Finger Size: parmak çapı (mm) — TR standart: 17mm (54 numara)
  - Width: ray genişliği
  - Height: ray yüksekliği
- Not: Rail oluştuktan sonra üzerine Sweep veya Loft uygulanır

### Shank Builder
- Hazır gövde şablonları sunar
- Tipleri: Düz (flat), Konik (tapered), Ayrık (split/bypass), Comfort fit
- Parametreler: üst genişlik, alt genişlik, yükseklik, iç kavis

### Band
- Düz yüzük bandı — eternity ve pavé için temel
- Parametreler: thickness (et kalınlığı), width, finger size

---

## 2. EĞRİ ARAÇLARI

### Interp Curve (Interpolated Curve)
- Belirtilen noktalardan GEÇEN yumuşak eğri
- Eğri noktalara tam olarak değer — kontrol hassasiyeti yüksek
- Menü: Curve > Interpolated
- Kullanım: gövde profili, taş dizilim yolu, dekoratif eğriler

### Control Point Curve (CP Curve)
- Kontrol noktalarıyla şekillenen eğri — noktalar eğriyi çeker, üzerinde durmaz
- Menü: Curve > Control Point
- Kullanım: organik formlar, serbest akışlı tasarımlar

### Arc
- Dairesel yay
- 3 nokta ile veya merkez + yarıçap + açı ile
- Kullanım: halo çemberi, yuvarlak formlar

### Rebuild
- Eğriyi yeniden örnekler — nokta sayısını ve derecesini ayarlar
- Parametreler: nokta sayısı (point count), derece (degree 3 önerilir)
- Kullanım: fazla noktalı eğrileri sadeleştir, Sweep öncesi temizle

### Offset Curve
- Eğriye paralel kopya — belirtilen mesafede
- Kullanım: iç/dış kenar profili oluşturma

### Fillet
- İki eğri arasına yumuşak geçiş (köşe yuvarlama)
- Parametre: yarıçap (radius)

---

## 3. YÜZEY VE SOLID ARAÇLARI

### 2-Rail Sweep
- İki ray eğrisi boyunca profil eğrisini süpürür
- En çok kullanılan gövde aracı
- Parametreler:
  - Rail 1, Rail 2: yol eğrileri
  - Profile: kesit profili
  - Options: roadlike (yola sabit kal), twist ekle/çıkar
- Kullanım: yüzük gövdesi, bileklik, kolye zinciri

### 1-Rail Sweep
- Tek ray boyunca profil süpürme
- Daha basit formlar için

### Loft
- Birden fazla kesit eğrisinden yüzey/solid oluşturur
- Parametreler: kesit eğrileri (sıralı), closed (kapalı form)
- Kullanım: değişken kesitli gövde, organik geçişler

### Revolve
- Profil eğrisini eksen etrafında döndürüp solid oluşturur
- Parametreler: eksen, başlangıç açısı, bitiş açısı
- Kullanım: yuvarlak formlar, kolye uçları, küpe bileşenleri

### Pipe
- Eğri boyunca tüp/boru oluşturur
- Parametreler: başlangıç çapı, bitiş çapı (konik pipe mümkün)
- Kullanım: pençe kolu, kolye zinciri, ince dekoratif çubuklar

### Extrude
- Eğri veya yüzeyi belirtilen yönde uzatır
- Kullanım: düz formlar, plaka oluşturma

### Network Surface
- Eğri ağından yüzey oluşturur
- Kullanım: karmaşık organik yüzeyler, özel form geçişleri

### Offset Surface
- Yüzeyi içe/dışa ofset eder
- Kullanım: duvar kalınlığı eklemek, kabuk oluşturmak

### Shell
- Solid'den içi boş kabuk oluşturur
- Parametre: duvar kalınlığı (minimum 0.4mm — döküm için)

---

## 4. BOOLEAN İŞLEMLERİ

### Boolean Union
- Birden fazla solid'i birleştirir — tek parça yapar
- Menü: Solid > Boolean Union
- Kullanım: gövde + pençe birleştirme

### Boolean Difference
- Bir solid'den diğerini çıkarır — kesme işlemi
- Menü: Solid > Boolean Difference
- Kullanım: taş yuvası açma, kanal kesme, dekoratif oyma

### Boolean Intersection
- Kesişim bölgesini alır — ortak hacim
- Kullanım: karmaşık form kesitleri

---

## 5. REFERANS VE İNŞAAT ARAÇLARI

### Reference Point
- Yapı referans noktası yerleştirir
- Koordinat: X, Y, Z
- Kullanım: taş merkezi, simetri ekseni, ölçü referansı

### Construction Plane (CPlane)
- Çalışma düzlemini değiştirir
- Seçenekler: Top, Front, Right, Custom (obje üzerine)
- Kullanım: farklı açılardan çizim yapmak için

### Mirror
- Objeyi düzleme göre aynalar
- Seçenekler: X, Y, Z ekseni veya custom düzlem
- Kullanım: simetrik yüzük yarıları, küpe çifti

### Array Polar
- Objeyi merkez etrafında dairesel dizer
- Parametreler: kopya sayısı, toplam açı (360 = tam daire)
- Kullanım: halo taşları, pavé daire dizilimi, prong çoğaltma

### Array Linear
- Doğrusal dizi oluşturur
- Parametreler: kopya sayısı, X/Y/Z aralık mesafesi
- Kullanım: kanal taş dizilimi, pavé sıraları

### Orient
- Objeyi referans noktalarına göre konumlandırır
- Kullanım: taşı yuvaya yerleştirme, pençeyi konumlandırma

---

## 6. TAŞ VE YUVA ARAÇLARI

### Gem — Taş Tipleri ve Parametreleri
- Round Brilliant: çap (mm) — en yaygın, tüm yuva tipleriyle uyumlu
- Oval: uzun çap x kısa çap (örn. 8x6mm)
- Marquise: uzun çap x kısa çap — uçlu form
- Pear: uzun çap x kısa çap — damla form
- Cushion: kenar uzunluğu — köşe yuvarlak kare
- Emerald Cut: uzun x kısa — dikdörtgen, basamaklı kesim
- Princess: kenar uzunluğu — kare, sivri köşe
- Heart: genişlik
- Menü: Jewelry > Gem

### Gem Seat (Bezel Yuva)
- Taş etrafına tam çevreleyen metal yuva
- Parametreler:
  - Wall Height (duvar yüksekliği): taşın 1/3'ü önerilir
  - Wall Thickness (duvar kalınlığı): 0.3–0.5mm arası
  - Seat Depth: taşın oturma derinliği
- Tipler: Full Bezel (tam), Half Bezel (yarı açık)
- Kullanım: modern solitaire, kolye uçları, güvenli yuva

### Prong (Pençe)
- Taşı tutan metal pençe/çatal sistemi
- Tipleri:
  - Round Prong: yuvarlak kesitli klasik pençe
  - Claw Prong: sivri uçlu, taşı daha çok gösteren
  - French Cut Prong: köşe taşlar için — V şekli
  - Shared Prong: iki taş arasında ortak pençe (eternity)
- Parametreler:
  - Prong Diameter: 0.8–1.2mm arası (taş boyutuna göre)
  - Prong Height: taşın üstünden 0.3–0.5mm taşmalı
  - Count: round taş için 4 veya 6 pençe
- Menü: Jewelry > Prong

### Pavé Layout
- Pavé taş dizilimini otomatik oluşturur
- Parametreler:
  - Stone Size: taş çapı (genellikle 1–1.5mm round)
  - Spacing: taşlar arası mesafe (0.1–0.2mm)
  - Rows: sıra sayısı
  - Layout Type: linear, curved, surface
- Sonra Boolean Difference ile yuvalar açılır, bead setting ile pençe oluşturulur
- Menü: Jewelry > Pavé Layout

### Channel Setting
- Taşları iki metal duvar arasına dizer
- Parametreler: kanal genişliği (taş çapı + 0.1mm), kanal derinliği, duvar kalınlığı
- Kullanım: eternity band, bileklik

### Bead Setting
- Pavé sonrası metal boncuk pençe oluşturur
- Parametre: boncuk çapı, yükseklik

---

## 7. DÜZENLEME VE ANALİZ

### Point Edit (F10)
- Eğri veya yüzeyin kontrol noktalarını manuel düzenle
- Kullanım: organik form ayarı, kesit profili ince ayar

### Match Surface
- Yüzey kenarını başka yüzeye süreklilik ile eşleştirir
- Seçenekler: G0 (konum), G1 (teğet), G2 (eğrilik)
- Kullanım: iki parça arasında pürüzsüz geçiş

### Join
- Eğri veya yüzey parçalarını tek obje olarak birleştirir

### Explode
- Birleşik objeyi parçalarına ayırır

### Wall Analysis
- Minimum duvar kalınlığını analiz eder
- Döküm için minimum: 0.4mm (altın), 0.6mm (gümüş)
- Kullanım: üretim öncesi kontrol

### Volume
- Hacim hesabı — karat tahmini için
- Altın yoğunluğu: 18K = 15.5 g/cm³, 14K = 13.0 g/cm³

---

## 8. DEFORMASYON ARAÇLARI

### Flow Along Surface
- Düz düzenlenmiş objeleri eğri yüzeye taşır
- Kullanım: pavé dizilimini yüzük gövdesine oturtma

### Bend
- Objeyi eğri boyunca büker
- Kullanım: düz tasarımı yüzük formuna getirme

### Morph
- İki form arasında geçiş oluşturur
- Kullanım: özel organik geçişler

---

## 9. MODEL TİPLERİNE GÖRE AKIŞ ÖZETİ (basic)

### Solitaire Yüzük (Round Brilliant)
Ring Rail → Gövde profili (Interp Curve) → 2-Rail Sweep → Gem yerleştir → Prong (4 veya 6) → Array Polar → Boolean Union → Wall Analysis

### Halo Yüzük
Solitaire akışı + merkez taş etrafına Arc → Array Polar (halo taşları) → Gem Seat veya Pavé → Boolean Difference (yuvalar)

### Pavé Band / Eternity
Band → Gem Layout (linear) → Pavé Layout → Flow Along Surface → Boolean Difference → Bead Setting

### Kolye Ucu (Pendant)
Revolve veya Loft (form) → Gem Seat → Prong → Bail (halka — Pipe ile) → Boolean Union

### Küpe (Drop)
Ear Wire (Pipe/Arc) → Ana form (Revolve veya Sweep) → Gem Seat veya Pavé → Boolean Union

### Three-Stone Yüzük
Ring Rail → Gövde → Merkez taş (büyük) + yan taşlar (küçük) → Ayrı Prong grupları → Boolean Union

---

## 10. DÖKÜM HAZIRLIK NOTLARI
- Minimum et kalınlığı: 0.4mm
- Undercut kontrolü yap — döküm çıkışını engeller
- Tüm Boolean işlemleri tamamlanmadan STL export etme
- Wall Analysis ile kritik noktaları kontrol et
- Pavé bead yüksekliği: taş çapının %20'si
`;

/** System prompt’a eklemek için hazır metin */
export function buildSystemPrompt(): string {
  return `Sen MatrixGold yazılımında uzman bir kuyumcu CAD eğitmenisin.
Kadın takıları ve taşlı modeller konusunda uzmansın.
Aşağıdaki komut kütüphanesini kullanarak görseli analiz et ve adımları üret.

${MATRIXGOLD_LIBRARY}

YANIT FORMATI — YALNIZCA JSON döndür:
{
  "model_turu": "takı türü",
  "genel_strateji": "modelleme yaklaşımı 1-2 cümle",
  "steps": [
    {
      "baslik": "adım başlığı",
      "komutlar": ["KOMUT1", "KOMUT2"],
      "aciklama": "Detaylı açıklama: menü yolu, parametreler, neden bu adım.",
      "ipucu": "MatrixGold ipucu ya da null",
      "schema": {
        "gerekli": true,
        "tip": "top_view | side_view | cross_section | curve_path | point_layout",
        "aciklama": "şemada ne gösterilmeli"
      }
    }
  ]
}`;
}
