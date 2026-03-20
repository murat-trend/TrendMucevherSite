# Playground – Güvenli Deneme Alanı

Bu klasör ana projeyi etkilemeden kod denemeleri yapmak içindir.

## Kullanım

### 1. API üzerinden test (dev server gerekli)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
node playground/test-optimize.mjs
node playground/test-generate-prompt.mjs
```

### 2. Optimizer'ı doğrudan çalıştırma (API key gerekli)

`.env.local` dosyasında `OPENAI_API_KEY` tanımlı olmalı.

```bash
npm run playground
# veya argüman ile:
npm run playground -- "oksitlenmiş gümüş madalyon, Medusa"
```

## Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `test-optimize.mjs` | Optimize API'sini fetch ile test eder |
| `test-generate-prompt.mjs` | Generate API'sine gönderilecek prompt'u test eder |
| `test-optimize-local.ts` | Optimizer'ı doğrudan çalıştırır (API key kullanır) |
| `manuel-kontrol-merkezi.html` | Manuel Kontrol (HTML) – tarayıcıda aç |
| `ManuelKontrolMerkezi.tsx` | Manuel Kontrol (React) – **aktif, çalışan versiyon** |

### 4. Environment Rotate (API anahtarı yönetimi)

```bash
npm run env:backup    # .env.local yedeği al
npm run env:restore   # Son yedeği geri yükle
npm run env:template  # Yeni anahtarlar için şablon oluştur
```

Yedekler `playground/env-backups/` klasörüne kaydedilir.

### 5. Manuel Kontrol Merkezi (React – önerilen)

```bash
npm run dev
```

Tarayıcıda aç: **http://localhost:3000/playground/manuel-kontrol**

- Aktif kaydırma çubukları (Kontrast, Işık, Yumuşatma)
- Demo görseli yükle butonu
- Eskiz / görsel yükleme
- Taş maskesi, Invert, Alan tara

### 3. Manuel Kontrol Merkezi (HTML – tarayıcıda aç)

```bash
# Dosyayı tarayıcıda aç (çift tıkla veya):
start playground/manuel-kontrol-merkezi.html
```

Görsel yükle → Kontrast, parlaklık, yumuşatma ayarla → Taş maskesi / Invert dene.

## Not

- Bu klasördeki dosyalar `app/` veya `lib/`'e import etmez
- Ana proje build/çalışması etkilenmez
- İstediğin yeni test dosyalarını buraya ekleyebilirsin
