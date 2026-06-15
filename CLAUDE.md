# CLAUDE.md — Trend Mücevher / Remaura

Bu dosya, bu repoda çalışan Claude için kalıcı yönergedir. Yeni sayfa/bileşen
yazarken **aşağıdaki tasarım sistemine uy** — markanın "ambalajı" üründen
ayrılmaz; tutarlılık şarttır.

## Tasarım Sistemi (zorunlu)

### Fontlar
| Sınıf | Font | Kullanım |
|---|---|---|
| `font-sans` (varsayılan, `--font-outfit`) | Outfit | Body, UI, butonlar |
| `font-display` (`--font-cormorant`) | Cormorant Garamond | Başlıklar, h1/h2, premium hiyerarşi |
| `font-mono` | sistem mono | Teknik değerler, kodlar, fiyatlar |

### Renk token'ları (CSS değişkeni + Tailwind utility; açık/koyu mod otomatik)
| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `background` | `#F8F6F3` | `#141414` | Sayfa zemini |
| `foreground` | `#1E1C1A` | `#F5F3F0` | Ana metin |
| `muted` | `#6B6560` | `#9C9894` | İkincil/gri metin |
| `accent` | `#8B6914` | `#c9a227` | Altın vurgu — CTA, link, badge |
| `accent-foreground` | `#FDFBF7` | `#1c1917` | Accent üzeri metin |
| `border` | `#E8E4DF` | `#2a2826` | Kenarlıklar |
| `card` | `#ffffff` | `#1c1c1c` | Kart/panel zemini |
| `surface-alt` / `-2` / `-3` | `#F5F1EC` / `#F0EBE6` / `#EBE6E0` | `#1a1a1a` / `#1e1e1e` / `#1a1a1a` | Yüzey katmanları |
| `surface-footer` | `#EDE9E4` | `#121212` | Footer zemini |

Kullanım: `bg-background`, `text-foreground`, `text-muted`, `bg-accent`,
`text-accent`, `border-border`, `bg-card`, `bg-surface-alt`, vb.

### Ortak utility sınıfları
- `.section-title` → `font-display text-2xl/3xl font-medium tracking-[-0.03em] text-foreground`
- `.section-subtitle` → `mt-3 text-[15px] leading-relaxed text-muted`
- `.range-slider` → özel slider (thumb `#d97706`, koyu uyumlu)
- `.hero-overlay` → kahraman bölüm overlay (tema-aware)

### Kurallar
1. **Asla hardcode hex kullanma** (UI/chrome için) → `text-foreground`, `bg-card`,
   `border-border`, `text-accent` kullan. (İstisna: kullanıcının seçtiği renk
   *değerleri* — örn. filigran rengi — veri olduğu için serbest.)
2. Başlık `font-display`, body `font-sans` (varsayılan), teknik değer `font-mono`.
3. Koyu mod otomatik gelir (`html.dark`) — token kullanınca ek iş gerekmez.
4. Kartlar `rounded-xl`/`rounded-2xl`. Neon/teknoloji estetiğinden kaçın; dil
   **sıcak lüks** (fildişi + antika altın + kömür).

## Remaura araçları renk paleti

Remaura sayfaları site genelinin altın `accent` token'ını değil, aşağıdaki
**gül/pembe** renk ailesini hardcode kullanır. Yeni Remaura sayfası/bileşeni
yazarken bu renklere uyu:

| Rol | Hex | Kullanım |
|---|---|---|
| Rose gold — birincil vurgu | `#b76e79` | badge, icon bg, border |
| Terracotta — sıcak ton | `#c69575` | border, icon, subtle bg |
| Şeftali — hafif ton | `#c8956c` | gradient, alt vurgu |
| Derin gül — CTA | `#c4838b` → `#a65f69` | buton gradient |
| Koyu pembe — güçlü vurgu | `#b85070` | link, etiket |
| Krem bej — metin üzeri | `#c9a88a` | açıklama metni, ikon tonu |

Zemin: Remaura sayfaları `bg-background` yerine `#07080a` / `#0a0b0e`
(derin siyah) ve `border-white/[0.06]` gibi düşük-opacity beyaz kenarlıklar
kullanır — `border-border` token'ından daha koyu.

**Kural:** Remaura araç sayfası = gül/pembe palette + derin siyah zemin.
Ana site sayfası = altın `accent` token + `--background` zemin.

## Ticari sır kuralı (KESİNLİKLE UYGULANACAK)

Kullandığımız AI ve 3D servis sağlayıcıları (Meshy, Tripo, Stability, OpenAI,
Gemini vb.) **ticari sırdır** — hiçbir kullanıcıya görünmeyecek.

1. **UI etiketleri:** Servis adı asla yazılmaz. `V1`, `V2` gibi nötr isimler kullanılır.
2. **Hata mesajları:** `"Meshy API anahtarı..."`, `"TRIPO_API_KEY..."` gibi ifadeler
   **kesinlikle yasak**. Bunun yerine: `"3D servisi yapılandırılmamış. Lütfen yönetici
   ile iletişime geçin."` gibi genel mesajlar kullanılır.
3. **Env değişken adları:** `MESHY_API_KEY`, `TRIPO3D_API_KEY` gibi isimler console
   log'larında veya client'a dönen response'larda görünmez.
4. **İç süreç açıklamaları:** "açı + işçilik", "arka planda hazırlama", "Gemini ile
   düzenleme" gibi teknik/süreç bilgisi UI'da **asla yazılmaz**. Kullanıcı sadece
   sonucu görür, nasıl çalıştığını değil.
4. **Bu kural tüm Remaura araçları için geçerlidir** — mevcut ve yeni tüm sayfalar.

## Remaura araçları (süper-admin, izole)
- `/remaura/koleksiyon-lab` — koleksiyon tutarlılığı deney alanı (Gemini).
- `/remaura/sosyal-boyut` — sosyal medya format motoru. Motor:
  `lib/remaura/sosyal-boyut/engine.ts` (çerçeveden bağımsız; ileride mini-Canva
  paylaşır). PRO arka plan/upscale → `/api/remaura/koleksiyon-edit/stability`.
- `/remaura/3d-uret` — izole 3D üretim paneli. V1 ve V2 motoru, süper-admin geçitli.
- Mevcut çalışan akışları **bozma**; yeni özellik = izole sayfa, olgunlaşınca taşı.
