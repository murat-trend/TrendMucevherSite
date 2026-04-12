import type { Metadata } from "next";
import Link from "next/link";
import {
  Box,
  CheckCircle2,
  Globe,
  ImageIcon,
  Layers,
  RefreshCw,
  Ruler,
  Search,
  Sparkles,
  Store,
  Video,
  Wand2,
} from "lucide-react";

const pageUrl = "https://trendmucevher.com/remaura/nedir";

export const metadata: Metadata = {
  title: "REMAURA AI Nedir? | Yapay Zeka ile Mücevher Tasarımı ve 3D Üretim Platformu",
  description:
    "REMAURA AI, takı ve dijital üretim sektörüne özel tasarımdan satışa kadar tüm süreci otomatikleştiren dünyanın ilk yapay zekâ destekli uçtan uca üretim ve satış platformudur.",
  alternates: { canonical: "/remaura/nedir" },
  keywords: [
    "REMAURA AI",
    "yapay zeka mücevher tasarımı",
    "3D takı modeli",
    "dijital mücevher üretim platformu",
    "AI takı tasarımı",
  ],
  openGraph: {
    title: "REMAURA AI Nedir? | Yapay Zeka ile Mücevher Tasarımı",
    description: "Tasarımdan satışa tek platform. REMAURA AI ile mücevher sektöründe dijital dönüşüm.",
    url: pageUrl,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "REMAURA AI",
  description:
    "Takı ve dijital üretim sektörüne özel, tasarımdan satışa kadar süreçleri yapay zekâ ile destekleyen uçtan uca üretim ve satış platformu.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TRY",
  },
};

const activeFeatures = [
  {
    icon: Wand2,
    title: "Yapay Zekâ ile Tasarım Üretimi",
    text: "Metinden tasarım üretme, referans görselden varyasyon oluşturma, özgün konsept geliştirme, üretim odaklı detaylı tasarım hazırlama",
  },
  {
    icon: Layers,
    title: "Stil Analizi ve Koleksiyon Oluşturma",
    text: "Marka DNA'sını analiz eder, tasarım stilinizi öğrenir, tutarlı koleksiyonlar oluşturur, seri varyasyonlar üretir, tematik/sezonluk koleksiyonlar hazırlar",
  },
  {
    icon: Search,
    title: "SEO Uyumlu İçerik Üretimi",
    text: "SEO uyumlu ürün açıklamaları, arama motoru dostu başlıklar, platforma özel etiketler, dönüşüm odaklı hashtag önerileri",
  },
  {
    icon: Box,
    title: "Görselleri 3D Modele Dönüştürme",
    text: "Görselden 3D model oluşturma, yüksek detaylı mesh üretimi, üretime uygun geometri hazırlama, teknik model optimizasyonu",
  },
  {
    icon: Ruler,
    title: "Ring Size ve Teknik Ölçeklendirme",
    text: "Yüzük ölçüsü dönüştürme, teknik ölçekleme, ölçü standardizasyonu, üretim toleransı optimizasyonu",
  },
  {
    icon: RefreshCw,
    title: "GLB / STL Dönüştürme",
    text: "GLB to STL, STL to GLB, format dönüştürme optimizasyonu",
  },
  {
    icon: Video,
    title: "3D Modelden Video Üretimi",
    text: "360 derece ürün videoları, sosyal medya uyumlu reels/shorts, tanıtım videoları, platform uyumlu video export",
  },
  {
    icon: ImageIcon,
    title: "Fotoğraf İyileştirme ve Arka Plan Kaldırma",
    text: "Arka plan kaldırma, netlik artırma, ışık/kontrast düzeltme, stüdyo kalitesi görünüm",
  },
  {
    icon: Store,
    title: "Üret, Listele, Sat",
    text: "Üretilen modelleri satışa çıkarma, dijital ürünlerden gelir elde etme, global pazara erişim, pasif gelir fırsatı",
  },
];

const comingSoon = [
  "Platforma Özel Pazarlama Görselleri (Instagram, Etsy, Shopify, Amazon, reklam banner kreatifleri)",
  "Gelişmiş Mesh Optimizasyonu (Mesh Cleanup, Polygon Reduction, Otomatik Topoloji İyileştirme)",
];

