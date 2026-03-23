# Remaura Billing (Virtual POS Ready)

Bu altyapi banka sanal POS entegrasyonu icin hazirdir.

## Akis

1. Kullanici icerik uretimi tetikler (`/api/remaura/analyze-jewelry`).
2. Sunucu 1 kredi dusmeye calisir.
3. Kredi yoksa `402` doner ve checkout session olusturur.
4. Frontend checkout linkine yonlendirir.
5. Banka odeme sonucu webhook'a gelir (`/api/billing/webhook/virtual-pos`).
6. Webhook odeme basariliysa kullaniciya kredi ekler.

## API Uclari

- `GET /api/billing/wallet?userId=...`
- `POST /api/billing/checkout/create`
- `POST /api/billing/webhook/virtual-pos`

## Veri Saklama

- Dosya tabanli store: `data/billing/store.json`
- Icerik:
  - wallets
  - ledger
  - payment sessions

## Banka Entegrasyonu

Gercek bankaya geciste su dosyayi degistirmeniz yeterli:

- `lib/billing/provider.ts`
- `lib/billing/providers/halkbank.ts`

`createVirtualPosCheckout()` fonksiyonunda:
- banka checkout URL'i
- provider reference
- callback URL parametreleri

uyarlanir.

## Halkbank callback route'lari

- Basarili odeme callback:
  - `GET/POST /api/billing/callback/halkbank/success`
- Basarisiz odeme callback:
  - `GET/POST /api/billing/callback/halkbank/fail`

Bu route'lar odeme sonucunda `remaura` sayfasina geri yonlendirir.
Basari callback'i session'i `paid` yapar ve kredi yukler.

## Halkbank ENV

`.env.local`:

- `VPOS_PROVIDER=halkbank`
- `HALKBANK_CHECKOUT_BASE_URL=...`
- `HALKBANK_MERCHANT_ID=...`
- `HALKBANK_CURRENCY=TRY`

## Guvenlik

- Webhook imza dogrulamasi:
  - Header: `x-vpos-signature`
  - Secret: `VPOS_WEBHOOK_SECRET`
- Secret yoksa imza kontrolu bypass edilir (dev modu).

## Not

Bu MVP'de auth sistemi olmadigi icin `userId` istemci tarafinda uretilir.
Uretimde auth entegre edilince `userId` sunucu session'dan alinmalidir.
