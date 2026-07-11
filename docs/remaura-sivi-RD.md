# Remaura "Sıvı" Motoru + `.rema` Düzenlenebilir Format — Tasarım / Ar-Ge

> Temizlenmiş watertight modeli al → **kendi kodumuzla** yeniden işle (iç boşaltma + tahliye + mikron edge çıkarımı) → üretken tasarıma (parça/desen/ajur) zemin kur → hepsini **düzenlenebilir, bize ait `.rema` formatında** sakla.
>
> Bu doküman bir **yol haritasıdır** — kod değil. Sonraki oturumlarda parça parça inşa edilecek.
> Durum: **TASARIM**. Henüz kod yok.

---

## 0. Tek cümle

`mesh-temizle`'den çıkan temiz modeli, sıvıya daldırılmış gibi **hatlarını mikron seviyede okuyup** kendi kodumuzla yeniden kurgulayan; içini boşaltıp tahliye seçenekleri sunan; ve çıktıyı **yeniden düzenlenebilir kendi formatımızda** saklayan bir motor. Zamanla üstüne kendi takı tasarım komutlarımızı ekleyeceğiz.

## 1. Kapsam & sınır (net çizgi)

- **Girdi:** `mesh-temizle`'den geçmiş, **zaten watertight** model. Belki birkaç intersection üçgeni / önemsiz hata. Ham AI mesh'i DEĞİL — temizlik ayrı, çözülmüş bir ön aşama.
- **Bizim işimiz (Sıvı aşaması):**
  1. İç boşaltma + **tahliye kanalı önerileri** (kullanıcı seçer, o karar verir).
  2. **Mikron seviyesinde edge / ring-rail / hat çıkarımı** → spline eğriler.
  3. O eğrilerden **üretken tasarım**: yeni parça, desen, ajur (openwork).
  4. Sonucu **düzenlenebilir `.rema`** olarak sakla.
