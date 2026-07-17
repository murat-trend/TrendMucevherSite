# BILGI.md — Jewelry Engineering Knowledge Base (JEKB)

Montür aracının TERİM ve MÜHENDİSLİK bilgi tabanı (Murat, 2026-07-17: "AI'ya
öğret — 'Tulip basket kullan' dediğimde ne olduğunu bilsin"). Format Murat'ın
şablonudur: **Tanım / Amaç / Geometri**. Bu dosya iki yerde yaşar:
1) insan dokümanı (burası), 2) özet sözlük AI komut editörünün sistem
promptuna gömülür (route.ts). Sayısal kurallar MONTUR.md/SUYOLU.md
kimliklerine bağlanır; kaynaksız sayılar `[PRATİK]`/`[KALİBRE]` etiketlidir.

---

## Basket (Sepet Kafa)

**Tanım:** Basket, taşı şankın üstünde taşıyan yapısal iskelettir. Tırnaklar
(prong), galeri, rail(ler), köprü (bridge) ve taş yuvasından (stone seat)
oluşur. Yandan bakıldığında sepete benzeyen kafes görünümü verir.

**Bileşenler:** Stone Seat · Prongs · Gallery · Rail · Bridge · Support Arms.

**Amaç:** Taşı güvenle kavramak; ışığın taşa yandan/alttan girmesine izin
vermek; kafaya yapısal bütünlük kazandırmak; şankla bağlantıyı taşımak.

**Geometri:** Tırnaklar taş çevresine eşit açılarla dizilir (MK1/MK3);
rail(ler) tırnakları birbirine bağlar; taban şank omzuna ya da peg'e iner.
Motor karşılığı: `kafa.tip="tirnak"` + `basketStil` + `rail` alanları.

## Stone Seat (Taş Yuvası)

**Tanım:** Taşın girdle'ının oturduğu, tırnakların/bezelin iç yüzüne açılan
oturma yüzeyi. "Yuva açmak" = tırnak iç yüzünden taşın negatifini kesmek.

**Amaç:** Taşı doğru yükseklikte ve merkezde sabitlemek; girdle'ı metalle
kavramak; mıhlama sırasında taşın referansını vermek.

**Geometri (nasıl açılır):** Negatif iki gövdeden oluşur — (1) girdle
silindiri: taş girdle çapının **%98'i** (S2 sıkı geçme), girdle bandı boyunca;
(2) pavyon konisi: girdle altından culet'e inen koni. Bu negatif tırnak/bezel
iç yüzünden kesilir; kesim derinliği tırnak kalınlığının **%25'ini** aşmamalı
(S9 — aşarsa gerçek zayıflık). Prenses/oval taşta negatif, kesimin kendi
formunu (kare prizma+piramit / elips) alır.

## Bearing (Oturma Çentiği)

**Tanım:** Bearing, stone seat'in tırnak üzerindeki karşılığıdır: girdle'ın
oturduğu çentik/kademe. Pratikte seat ile eşanlamlı kullanılır; bearing
"tırnaktaki çentik", seat "bütün oturma sistemi"dir.

**Nasıl hesaplanır:** Çap = girdle × 0.98 (S2) · düşey konum = girdle alt
çizgisi (taşın tabla hizası MK4 yükseklik zincirinden gelir: culet-şank ≥0.5
→ girdle yüksekliği türetilir) · derinlik (tırnağa girme) = 0.25 × tırnak
çapı (S9/MK3 binme) · çentik açısı pavyon açısını izler (~41°, T1).

## Prong (Tırnak)

**Tanım:** Taşı kavrayan düşey metal parmak.

**Amaç:** Taşı tutmak; minimum metalle maksimum ışık almak.

**Geometri — kalınlık taş çapına göre (S7):** tırnak çapı ≈ **taş çapının
%15'i**; döküm güvenli taban **0.6 mm**, mutlak taban 0.45. Örnek: 4.1 mm taş
→ 0.6 mm; 6.5 mm (1 ct) → ~0.98 mm; 8.2 mm → 1.2 mm. Uç, crown'un ~yarısına
kadar çıkar, tablaya taşmaz (S8). Sayı: 4 (köşe/omuz yerleşimi) veya 6
(daha güvenli kavrama, daha çok metal görünümü). Prenses kesimde tırnaklar
KÖŞELERE oturur (köşe en kırılgan nokta — köşeyi korur; S6 ailesi).

## Gallery (Galeri)

**Tanım:** Basketin yan/alt açıklıkları ve bunları çevreleyen ray sistemi —
taşın altındaki "pencereli" bölge. Gallery rail = bu bölgeyi saran halka.

**Amaç:** Işık girişi; temizlenebilirlik; ağırlık azaltma; yandan estetik.

**Geometri:** Galeri boşlukları S10'a uyar: pavyon-metal boşluğu 0.2-0.3,
raylar arası ≥0.4, culet-şank ≥0.5.

## Rail (Ray)

**Tanım:** Tırnakları birbirine bağlayan çevresel halka.

**Amaç:** Tırnakların bağımsız hareketini önlemek; döküm bütünlüğü.

