# Remaura Hollow — Ar-Ge Günlüğü

> İç boşaltma + döküm ağırlığı aracının geliştirme yolculuğu.
> Amaç: kuyumcu STL'ini al → temizle → doğru gramaj → içini boşalt → mum deliği → indir.

---

## Özet (nerede kaldık)

- ✅ **Ağırlık motoru DOĞRULANDI** — gerçek dökümle kalibre: **0.83 g gümüş** (AurelleTr kolyesi).
- ✅ Üç bağımsız yol aynı sonuca vardı: **bizim Python motoru**, **web kodu**, **MatrixGold**.
- 🎯 Karar (öneri): **v1 = Ağırlık ürünü** (temizle + tart). Boşaltma = Faz 2.
- ⏳ Açık strateji sorusu: motor **tarayıcı-öncelikli** mi, **Python sunucu** mu.

---

## Aşamalar (kronolojik)

### 1. Sayfa kuruldu
- `/remaura/hollow` — süper-admin geçitli (RemauraAccessGate, `categoryId="hollow"`).
- Dosyalar:
  - `app/(site)/remaura/hollow/page.tsx`
  - `app/(site)/remaura/hollow/HollowClient.tsx` (UI + log + kontroller)
  - `app/(site)/remaura/hollow/HollowViewer.tsx` (Three.js sahne — kırmızı hayalet dış + altın iç çekirdek, anlık önizleme)
  - `app/api/remaura/hollow/process/route.ts` (Next.js → Python köprüsü)
  - `scripts/hollow_server.py` (Flask, lokal motor)

### 2. Deploy engeli fark edildi
- Site **Vercel'de (serverless)** → Python server orada çalışmaz.
- Lokalde çalışan "İç Boşaltmayı Başlat" canlıda Python'a ulaşamaz.
- Seçenekler: (A) motoru JS/WASM'a taşı, (B) ayrı Python sunucu, (C) sadece önizleme.

### 3. Algoritma dersi: vertex normal offset
- İlk yöntem (uniform scale) yanlıştı → şekli bozuyor, duvar kalınlığı her yerde farklı.
- Doğrusu: **vertex normal yönünün tersine offset** → sabit duvar kalınlığı (arena.ai yaklaşımı).

### 4. Asıl zorluk: kirli mesh
- Gerçek modeller **non-manifold + yüksek poligon + görünmez çöp shell** geliyor.
- ZBrush DynaMesh her zaman watertight vermiyor (gizli kabuklar yüzünden).
- Self-intersection (iç içe yüzey) topolojik onarımla DÜZELMİYOR.

### 5. Voxel/SDF remesh denendi → ELENDI
- Voxel remesh watertight katı üretiyor AMA **mücevher detayını öldürüyor** (basamaklı, erimiş).
- Milgrain boncuk/filigran için ~0.02mm pitch gerekir → dakikalar + GB'larca bellek. Çıkmaz sokak.
- **Ders: dış yüzeye ASLA dokunma.** Zaten güzel; sadece 55 bozuk kenar var (27 açık + 28 nm).

### 6. Doğru ağırlık: remesh'siz, detaya dokunmadan
- **Generalized Winding Number (GWN)** — kendi numpy implementasyonum (libigl Windows'ta kurulamadı).
- Van Oosterom-Strackee solid-angle; self-intersecting/açık mesh'te bile doğru içeri/dışarı.
- Üç yöntem buluştu: voxel-occupancy (~0.092), trimesh divergence (0.080), GWN (0.080) cm³.

### 7. GERÇEKLE KALİBRASYON ✅
- Kuyumcu (Murat) gerçek döküm: **0.83 g gümüş**, ölçü 24mm doğru.
- Bizim hesap: **0.83 g**. → Motor doğrulandı.
- Pratik: **welded mesh + divergence = ~2 saniyede doğru ağırlık.** GWN sadece çok bozuk modeller için yedek.

---

## Doğrulanmış teknik reçete

```
STL yükle
  → vertex WELD (STL üçgenleri ayrık gelir, önce kaynak şart)
  → görünmez çöp shell'leri tespit + sil (en büyüğü tut / nm-bağlıları sil)
  → AĞIRLIK:
        normal modeller: welded divergence (~2 sn, doğru)
        çok bozuk:       GWN (yavaş, kurşun geçirmez yedek)
  → malzeme × yoğunluk = gram
```

Yoğunluklar (g/cm³): Gümüş 925 = 10.36 · Saf gümüş = 10.49 · Altın 14k = 13.1 · 18k = 15.6 · 22k = 17.8 · Platin = 21.45

---

## Önemli kararlar / dersler

1. **Dış yüzey kutsal** — detay orada; remesh/voxel ona dokunamaz.
2. **Voxel remesh = mücevher için yanlış araç** (detay ölür). Kanıtlandı, elendi.
3. **Ağırlık watertight gerektirmez** — GWN bozuk mesh'te bile doğru.
4. **STL weld ilk adım** — yoksa "150k shell" gibi yanlış analiz çıkar.
5. **Self-intersection topolojik onarımla düzelmez** — voxel öldürür; ya boolean union ya GWN-tabanlı yaklaşım.
6. **Üç-yol doğrulama** (biz + web kod + MatrixGold) = yaklaşım gerçek.

---

## Sıradaki adımlar

- [ ] **v1: Ağırlık ürünü** — temizle + tart (kanıtlandı, tek başına değerli: döküm maliyeti)
- [ ] Mimari kararı: tarayıcı-öncelikli vs Python sunucu (öneri: tarayıcı + GWN sunucu yedeği)
- [ ] Malzeme seçici + birim/ölçek doğrulama (mm değilse uyar)
- [ ] **Faz 2: Boşaltma** — dış yüzeyi koruyarak iç offset + boşaltılmış ağırlık
- [ ] Mum/reçine akma deliği (boolean, alttan/gizli)
- [ ] Kolye için gizli delik / kapak

---

## Spike script'leri (referans)

| Dosya | Ne yapar |
|---|---|
| `scripts/hollow_spike_analyze.py` | Ham analiz (shell, açık kenar, nm) |
| `scripts/hollow_spike_weld.py` | Weld sonrası gerçek analiz |
| `scripts/hollow_spike_solid.py` | Voxel remesh denemesi (elendi — detay ölüyor) |
| `scripts/hollow_spike_preserve.py` | pymeshlab lokal onarım + (igl) hacim |
| `scripts/hollow_spike_volume.py` | Voxel occupancy + ray-parity hacim |
| `scripts/hollow_spike_gwn.py` | **GWN doğru hacim (kendi numpy implementasyonu)** |

Test modeli: `C:\Users\Murat\Desktop\AurelleTr.stl` (150k üçgen, 75k vertex, 24.6×12.5×2.71mm, 0.83g Ag)
