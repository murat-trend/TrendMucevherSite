SORUN BULUNDU: /api/create-upload-url 500 Internal 
Server Error veriyor. Server-side çakıyor.

DİAGNOSTİK:

1. npm run dev çalıştığı terminalin son 50 satırını 
   göster. /api/create-upload-url çağrıldığında hangi 
   hata fırlatıyor?

2. app/api/create-upload-url/route.ts'in tam içeriğini 
   tekrar göster (geri getirilmiş hali). Özellikle:
   - import'lar — @aws-sdk/client-s3 ve 
     @aws-sdk/s3-request-presigner package.json'da 
     yüklü mü?
   - process.env çağrıları — env var isimleri 
     .env.local'daki ile birebir aynı mı?

3. .env.local'da şu değişkenler var mı (sadece var/yok, 
   değer GÖSTERME):
   - R2_ENDPOINT
   - R2_ACCESS_KEY_ID
   - R2_SECRET_ACCESS_KEY
   - R2_BUCKET_NAME
   - R2_PUBLIC_BASE_URL

4. package.json'da dependencies içinde:
   - @aws-sdk/client-s3 var mı? Hangi versiyon?
   - @aws-sdk/s3-request-presigner var mı? Hangi versiyon?

ŞU AN KOD DEĞİŞTİRME. Sadece raporla.