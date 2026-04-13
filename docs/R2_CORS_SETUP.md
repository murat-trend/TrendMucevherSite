# R2 CORS Setup

Direct-to-R2 upload akışında tarayıcı, signed `PUT` URL'e doğrudan istek gönderir. Bu yüzden bucket tarafında uygun CORS izni yoksa tarayıcı isteği bloklar ve upload başarısız olur.

## Nereden ayarlanır

Cloudflare Dashboard içinde şu yolu izleyin:

1. `R2`
2. İlgili bucket
3. `Settings`
4. `CORS Policy`

Buraya aşağıdaki JSON'u ekleyin veya mevcut policy'yi buna göre güncelleyin:

```json
[
  {
    "AllowedOrigins": [
      "https://trendmucevher.com",
      "https://www.trendmucevher.com",
      "https://trend-mucevher-site.vercel.app"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## Neden gerekli

- Tarayıcı signed `PUT` isteğini doğrudan R2'ye yollar.
- R2 bucket bu origin'leri açıkça izinli görmezse tarayıcı CORS nedeniyle isteği reddeder.
- `GET` ve `HEAD` izinleri, yüklenen dosyanın erişim ve doğrulama akışlarında faydalıdır.
- `ETag` exposure, istemci tarafında upload doğrulaması gerekirse okunabilsin diye bırakılmıştır.

## Neden preview domain whitelist'te var

`https://trend-mucevher-site.vercel.app` alanı production dışındaki deploy / preview / doğrudan Vercel erişim senaryolarında direct upload testleri için gerekir. Sadece ana domainleri izinli bırakırsanız Vercel üstünden yapılan test yüklemeleri CORS nedeniyle başarısız olabilir.