const nelerMumkun = [
  "Daha hızlı ürün geliştirme",
  "Daha düşük operasyon maliyeti",
  "Daha fazla ürün çeşitliliği",
  "Global pazarda satış fırsatı",
  "Pasif gelir modeli oluşturma",
  "Daha güçlü dijital rekabet avantajı",
];

export default function RemauraNedirPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-[#07080a] text-zinc-200">
        <section className="relative overflow-hidden border-b border-white/[0.08]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(198,149,117,0.18),transparent)]" />
          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a88a]">Trend Mücevher</p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
              REMAURA AI Nedir?
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              REMAURA AI, takı ve dijital üretim sektörüne özel geliştirilen, tasarımdan satışa kadar tüm süreci
              otomatikleştiren dünyanın ilk yapay zekâ destekli uçtan uca üretim ve satış platformudur. Tek bir sistem
              üzerinden tasarım oluşturur, koleksiyon geliştirir, 3D model hazırlar, teknik dosyaları optimize eder ve
              kullanıcıların ürettikleri ürünleri global pazara sunmalarını sağlar.
            </p>
            <Link
              href="/remaura"
              className="mt-10 inline-flex items-center justify-center rounded-full border border-[#c69575]/50 bg-gradient-to-r from-[#c69575]/20 to-[#a65f69]/20 px-8 py-3 text-sm font-semibold text-[#f0dcc8] shadow-[0_0_0_1px_rgba(198,149,117,0.15)_inset] transition-colors hover:border-[#c69575]/70 hover:from-[#c69575]/30 hover:to-[#a65f69]/30"
            >
              Hemen Dene
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-center text-2xl font-semibold text-zinc-50 sm:text-3xl">Aktif özellikler</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-500">
            Bugün platformda kullanabileceğiniz başlıca modüller.
          </p>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeFeatures.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12141a]/95 via-[#0c0d11] to-[#08090c] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c69575]/25 bg-[#c69575]/10 text-[#c9a88a]">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-white/[0.06] bg-[#0a0b0e]/80">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="font-display text-center text-2xl font-semibold text-zinc-50 sm:text-3xl">Yakında gelecekler</h2>
            <p className="mx-auto mt-3 text-center text-sm text-zinc-500">
              Yol haritamızda önceliklendirdiğimiz geliştirmeler.
            </p>
            <ul className="mt-8 space-y-4">
              {comingSoon.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 text-sm text-zinc-400"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c69575]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-center text-2xl font-semibold text-zinc-50 sm:text-3xl">Neden farklı?</h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-zinc-400">
            REMAURA AI yalnızca bir üretim aracı değildir. Tasarım, koleksiyon geliştirme, 3D modelleme, teknik
            optimizasyon ve dijital satış altyapısını tek platformda birleştiren ilk yapay zekâ ekosistemidir.
          </p>

          <div className="mt-14 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10">
            <div className="flex items-center justify-center gap-2 text-[#c9a88a]">
              <Sparkles className="h-6 w-6 shrink-0" aria-hidden />
              <h3 className="font-display text-center text-xl font-semibold text-zinc-50 sm:text-2xl">
                REMAURA AI ile Neler Mümkün?
              </h3>
            </div>
            <ul className="mx-auto mt-8 max-w-xl space-y-3">
              {nelerMumkun.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500/90" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-[#0a0b0e]/60">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[#c69575]/25 bg-[#c69575]/10 text-[#c9a88a]">
              <Globe className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-6 font-display text-2xl font-semibold text-zinc-50 sm:text-3xl">Çok Dilli Altyapı</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              REMAURA AI global kullanıcı kitlesi için çok dilli altyapıyla geliştirilmiştir.
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-300">
              Desteklenen diller: Türkçe, İngilizce, Almanca, Rusça
            </p>
          </div>
        </section>

        <section className="border-t border-white/[0.08] bg-gradient-to-b from-[#0c0d11] to-[#07080a] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-xl font-semibold text-zinc-50 sm:text-2xl">REMAURA AI&apos;ı Dene</h2>
            <p className="mt-3 text-sm text-zinc-500">Kredi paketleri ve kullanım seçenekleri için fiyatlandırmayı inceleyin.</p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/remaura"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#c4838b] to-[#a65f69] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-95"
              >
                Çalışma alanına git
              </Link>
              <Link
                href="/fiyatlandirma"
                className="inline-flex items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.04] px-6 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.07]"
              >
                Fiyatlandırma
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
