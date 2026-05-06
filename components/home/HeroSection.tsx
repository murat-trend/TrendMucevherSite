"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy: Record<string, {
  headline: string;
  sub: string;
  cta1: string;
  cta2: string;
}> = {
  tr: {
    headline: "Kutsal. Gotik. Efsanevi.",
    sub: "Her vizyona özel 3D mücevher modelleri",
    cta1: "Koleksiyona Göz At",
    cta2: "Davet Kodumu Kullan",
  },
  en: {
    headline: "Sacred. Gothic. Legendary.",
    sub: "3D jewelry models tailored for every vision",
    cta1: "Browse Collection",
    cta2: "Use My Invite Code",
  },
  de: {
    headline: "Heilig. Gotisch. Legendär.",
    sub: "3D-Schmuckmodelle für jede Vision",
    cta1: "Kollektion ansehen",
    cta2: "Meinen Einladungscode verwenden",
  },
  ru: {
    headline: "Сакральное. Готическое. Легендарное.",
    sub: "3D-модели украшений для каждого видения",
    cta1: "Смотреть коллекцию",
    cta2: "Использовать код приглашения",
  },
};

type Phase = 'main' | 'fadeout' | 'dark' | 'fadein';

export function HeroSection() {
  const { locale } = useLanguage();
  const c = copy[locale] ?? copy.tr;

  const videoRef       = useRef<HTMLVideoElement>(null);
  const darkOverlayRef = useRef<HTMLDivElement>(null);
  const contentRef     = useRef<HTMLDivElement>(null);
  const signatureRef   = useRef<HTMLDivElement>(null);
  const phaseRef       = useRef<Phase>('main');

  useEffect(() => {
    const video       = videoRef.current;
    const darkOverlay = darkOverlayRef.current;
    const content     = contentRef.current;
    const signature   = signatureRef.current;
    if (!video || !darkOverlay || !content || !signature) return;

    const applyPhase = (next: Phase) => {
      if (phaseRef.current === next) return;
      phaseRef.current = next;

      switch (next) {
        case 'main':
          darkOverlay.style.transition = 'opacity 1s ease';
          darkOverlay.style.opacity    = '0';
          content.style.transition     = 'opacity 0.8s ease';
          content.style.opacity        = '1';
          signature.style.transition   = 'opacity 0.4s ease';
          signature.style.opacity      = '0';
          break;

        case 'fadeout':
          darkOverlay.style.transition = 'opacity 1s ease';
          darkOverlay.style.opacity    = '1';
          content.style.transition     = 'opacity 1s ease';
          content.style.opacity        = '0';
          signature.style.transition   = 'opacity 0.3s ease';
          signature.style.opacity      = '0';
          break;

        case 'dark':
          // overlay zaten 1, sadece imzayı göster
          darkOverlay.style.opacity    = '1';
          content.style.opacity        = '0';
          signature.style.transition   = 'opacity 0.5s ease';
          signature.style.opacity      = '1';
          break;

        case 'fadein':
          darkOverlay.style.transition = 'opacity 1s ease';
          darkOverlay.style.opacity    = '0';
          content.style.transition     = 'opacity 0.8s ease';
          content.style.opacity        = '1';
          signature.style.transition   = 'opacity 0.4s ease';
          signature.style.opacity      = '0';
          break;
      }
    };

    const handleTimeUpdate = () => {
      const t = video.currentTime;

      if (t >= 7.0) {
        applyPhase('dark');
      } else if (t >= 6.0) {
        applyPhase('fadeout');
      } else if (t < 1.0) {
        // 0–1sn: loop başlangıcı, sadece dark'tan geçiş
        if (phaseRef.current === 'dark' || phaseRef.current === 'fadein') {
          applyPhase('fadein');
        }
      } else {
        // 1sn+ ve 6sn altı: normal görünüm
        if (phaseRef.current === 'fadein') {
          applyPhase('main');
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  return (
    <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden bg-black px-4 py-16 sm:py-20 md:py-24 lg:py-32">

      {/* Video arka plan */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/images/hero-poster.webp"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Sabit temel overlay (okunabilirlik) */}
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      {/* Dinamik karanlık overlay — phase ile kontrol edilir */}
      <div
        ref={darkOverlayRef}
        className="absolute inset-0 bg-black"
        style={{ opacity: 0 }}
        aria-hidden
      />

      {/* Sol sis */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1/5"
        style={{
          background: 'linear-gradient(to right, rgba(15,15,15,0.85) 0%, rgba(30,30,30,0.4) 40%, transparent 100%)',
          backdropFilter: 'blur(2px)',
        }}
        aria-hidden
      />

      {/* Sağ sis */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/5"
        style={{
          background: 'linear-gradient(to left, rgba(15,15,15,0.85) 0%, rgba(30,30,30,0.4) 40%, transparent 100%)',
          backdropFilter: 'blur(2px)',
        }}
        aria-hidden
      />

      {/* İçerik */}
      <div className="relative mx-auto max-w-4xl text-center">

        {/* Ana başlık + alt metin — fade-controlled */}
        <div className="relative">
          <div ref={contentRef}>
            <h1 className="font-display text-5xl font-bold tracking-[-0.02em] text-white sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6rem] xl:leading-[1.05]">
              {c.headline}
            </h1>
            <p className="mx-auto mt-8 max-w-[38ch] text-[15px] leading-[1.8] text-white/70 sm:mt-10 sm:text-base md:max-w-[44ch]">
              {c.sub}
            </p>
          </div>

          {/* İmza — sadece 'dark' phase'de görünür */}
          <div
            ref={signatureRef}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: 0 }}
            aria-hidden
          >
            <p className="font-display text-base italic tracking-[0.18em] text-[#c9a84c] sm:text-lg">
              by Murat Kaynaroğlu
            </p>
          </div>
        </div>

        {/* Butonlar — her zaman görünür */}
        <div className="mt-12 flex flex-col items-stretch justify-center gap-3 sm:mt-14 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <Link
            href="/modeller"
            className="flex h-[46px] items-center justify-center rounded-[999px] bg-[#c9a84c] px-7 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {c.cta1}
          </Link>
          <Link
            href="/davet"
            className="flex h-[46px] min-w-0 items-center justify-center rounded-[999px] border border-white/20 bg-transparent px-7 text-[15px] font-medium text-white/70 transition-all duration-300 ease-out hover:border-white/40 hover:bg-white/[0.06] hover:text-white"
          >
            {c.cta2}
          </Link>
        </div>

      </div>

      {/* Alt geçiş */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent"
        aria-hidden
      />
    </section>
  );
}
