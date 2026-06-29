# DEVİR NOTU — Remaura Mesh Temizleme & Hollow (yeni oturuma yapıştır)

## Kim/ne
Murat (kuyumcu, trendmucevher.com). Ürün: kuyumcuların **ZBrush/Rhino/AI (Meshy/Tripo)** STL'lerini **döküme hazırlayan** tarayıcı aracı. B2B/SaaS, ~$500 (Magics $19k'a alternatif değil — sadece kuyumcu döküm hazırlığı). Kapsam dar: temizle → gramaj → boşalt → kontrol → indir/Etsy görseli. **Ölçüt: döküm tutuyor mu** (Magics paritesi değil).

## Mimari (KESİN)
**Tarayıcı-öncelikli, sunucu yok.** Vercel'de (serverless). Site `git push origin main` → otomatik deploy. Süper-admin gated. Ağır geometri Web Worker'da. Repo: `C:\Users\Murat\Desktop\RemauraAi2`, branch `main`, remote github murat-trend/TrendMucevherSite.
Ticari sır: UI'da kütüphane/servis adı YAZMA.

## CANLI sayfa: `/remaura/mesh-temizle`
Dosyalar:
- `app/(site)/remaura/mesh-temizle/MeshTemizleClient.tsx` — UI
- `app/(site)/remaura/mesh-temizle/MeshCleanViewer.tsx` — three.js sahne (gumball, kesit/slice pembe-dış/altın-iç, yeşil nm overlay, snapshot)
- `app/(site)/remaura/mesh-temizle/HollowMagicOverlay.tsx` — cadılı pembe sihir animasyonu (title/label prop)
- `app/(site)/remaura/mesh-temizle/lib/meshOps.ts` — TÜM geometri motoru
- `app/(site)/remaura/mesh-temizle/lib/hollow.worker.ts` — worker (method: fast|sdf|solidify, maxGrid)
- `app/(site)/remaura/mesh-temizle/lib/etsyCard.ts` — 2000×2000 Etsy PNG (hollowed param)
- `app/api/remaura/mesh-temizle/check/route.ts` — döküm standartları check endpoint (POST, trailing slash /check/)

## CANLI özellikler (hepsi push'lu, çalışıyor)
- Yükle + analiz (üçgen, weld vertex, shell, açık kenar, non-manifold, **ters normal/winding**, boyut)
- Rapor bandı: temizse **"✓ WATERTIGHT — Üretime/Döküme Hazır"**
- Temizleme: Otomatik Temizle (tek tık) + adımlar (1 yeşil çöp/nm sil, 2 izole parça, 3 açık kenar kapat, 4 normal düzelt, temel temizlik)
- **Mesh Örme (Katıya Çevir)** AYRI panel: SDF unsigned wrap + Detay (Orta/Yüksek/Çok Yüksek = maxGrid 110/160/220)
- Yeniden Boyutlandırma: homojen (en büyük mm) + manuel X/Y/Z slider+sayı, canlı önizleme
- Hacim & Metal Ağırlığı: divergence; Ag925=10.36, 14k=13.07, 18k=15.58, 22k=17.7, Pt=21.45 g/cm³
- İç Boşaltma: Hızlı (fast-shell vertex-normal offset + clamp + Laplacian) / Sağlam (SDF ray-parity + kör havuz flood-fill + floater bileşen filtresi). dolu→boş gramaj, tasarruf %, boşaltılmış STL, boşaltılmışı göster
- Kesit (slice): clipping plane X/Y/Z + slider + yön; dış pembe/iç altın → boşluk görünür
- Etsy Görseli: boşaltıldıysa boşaltılmış ağırlık + "içi boşaltılmış" etiketi
- Dosya adı: `remaura-clean-mesh-<isim|tarih-saat>`
- Check Mesh AYRI panel (en son): endpoint'e POST, pass/warn/fail rapor
- Gumball (döndür/taşı), döndürme STL'e bake

## DOĞRULANMIŞ gramaj (gerçek dökümle)
AurelleTr.stl=0.83g Ag · Mesh AI yüzük=8.03g · Meshy crown=38g. Üç yol: bizim Python/JS + MatrixGold + gerçek döküm aynı.

## ŞU ANKİ AR-GE ODAĞI: Shrinkwrap Remeshing + Projection (bozuk AI mesh onarımı, ÇAMURSUZ)
Sorun: AI mesh'leri (ejder) çok bozuk (binlerce delik / nm / self-intersection). SDF wrap her şeyi kapatır AMA detay gider (çamur). Hole-filling ise kirli sınırda tökezliyor.
**ÇÖZÜM (ZBrush Project All = Netfabb/Wrap3D mantığı):** Watertight bir BAZ (SDF wrap) üret → SUBDIVIDE → orijinal yüzeye PROJECT (yansıt). Watertight baz + nokta taşıma (topoloji değişmez) = sonuç %100 watertight kalır, detay geri gelir.