**Geometri:** Taş çevresini izler; tel kalınlığı ≈ tırnak çapının 0.8'i
(MK5); girdle altına yerleşir. Motor: `kafa.rail = "yok"|"tek"|"gizli"|"cift"`.

## Hidden Rail (Gizli Ray)

**Tanım:** Taşın girdle'ının ALTINA, tırnakların İÇ yüzüne bağlanan ve üstten
bakışta görünmeyen iç destek halkası.

**Amaç:** Tırnak stabilitesini artırmak · bağımsız tırnak hareketini
azaltmak · döküm mukavemetini iyileştirmek · tırnak eğilme riskini düşürmek ·
temiz (rail'siz görünen) üst görünüm.

**Geometri:** Ray taş çevresini izler · girdle'ın hafif altında durur · HER
tırnağa bağlanır · kalınlık taş boyutuyla orantılı · ÜSTTEN GÖRÜNMEZ (ray dış
yarıçapı girdle izdüşümünün içinde kalır) · pavyon boşluğuna (S10) girmez.

## Double Rail (Çift Ray)

**Tanım:** Tırnakları tek yerine İKİ eşmerkezli halkayla bağlayan yapı. Büyük
merkez taşlarda ve ekstra destek isteyen lüks yüzüklerde kullanılır.

**Ne zaman tercih edilir:** Ağır/büyük taş (≥1 ct bandı) · uzun tırnaklı
yüksek kafa · tırnak deformasyonu riski · premium görünüm istenen işler.

**Geometri:** Üst ray girdle'ı destekler · alt ray basketi güçlendirir ·
raylar paraleldir · aralık eşit tutulur · iki ray da her tırnağa bağlanır.

## Tulip Basket (Lale Sepet)

**Tanım:** Tırnakların tabandan yukarı LALE ÇANAĞI gibi dışa açılarak
yükseldiği basket biçimi; taban dar, girdle hizası geniş.

**Amaç:** Zarif profil; taşı optik olarak yükseltme; klasik solitaire estetiği.

**Geometri:** Tırnak eksenleri eğiktir: taban yarıçapı ≈ girdle yerleşim
yarıçapının **0.55'i** `[PRATİK — biçim; KALİBRE]`; uçlar standart S7/S8
kurallarına döner; rail(ler) eğik eksenleri kendi yüksekliklerinde keser.

## Peg Head (Pimli Kafa)

**Tanım:** Basketin altından çıkan tek merkez pimle (peg) şanka monte edilen
kafa. Kafa AYRI parça üretilir; şankın üstündeki deliğe oturtulup lehimlenir.

**Ne işe yarar:** Kafa/şank kombinasyonlarını ayrıştırır (aynı şanka farklı
kafalar) · stok/onarım kolaylığı (kafa değişir, şank kalır) · hazır peg-head
komponent pazarıyla uyum · hassas merkezleme.

**Geometri:** Peg çapı ~**1.0-1.2 mm** `[PRATİK]`, şanka giriş **2-2.5 mm**;
şank deliği peg + 0.1 (lehim payı). Motor: `kafa.baglanti="peg"` → kafa ve
şank AYRI STL parçaları; "omuz" → tek gövde döküm.

## Bridge / Support Arms (Köprü / Destek Kolları)

**Tanım:** Bridge: basketi şank omuzlarına bağlayan alt kemer; support arms:
yanlardan destekleyen kollar. **Motor v2 durumu:** omuz bağlantısında
tırnaklar şanka gömülerek köprü işlevi karşılanır; ayrı biçimlendirilmiş
bridge/support arm geometrisi v3 adayıdır (dürüst kapsam notu).

## Taş Kesimleri (galeri)

- **Yuvarlak (round brilliant):** T1 oranları — derinlik 0.61·çap, taç 0.15,
  girdle %3, tabla %57 `[KANITLI — HRD]`; ct = 0.0037210·çap³ (T2).
- **Prenses (princess):** kare görünüm; tipik toplam derinlik ≈ **%72**,
  tabla ≈ **%70** (kenara oranla) `[PRATİK — GIA/perakende bandı; hakemli
  doğrulama bu turda açılmadı, KALİBRE]`. Ct ≈ kenar²·derinlik·0.0083
  `[PRATİK]`. Tırnaklar KÖŞELERE (4) — köşe koruması şart (S6).
- **Oval:** yuvarlak parlak oranlarının elipse taşınmışı; boy/en oranı
  **1.30-1.50** klasik bant `[PRATİK]`; derinlik kısa eksene oranla ~0.61
  `[HESAP — T1 taşıması]`. Tırnak yerleşimi elips çevresine.

## AI KOMUT EŞLEMELERİ (route.ts sözlüğüyle senkron)

"tulip / lale basket" → kafa.basketStil="tulip" · "düz basket" → "duz" ·
"gizli rail / hidden rail" → kafa.rail="gizli" · "çift rail / double rail" →
"cift" · "rail'siz" → "yok" · "peg head / pimli kafa" → kafa.baglanti="peg" ·
"prenses / kare taş" → tas.kesim="prenses" · "oval taş" → tas.kesim="oval"
(oran tas.ovalOran) · "bearing/seat" soruları → bu dosyanın tanımları.
