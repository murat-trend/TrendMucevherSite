# Günlük Dashboard PDF Raporu

Her gece **Türkiye saatiyle 00:00** civarında PDF üretmek için Vercel Cron **UTC** kullanır. Örnek: TR saati 00:00 ≈ **UTC 21:00 (önceki gün)** → `vercel.json` içinde `0 21 * * *` tanımlıdır. Kendi saat diliminize göre cron ifadesini güncelleyin.

## Ne yapar?

1. `GET /api/cron/daily-dashboard-report` çağrılır.
2. PDF oluşturulur ve proje kökünde **`Reports/Dashboard-YYYY-MM-DD.pdf`** olarak kaydedilir.
3. İsteğe bağlı: **e-posta** (SMTP) ve/veya **webhook** (JSON + base64 PDF) ile gönderilir.

## Rapor içeriği (sıra)

1. **Kritik stok** — Yarın sabah öncelikli sipariş / tedarik için ürünler (en düşük stok üstte).
2. **Net kâr** — Ciro − COGS − reklam − iade kaybı (masraflar sonrası kalan tutar).
3. **İptal / iade analizi** — Günlük iade adedi ve sebep dağılımı (küçük notlar).

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `CRON_SECRET` | Zorunlu (üretim). İstek: `Authorization: Bearer <CRON_SECRET>`. Vercel Cron bu başlığı otomatik ekleyebilir. |
| `REPORT_EMAIL_TO` | PDF’in gönderileceği e-posta |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP (ör. Gmail uygulama şifresi, SendGrid, vb.) |
| `REPORT_EMAIL_FROM` | Gönderen adres (opsiyonel) |
| `REPORT_DELIVERY_WEBHOOK_URL` | PDF’i JSON ile alan URL (kendi Google Drive / Dropbox köprünüz, Zapier, Make, vb.) |
| `REPORT_WEBHOOK_SECRET` | Webhook `Authorization: Bearer` için (opsiyonel) |

## Google Drive / Dropbox

Doğrudan OAuth entegrasyonu bu repoda yok; pratik yollar:

- **Zapier / Make**: Webhook modülü `REPORT_DELIVERY_WEBHOOK_URL` olarak verilir; akışta “Upload to Google Drive” eklenir.
- **Kendi API route’unuz**: `pdfBase64` alanını decode edip Drive API ile yükleyin.

## Yerel / Windows görev zamanlayıcı

```powershell
# .env içinde CRON_SECRET tanımlı olsun
curl -H "Authorization: Bearer %CRON_SECRET%" http://localhost:3000/api/cron/daily-dashboard-report
```

Üretim URL’si için `https://your-domain.com/api/cron/daily-dashboard-report` kullanın.

## Veri kaynağı

Şu an rapor, `marketing-dashboard-constants` ve örnek ürün listesi ile beslenir. ERP / sipariş / iade API’lerine bağlandığında `lib/reports/daily-report-data.ts` güncellenmelidir.
