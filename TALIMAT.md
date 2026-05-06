components/home/HeroSection.tsx dosyasını baştan yaz. Şu mantıkla çalışsın:

Video 8 saniye. useRef ve useEffect kullan.

STATE:
- phase: 'main' | 'fadeout' | 'dark' | 'fadein'

TIMING (timeupdate event ile):
- 0 - 6.0sn → phase: 'main' (normal görünüm)
- 6.0 - 7.0sn → phase: 'fadeout' (video VE yazılar birlikte kararmaya başlar)
- 7.0 - 7.5sn → phase: 'dark' (tam karanlık, "by Murat Kaynaroğlu" görünür)
- video loop başlayınca → phase: 'fadein' (her şey geri gelir, 1sn sonra 'main' olur)

GÖRSEL:
- Video her zaman oynuyor, loop açık
- Video üstünde overlay div var
- phase 'fadeout' ve 'dark'ta overlay opacity artar (karanlık efekt)
- phase 'main' ve 'fadein'de overlay opacity azalır

YAZI:
- Ana başlık + alt başlık: phase 'main' ve 'fadein'de görünür, diğerlerinde opacity 0
- "by Murat Kaynaroğlu": sadece phase 'dark'ta görünür, italic, gold renk, merkezi

Transition'lar CSS transition ile yap, animasyon kütüphanesi kullanma.