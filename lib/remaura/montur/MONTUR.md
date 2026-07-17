# MONTUR.md — Montür Kural Kütüphanesi (v1)

Bu dosya, montür aracının TEK kural kaynağıdır ("Jewelry Design Rules Engine"
ailesinin dördüncü kümesi — SUYOLU/ZINCIR/KILIT kardeşi). MONTÜR AYRI BİR
İŞTİR: kod lib/remaura/montur/, sayfa app/(site)/remaura/montur/.

## 0. MİMARİ — REÇETE-ÖNCE + PROMPT DÜZENLEME (Murat, 2026-07-17)

Murat: "sen bir model yapıyorsun ve o model üzerinden beni zorluyorsun;
modeli yapacağız, ben promtlarla düzenleyeceğim."

- Doğruluk kaynağı **REÇETE**dir (JSON — YOL-HARITASI Reçete v2 ilkesi):
  geometri her zaman reçeteden deterministik üretilir.
- Prompt (Türkçe komut) reçeteyi düzenler — **AI şekil çizmez**, yalnızca
  reçete alanlarını değiştirir; motor her değeri kural sınırına KISTIRIR
  (clamp) ve kısılan değerleri raporda bildirir.
- Kaydıraçlar ve komut alanı AYNI reçeteyi düzenler; geri al = reçete
  yığını (snapshot).
- Servis adı UI'da geçmez (ticari sır — CLAUDE.md).

İLKE: **keyfi sayı yok.** Etiketler: `[KANITLI]` `[PRATİK]` `[TEK]` `[HESAP]`
`[KALİBRE]`. Kimlikler: MR=ölçü, MS=şank, MK=kafa/tırnak, MB=bezel, MT=taş.

## 1. YENİDEN KULLANILAN KANITLI KURALLAR

Taş ve oturtma kuralları SUYOLU.md'den aynen (Stuller CAD/CAM PDF + HRD 2022
— tam metin kanıtlı): **T1** taş oranları (derinlik 0.61·çap, taç 0.15,
girdle %3, tabla %57) · **T2** mm↔ct (Stuller çapaları) · **S2** yuva %98
girdle · **S7** tırnak çapı ≈ %15 taş çapı, döküm tabanı 0.6 (mutlak 0.45) ·
**S8** tırnak ucu crown'un ~yarısına, tablaya taşmaz · **S9** seat kesme ≤
tırnak kalınlığının %25'i · **S10** culet-şank boşluğu ≥0.5; galeri rayları
arası ≥0.4 · **S12** azure %60 · **D5/D6** bezel duvar min 0.5, öneri 0.7;
şank ≥1.2 · **D8/S14** polisaj payı 0.2.

## 2. ÖLÇÜ (MR)

- **MR1 — yüzük ölçüsü = İÇ ÇEVRE mm (ISO 8653 / EU sistemi):** EU 44-72
  bandı; iç çap = çevre/π (EU 52 → 16.55 mm). TR piyasada "numara" karışıktır
  — motor EU kullanır, UI iç çapı da gösterir. `[KANITLI — ISO 8653]`
- **MR2 — varsayılan EU 54** (kadın orta bandı 50-56). `[PRATİK]`

## 3. ŞANK (MS)

- **MS1 — bantlar:** genişlik **1.5-6.0** (solitaire tipik 1.8-2.6);
  kalınlık **1.2-2.5** (D5 şank tabanı 1.2). `[KANITLI taban + PRATİK bant]`
- **MS2 — kesit:** yarım-yuvarlak (iç düz dış bombeli — konfor standardı) /
  dikdörtgen (yuvarlatılmış köşe). `[PRATİK]`
- **MS3 — taper:** kafaya doğru genişlik çarpanı **1.0-1.8** (üstte omuz
  genişler); geçiş cos² ağırlıklı (kavisli omuz). `[PRATİK biçim + HESAP eğri]`

## 4. TIRNAK KAFASI (MK)

- **MK1 — tırnak sayısı 4 veya 6** (solitaire standartları). `[PRATİK]`
- **MK2 — tırnak çapı:** S7 (%15 taş, min 0.6); kullanıcı üste yazabilir,
  motor 0.45 mutlak tabana kıstırır. `[KANITLI]`
- **MK3 — tırnak yerleşimi:** merkezler girdle çapı üzerinde, içe binme
  0.25×tırnak çapı (S9/S14 türetmesi). `[HESAP — Stuller ailesi]`
- **MK4 — taş yüksekliği:** culet-şank üstü boşluğu ≥0.5 (S10) → girdle
  yüksekliği = şank üstü + pavyon + 0.5. `[KANITLI]`
- **MK5 — galeri raili:** girdle altında 0.8'de bir rail (tel Ø ≈ tırnak
  ×0.8); rail-culet ve rail-şank aralıkları S10'a uyar. `[PRATİK + HESAP]`
- **MK6 — seat:** tırnaklardan %98 girdle silindiri + pavyon konisi negatifi
  kesilir (S2); kesim tırnak kalınlığının %25'ini aşarsa rapor uyarır (S9).
  `[KANITLI]`

## 5. BEZEL (MB)

- **MB1 — duvar:** min 0.5, öneri **0.7** (D6). `[KANITLI]`
- **MB2 — yükseklik:** girdle üstüne **+0.4 sıvama payı** (crimp); iç seat
  ledge %98 girdle çapında (S2). `[TEK sıvama payı — KALİBRE / KANITLI seat]`
- **MB3 — açık arka:** azure %60 (S12) ışık deliği; kalan taban ledge taşı
  taşır. `[KANITLI]`

## 6. TAŞ (MT)

- **MT1:** v1 yuvarlak parlak tek taş; T1/T2 aynen (mm-öncelikli, ct
  türetilir). Taş STL'e girmez (mıhlanır) — önizleme + yuva referansı.
  `[KANITLI]`

## 7. PROMPT SÖZLEŞMESİ (AI reçete editörü)

- Girdi: mevcut reçete + Türkçe komut. Çıktı: SADECE yeni reçete JSON'u +
  tek cümlelik Türkçe açıklama alanı.
- AI şu alanların DIŞINA çıkamaz: şema alanları; motor clampRecete ile
  sınırlar (kısılan her alan "notlar"a yazılır — kullanıcı neyin neden
  kısıldığını görür).
- Komut anlaşılamazsa reçete DEĞİŞMEZ + açıklama "anlaşılamadı" döner
  (sessiz tahmin yok).

## 8. KALİBRASYON / v2

1. MB2 sıvama payı 0.4 — ilk bezel dökümünde.
2. Taper eğrisi görsel beğeni (Murat gözü).
3. v2: halo kafa, pavé omuz (MatrixGold taş-dizme vizyonuyla birleşir),
   fantezi kesimler (T1 dışı), çift taş/üç taş, prompt-ile-stil ("vintage
   yap" → milgrain/doku katmanları).

## 9. KAYNAKÇA

SUYOLU.md kural mirası (Stuller CAD/CAM Standartları PDF, HRD 2022 —
oradaki tam kaynakçayla) · ISO 8653 (yüzük ölçüsü = iç çevre) · Ganoksin
oturtma makaleleri (Weishaar/Lewy — SUYOLU üzerinden). Yeni ağ araştırması
bu turda AÇILMADI (kota disiplini): tüm sayılar mevcut kanıtlı kümeden.