- **Girmiyoruz:** Genel mesh onarımı (o `mesh-temizle`'nin işi), endüstriyel CAD paritesi, baskı dizilimi.
- **Kırmızı çizgi:** **Görünen (dış) yüzeyde sıfır detay kaybı.** Edge'ler üretim girdisi olduğu için sadakat şart.

## 2. Neden "sıvı" metaforu doğru

- Gerçek sıvı, daldırılan yüzeyin iznini **birebir** alır → mükemmel negatif, yüzey-sadık.
- Teknik karşılığı: **SDF (işaretli mesafe alanı)** — her noktada "yüzeye uzaklık" ölçer, hatları o ölçüyle yakalar.
- Metafor yüzey-sadık olduğu için tasarımı **voksel-yaklaşık değil, yüzey-koruyan** yöne iter. (Bkz. §4 detay-kaybı kararı.)
- Aynı metafor görselleştirme olarak da kullanılabilir (yüzük sıvının içinde) — ama asıl değer görselde değil, **iç mimaride ve edge çıkarımında.**

## 3. Mimari — uçtan uca

```
AI mesh
  └─[Aşama 1: mesh-temizle]  → watertight, temiz   (VAR, canlı)
        └─[Aşama 2: SIVI]    → bu doküman
              ├─ İş 1: iç boşaltma + tahliye kanalı ÖNERİLERİ (kullanıcı seçer)
              └─ İş 2: mikron edge / rail çıkarımı → spline eğriler
                        ├─ yeni parça üretimi (sweep/loft)
                        ├─ desenleme
                        └─ ajur (kabuktan boolean çıkarma)
        └─[Çıktı: .rema]     → düzenlenebilir, bize ait format
              └─ ileride: kendi takı komut dilimiz (yavaş yavaş)
```

## 4. Detay kaybı kararı (kritik)

Detay kaybı **yöntemden** doğar, problemden değil. Voksel ızgarası, kendinden küçük detayı bant-sınırlar (törpüler). Üç yol:

| Yol | Detay sadakati | Sağlamlık | Not |
|---|---|---|---|
| **A. Mesh-native onarım** | Mutlak sıfır (orijinal vertexlere dokunmaz) | Çok bozuk girdide sınırlı | Girdi zaten temiz olduğu için **bizim durumda ideal** |
| **B. Adaptif dar-bant SDF** | Algılanamaz (mikron altı) | En bozuğu bile kurtarır | Pahalı; "matematiksel sıfır" değil |
| **C. Hibrit** | Yüksek (detay reprojeksiyon) | Yüksek | SDF topolojiyi bulur, detay orijinalden geri taşınır |

**Karar (bizim akış için):**
- Girdi `mesh-temizle`'den **temiz/watertight** geldiği için ağır remesh GEREKMİYOR.
- **İç boşaltmada dış yüzey zaten korunuyor:** `hollowShellSDF` dış yüzeyi orijinal vertexlerle aynen geçiriyor; SDF yalnızca **gizli iç kabuğu** kuruyor (kendi kodumuz, satır ~862-864: "dış yüzey (orijinal detay)"). Yani **görünen detay = sıfır kayıp, bugün bile.**
- Detay kaybı riski sadece "dış yüzeyi yeniden örme" senaryosunda; **bizim akışta o gerekmiyor.**
- Edge çıkarımı için kenar bölgesi kabaysa → **sadece o kenarda** yerel sıklaştırma (detayı bozmadan).

## 5. İş 1 — İç boşaltma + tahliye

- **Temel motor mevcut:** `lib/.../mesh-temizle/lib/meshOps.ts`
  - `hollowShellSDF` → dış yüzey korunur, iç kabuk SDF'ten, kavite hacmi, **hapsolmuş boşluk (flood-fill) tespiti** (`trappedRemoved`).
  - `solidifyWrap`, `analyzeGeometry` (`watertight`, `productionReady`), `computeWeight`.
- **Eklenecek:** Hapsolmuş boşluğu **doldurmak yerine**, "buradan tahliye kanalı açılabilir" diye **noktayı öner**. Kapalı boşluğu → drenajlı boşluğa çevir.
- **Tahliye noktası adayları (kullanıcıya sunulur):**
  - (a) Tahliye deliği: en kısa/en ince duvar yolu, ya da en alt nokta.
  - (b) Erişim/ayırma kesiti: en az görünen, en düz dış bölge.
  - (c) Gizli delik: görünmeyen iç/alt yüzey.
- **İlke:** Motor **önerir**, kullanıcı **seçer ve uygular.** Otomatik dayatma yok.

## 6. İş 2 — Mikron edge çıkarımı → üretken tasarım

Asıl güç burada. Sıvı modeli "okuyunca" elimize **kenar çizgileri** geçer; bunlar yeni geometrinin iskeleti olur.

| İstenen | Teknik | Eldeki zemin |
|---|---|---|
| Kenar/hat tespiti | Dihedral-açı feature-edge → sürekli polyline | mesh edge haritası (`meshOps`) |
| Ring-rail ölçümü | Kesit dilimleme + profil ölçümü | SDF/dilimleme altyapısı |
| Eğriden yeni parça | Eğri boyunca sweep/loft | yeni — eğri verisi üstüne |
| Desen döşeme | Motifi yüzey/eğri boyunca tekrarla | yeni |
| **Ajur (openwork)** | Deseni kabuktan **boolean çıkar** | SDF + surfaceNets = boolean'a uygun |

**İki dürüst uyarı:**
1. **"Mikron" mesh'in taşıdığı kadardır** — edge keskinliği o bölgedeki üçgen yoğunluğuyla sınırlı. Gerekirse kenarda yerel sıklaştırma.
2. **Üçgenden çıkan eğri "merdivenli"** olur → üretimde kullanmak için **spline'a fit + smooth** şart. Yoksa türetilen parça da pürüzlü gelir.

**Bağımlılık:** Ajur, **duvarı olan** kabuk ister (deliği bir şeyin içinden açarsın) → İş 1'deki boşaltma/duvar, İş 2'deki ajurun ön şartı. İki iş birbirini besler.

## 7. `.rema` — düzenlenebilir, bize ait format

### 7.1 Kritik ilke: "sonucu" değil "tarifi" sakla

- Sıradan 3D dosya (STL/GLB) = **pişmiş sonuç** (sadece üçgenler) → düzenlenemez.
- `.rema` = **tarif** (parametreler + eğriler + işlem sırası) → her adım geri alınıp değiştirilebilir. (PSD katmanları / CAD feature-tree mantığı.)
- **Kaynak gerçek = tarif.** Pişmiş mesh = yeniden üretilebilir cache.

### 7.2 Yerleşim (zip kabı — `JSZip` zaten kullanımda)

```
model.rema  (zip)
├── base.glb        ← temiz watertight TABAN (değişmez referans)
├── document.json   ← DÜZENLENEBİLİR tarif:
│                       • version: 1
│                       • curves:  spline kontrol noktaları (mikron, polyline DEĞİL)
│                       • hollow:  { wall, drainChannels: [...] }
│                       • parts:   [ { type: "sweep", alongCurve, profile } ]
│                       • patterns:[ { motif, region } ]
│                       • ajour:   [ { motif, derinlik, region } ]
│                       • order:   adım sırası (feature stack)
├── baked.glb       ← pişmiş sonuç (cache, tariften yeniden üretilebilir)
├── meta.json       ← metal, gram, ring size, watertight, boyutlar
├── thumbnail.webp
└── signature       ← sahiplik / filigran
```

### 7.3 Zarif yan: format = pipeline'ımızın serileştirilmiş hali

`document.json`'daki her alan, motorumuzdaki bir fonksiyonun parametresi:
- `hollow.wall` → `hollowShellSDF(geo, wall)`
- `curves` → edge çıkarımı (spline)
- `ajour` → SDF boolean çıkarma

**Dosyayı açmak = fonksiyonlarımızı saklı parametrelerle yeniden çalıştırmak.** Format ekstra motor değil; pipeline'ın kaydı.

### 7.4 Tasarım notları
- **Eğriler spline olarak** saklanır (pişmiş polyline değil) → düzenlenebilirlik + mikron sadakati.
- **Şema versiyonu şart** (`"version"`) → eski dosyalar yeni alanları yoksayıp yine açılır (zip+json'ın doğal esnekliği).
- **Başlangıçta doğrusal feature-stack** (taban→boşalt→eğri→parça→desen→ajur); tam DAG'a ("rail değişince ajur güncellensin") sonra evrilir.

## 8. Komut sistemi — "yavaş yavaş takıya uygun hale getirme"

`document.json` zaten bir **komut listesi**. Motor = "komut tipi → fonksiyon" registry'si.
- Dosyayı açmak = komutları sırayla çalıştırmak.
- **Yeni takı komutu eklemek** = registry'ye yeni işlem tipi + fonksiyonu kaydetmek. Format değişmez; **kelime dağarcığı** büyür.

**İleride eklenecek takı komutları (örnek):**

| Komut | Ne yapar |
|---|---|
| `tırnak` (prong) | Taş tutturma tırnakları |
| `yuva` / `bezel` | Mıhlama yuvası (çerçeve) |
| `pavé` | Taş tarlası döşe |
| `galeri` | Baş altı açık galeri |
| `kanal` | Kanal mıhlama yatağı |
| `milgrain` | Kenara boncuk dizisi |
| `burgu/tel` | Filigran/telkâri |
| `rail-profil` | Omuz kesitini incelt/şekillendir |
| `gravür` | Yüzeye kazıma |
| `ajur` | Openwork (MVP'de var) |

**Neden mimariye oturuyor:**
- Her komut **izole** fonksiyon → eskiyi bozmaz. (CLAUDE.md: "yeni özellik = izole, olgunlaşınca taşı.")
- Şema versiyonu sayesinde yeni komut, **eski `.rema` dosyalarını bozmaz.**
- Sonuç: zamanla **bize ait bir takı tasarım dili** — kendi komutlar, kendi format, kendi motor. Teknik + ticari-sır hendeği.

## 9. Ticari sır uyumu

- Format **bize ait**; sadece kendi araçlarımız açar. İçinde hangi AI/3D servisinin kullanıldığı **görünmez**.
- UI'da servis adı, süreç açıklaması yok (V1/V2 nötr isimler). Hata mesajları genel.
- Edge çıkarımı + yeniden kurgu, çıktıyı **kendi kodumuzun ürünü** yapar.

## 10. Riskler & açık sorular

- **Detay vs hız:** edge bölgesi sıklaştırma maliyeti? Tarayıcıda mı, sunucuda mı? (`mesh-temizle` tarayıcı-öncelikli; sıvı da öyle başlamalı.)
- **Spline fit kalitesi:** merdivenli edge'i ne kadar agresif yumuşatınca üretim doğruluğu bozulur? Kalibrasyon gerek.
- **Ajur ↔ duvar bağı:** çok ince duvarda ajur deliği deler/zayıflatır mı? Min. et kalınlığı kuralı.
- **Feature-stack vs DAG:** ne zaman DAG'a geçmek zorunda kalırız?
- **Performans:** büyük (1M+ üçgen) modelde edge + SDF + boolean zinciri kabul edilebilir sürede mi?

## 11. Yapım sırası (öneri)

1. **İskele:** izole sayfa `/remaura/3d-uret` ya da yeni `/remaura/sivi` (super-admin geçitli), temiz watertight model yükle.
2. **İş 1:** mevcut `hollowShellSDF` üstüne **tahliye noktası önerisi** (doldur yerine işaretle).
3. **`.rema` yaz/oku (MVP):** `base.glb` + `document.json` (sadece `hollow`) + `baked.glb` + `meta.json`. Aç → tariften pişir.
4. **İş 2 — edge çıkarımı:** dihedral feature-edge → spline. Görselleştir, `document.json`'a `curves` ekle.
5. **İlk üretken komut:** `ajur` (SDF boolean) — registry desenini kurar.
6. **Komut registry'sini genişlet:** takı komutlarını teker teker, izole, olgunlaşınca çekirdeğe.

---

> **Özet:** Başta soru "kendi formatımı yazabilir miyim?" idi. Cevap net: sadece yazılabilir değil — etrafında **kendi takı CAD'imizi** büyütebiliriz. Çekirdek = SDF/edge motoru + `.rema` düzenlenebilir format + genişleyen komut registry'si. Hepsi mevcut `meshOps` zemininin üstüne, izole ve yavaş yavaş.