### 4 KRİTİK edge-case (kodda VAR — `scripts/test_project.mjs`):
1. `closestPointToPoint` KULLANMA → **normal-yönlü raycast** (ileri+geri `bvh.raycastFirst`), `hit.face.normal · vertexNormal` **>0.25** değilse snap etme (karşı duvara yapışmayı önler)
2. **maxSearchDist klampı** — hit yoksa/uzaksa noktayı kıpırdatma → deliklerin üstü düz "yara bandı" kalır (delik arama gerekmez)
3. **Hierarchical coarse-to-fine** — her seviye project→relax→subdivide, searchDist yarıya. Tek seferde yüksek-poly project = çamur
4. Sonda **tangential Laplacian relaxation** — sivri uçlar (diş) kütleşmesin

### test_project.mjs SONUCU (ejder_seri_03.stl, 1.93M üçgen, ~1 BİRİM ölçek):
- ✅ Watertight (açık kenar 0), snap %93, detay geri geldi, hole-filling atlandı
- ❌ **340 non-manifold** (surfaceNets baz kusursuz manifold değil — artifact)
- ❌ **18 dakika (1088s)** çok yavaş (array-of-arrays + Set adjacency + per-vertex alloc, GC ağır)
- Çıktı: `ejder_seri_03_project.obj` → Magics'te detay/intersecting kontrolü BEKLİYOR

### KÖK DÜZELTME yapıldı: ölçek
`solidifyWrap` offset'i sabit mm (0.12) idi → küçük ölçekli STL'de patlıyordu. **Göreceli** yapıldı (test_project'te `offset=pitch*1.5`, searchDist göreceli + `offset*2.5` taban). Murat doğru ölçekli ejder modelini yeniden export edip atacak.

## SIRADAKİ ADIMLAR (öncelik)
1. **Murat doğru-ölçekli ejder STL'i atacak** → test_project tekrar koş, DETAY kalitesini Magics'te gör (mud mu temiz mi?)
2. Kalite iyiyse: **(a) Hız** → meshOps'a `projectRemesh()` yaz, FLAT typed-array (Float32Array positions + flat adjacency), worker'da, çözünürlük ayarlı → hedef saniyeler. **(b) Manifold baz** → surfaceNets 340 nm'yi temizle (baz düşük-detay; nm sil + earcut ile minik delik kapat) ya da daha temiz isosurface
3. Çalışınca `meshOps.ts`'e taşı + "Mesh Örme"ye "Detay Yansıt (Project)" opsiyonu + worker'a method:"project" + UI
4. Sonra: i18n (İngilizce, B2B şart), ödeyen kullanıcıya açılım, drenaj deliği (boolean), yüzük ölçüsü

## Kurulu kütüphaneler
three, three-mesh-bvh (BVH raycast/closestPoint), isosurface (surfaceNets), earcut (hole-fill — projection'a geçince ikincil), framer-motion, lucide-react. (libigl Windows/py3.12 KURULAMADI.)

## Node test script'leri (scripts/)
- `test_project.mjs` ← ANA (shrinkwrap+projection, 4 edge-case)
- `test_wrap.mjs` (unsigned SDF wrap), `test_sdf.mjs` (SDF hollow+GWN ray-parity), `test_fill.mjs` (earcut hole-fill — kısmi), `hollow_spike_*.py` (Python referans)
- STL parse Node'da: binary, header 80B + uint32 count + tri başına 50B (12B normal atla + 9 float vertex + 2B attr)

## Test modelleri
- `C:\Users\Murat\Desktop\AurelleTr.stl` (150k, 0.83g)
- `C:\Users\Murat\Downloads\EfeBal__kesir_temiz.stl` (147k, kapalı, ters normal vardı)
- `C:\Users\Murat\Downloads\ejder_seri_03.stl` (1.93M, ~1 birim ölçek, AI, 1500 delik) — ANA test, doğru ölçekli yenisi gelecek

## ÇALIŞMA TARZI (önemli — hafızada feedback_no_dodging)
- **Geçiştirme YOK.** "boş ver / yeterince iyi / döküme zararsız" deme. Çöz ya da dürüstçe sınırı söyle. Murat ısrarcı, en iyi çözümler ısrarla çıktı.
- **Deploy etmeden Node'da doğrula** (gerçek modelle), sonra push.
- Çalışan sistemi bozma; yeni özellik = ayrı panel/izole.
- Push: sadece ilgili dosyalar; commit sonu `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Dev server: `npm run dev` (webpack), port 3000, trailingSlash:true (URL'lerde sonda / gerek). Sık düşüyor, yeniden başlat.

## Hafıza dosyaları (zaten var, oku)
`MEMORY.md`, `project_hollow.md`, `feedback_no_dodging.md`, `project_3d_lab.md`, `project_i18n_todo.md`. Tam günlük: `docs/remaura-hollow-RD.md`.
