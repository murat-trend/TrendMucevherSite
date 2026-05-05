Console temizliği — iki küçük hata:

HATA 1: rem-icon-192.png 404
- public/rem-icon-192.png dosyası yok ama bir yerde 
  referans var (manifest.json veya layout.tsx)
- Önce bul: grep -r "rem-icon-192" hangi dosyalarda 
  geçiyor
- Sonra:
  a) Eğer manifest.json'da ise ve dosya yoksa, o satırı 
     kaldır
  b) Veya: public/ içinde başka bir uygun icon var mı? 
     (favicon, logo PNG, vs.) Onu kullan
- Kullanıcıya hangi yolu seçtiğini söyle

HATA 2: scroll-behavior smooth uyarısı
- app/layout.tsx (veya benzer root layout) içinde 
  <html> elementinde:
  className="..." → className="..." data-scroll-behavior="smooth"
- Eğer scroll-behavior:smooth CSS olarak eklenmişse, 
  o kuralı KALDIR (HTML attribute kullan)

Sadece bu iki şeye dokun. Başka hiçbir şeye dokunma.

Bittiğinde değişiklikleri göster.