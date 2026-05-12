"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

const CONTENT = {
  tr: {
    badge: "Murat Kaynaroğlu",
    title: "MatrixGold",
    titleAccent: "Türkçe Eğitim Seti",
    desc: "Sıfırdan ileri seviyeye kadar kapsamlı MatrixGold eğitimi. Yaklaşık 22 saatlik Türkçe video içerik, kişisel destek ve isteğe bağlı canlı bağlantı seçeneğiyle mücevher tasarımında profesyonel düzeye ulaşın.",
    ctaWhatsapp: "WhatsApp ile İletişim",
    priceBadge: "Tek Seferlik Ücret",
    priceSub: "Tüm modüller · Destek dahil",
    ctaStart: "Hemen Başla",
    ctaYoutube: "YouTube Kanalı",
    includedTitle: "Pakete Dahil Olanlar",
    included: [
      { ikon: "▶", metin: "~22 saat Türkçe video içerik" },
      { ikon: "💬", metin: "Kişisel WhatsApp destek hattı" },
      { ikon: "🎥", metin: "İsteğe bağlı canlı bağlantı seçeneği" },
      { ikon: "📁", metin: "Proje dosyaları ve kaynak materyaller" },
      { ikon: "🏆", metin: "Sıfırdan ileri seviye — tek paket" },
    ],
    curriculumTitle: "Eğitim Müfredatı",
    total: "Toplam",
    modules: [
      { no: "01", baslik: "Arayüz ve Temel Araçlar",            sure: "~1.5 saat" },
      { no: "02", baslik: "Yüzük ve Kaşlı Tasarımlar",          sure: "~2.5 saat" },
      { no: "03", baslik: "Kolye ve Pendant Geometrisi",         sure: "~2 saat"   },
      { no: "04", baslik: "Bilezik ve Kelepçe Yapıları",         sure: "~2 saat"   },
      { no: "05", baslik: "Taş Yerleştirme ve Pave Tekniği",     sure: "~3 saat"   },
      { no: "06", baslik: "Organik Formlar ve Sculpt",           sure: "~2.5 saat" },
      { no: "07", baslik: "Render ve Sunum Hazırlama",           sure: "~2 saat"   },
      { no: "08", baslik: "Döküme Hazırlık ve STL Export",       sure: "~2 saat"   },
      { no: "09", baslik: "İleri Teknikler ve Proje",            sure: "~4 saat"   },
    ],
    forWhomTitle: "Bu Eğitim Kimler İçin?",
    forWhom: [
      "MatrixGold'a sıfırdan başlamak isteyenler",
      "Kuyumculuk ve mücevher sektöründe çalışanlar",
      "3D tasarımla dökümhane için model üretmek isteyenler",
      "Mevcut bilgisini ileri seviyeye taşımak isteyenler",
      "Freelance mücevher tasarımcısı olmak isteyenler",
      "Kendi tasarımlarını dijital ortamda üretmek isteyenler",
    ],
    instructorTitle: "Eğitmen Hakkında",
    instructorBadge: "Tasarımcı & Eğitmen",
    instructorBio: "Mücevher tasarımı ve dijital üretim alanında yılların deneyimiyle MatrixGold, Rhinoceros ve yapay zeka destekli üretim teknolojileri konusunda uzmanlaşmış bir tasarımcı ve eğitmendir. Sektördeki gerçek projelere dayanan, uygulamalı ve doğrudan iş hayatına aktarılabilir bir eğitim anlayışıyla ders vermektedir.",
    ctaTitle: "Başlamaya Hazır Mısınız?",
    ctaDesc: "Sorularınız için WhatsApp veya telefon ile ulaşabilirsiniz. Canlı bağlantı seçeneği ve kişisel destek hattı ile yanınızdayım.",
    ctaWhatsapp2: "WhatsApp ile Yazın",
  },
  en: {
    badge: "Murat Kaynaroğlu",
    title: "MatrixGold",
    titleAccent: "Jewelry Design Course",
    desc: "Comprehensive MatrixGold training from beginner to advanced level. Approximately 22 hours of Turkish-language video content, personal support, and optional live session — reach a professional standard in jewelry design.",
    ctaWhatsapp: "Contact via WhatsApp",
    priceBadge: "One-Time Fee",
    priceSub: "All modules · Support included",
    ctaStart: "Get Started",
    ctaYoutube: "YouTube Channel",
    includedTitle: "What's Included",
    included: [
      { ikon: "▶", metin: "~22 hours of Turkish video content" },
      { ikon: "💬", metin: "Personal WhatsApp support line" },
      { ikon: "🎥", metin: "Optional live one-on-one sessions" },
      { ikon: "📁", metin: "Project files and source materials" },
      { ikon: "🏆", metin: "Beginner to advanced — single package" },
    ],
    curriculumTitle: "Course Curriculum",
    total: "Total",
    modules: [
      { no: "01", baslik: "Interface & Core Tools",              sure: "~1.5 hrs" },
      { no: "02", baslik: "Ring & Bezel Designs",               sure: "~2.5 hrs" },
      { no: "03", baslik: "Necklace & Pendant Geometry",        sure: "~2 hrs"   },
      { no: "04", baslik: "Bracelet & Cuff Structures",         sure: "~2 hrs"   },
      { no: "05", baslik: "Stone Setting & Pavé Technique",     sure: "~3 hrs"   },
      { no: "06", baslik: "Organic Forms & Sculpting",          sure: "~2.5 hrs" },
      { no: "07", baslik: "Rendering & Presentation",           sure: "~2 hrs"   },
      { no: "08", baslik: "Casting Prep & STL Export",          sure: "~2 hrs"   },
      { no: "09", baslik: "Advanced Techniques & Project",      sure: "~4 hrs"   },
    ],
    forWhomTitle: "Who Is This Course For?",
    forWhom: [
      "Those starting MatrixGold from scratch",
      "Professionals working in jewelry and goldsmithing",
      "Designers producing 3D models for casting",
      "Those looking to advance their existing skills",
      "Aspiring freelance jewelry designers",
      "Anyone who wants to produce their own designs digitally",
    ],
    instructorTitle: "About the Instructor",
    instructorBadge: "Designer & Instructor",
    instructorBio: "With years of experience in jewelry design and digital manufacturing, Murat Kaynaroğlu specializes in MatrixGold, Rhinoceros, and AI-assisted production technologies. His teaching approach is hands-on and built around real industry projects — directly applicable to professional practice.",
    ctaTitle: "Ready to Get Started?",
    ctaDesc: "Reach out via WhatsApp or phone with any questions. Personal support and optional live sessions are available.",
    ctaWhatsapp2: "Message on WhatsApp",
  },
} as const;

type LangKey = keyof typeof CONTENT;

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.49 2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L.057 23.5l5.797-1.52A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.374l-.36-.214-3.44.902.918-3.352-.234-.374A9.818 9.818 0 1 1 12 21.818z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function MatrixGoldClient() {
  const { locale } = useLanguage();
  const lang: LangKey = locale === "en" || locale === "de" || locale === "ru" ? "en" : "tr";
  const c = CONTENT[lang];

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Hero */}
      <div className="mb-14 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">
          {c.badge}
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-5xl lg:text-6xl">
          {c.title}
          <br className="hidden sm:block" />{" "}
          <span className="text-[#c9a84c]">{c.titleAccent}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-[15px] leading-[1.85] text-muted">
          {c.desc}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/905435051954"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[999px] bg-[#c9a84c] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon />
            {c.ctaWhatsapp}
          </a>
          <a
            href="tel:05435051954"
            className="inline-flex items-center gap-2 rounded-[999px] border border-border bg-card px-7 py-3 text-sm font-medium text-foreground/80 transition-all hover:border-[#c9a84c]/40 hover:text-foreground"
          >
            <PhoneIcon />
            0543 505 19 54
          </a>
        </div>
      </div>

      {/* Fiyat kartı */}
      <div className="mb-12 rounded-xl border border-[#c9a84c]/30 bg-[#c9a84c]/5 p-6 text-center sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">{c.priceBadge}</p>
        <p className="mt-2 font-display text-5xl font-semibold tracking-[-0.02em] text-foreground">
          ₺7.500
        </p>
        <p className="mt-2 text-sm text-muted">{c.priceSub}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="https://wa.me/905435051954?text=MatrixGold%20e%C4%9Fitim%20seti%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[999px] bg-[#c9a84c] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {c.ctaStart}
          </a>
          <a
            href="https://www.youtube.com/@muratkaynaroglu34"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[999px] border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground/75 transition-all hover:border-[#c9a84c]/30 hover:text-foreground"
          >
            <YouTubeIcon />
            {c.ctaYoutube}
          </a>
        </div>
      </div>

      {/* Pakete dahil */}
      <section className="mb-12">
        <h2 className="font-display mb-6 text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
          {c.includedTitle}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {c.included.map((item) => (
            <div
              key={item.metin}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5"
            >
              <span className="mt-0.5 shrink-0 text-base leading-none">{item.ikon}</span>
              <span className="text-[14px] leading-snug text-foreground/85">{item.metin}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Müfredat */}
      <section className="mb-12">
        <h2 className="font-display mb-6 text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
          {c.curriculumTitle}
        </h2>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="divide-y divide-border/60">
            {c.modules.map((m) => (
              <div key={m.no} className="flex items-center gap-4 px-5 py-3.5">
                <span className="font-display shrink-0 text-[13px] font-medium text-[#c9a84c]">
                  {m.no}
                </span>
                <span className="flex-1 text-[14px] text-foreground/85">{m.baslik}</span>
                <span className="shrink-0 text-[13px] text-muted">{m.sure}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 bg-[#c9a84c]/5 px-5 py-3.5">
            <span className="text-[13px] font-semibold uppercase tracking-wider text-foreground/70">
              {c.total}
            </span>
            <span className="font-display text-base font-semibold text-[#c9a84c]">~22 {lang === "tr" ? "saat" : "hrs"}</span>
          </div>
        </div>
      </section>

      {/* Kimler için */}
      <section className="mb-12">
        <h2 className="font-display mb-6 text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
          {c.forWhomTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {c.forWhom.map((m) => (
            <div key={m} className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-foreground/[0.02] px-4 py-3">
              <CheckIcon />
              <span className="text-[14px] leading-snug text-foreground/85">{m}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Eğitmen */}
      <section className="mb-12">
        <h2 className="font-display mb-6 text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
          {c.instructorTitle}
        </h2>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">{c.instructorBadge}</p>
          <h3 className="font-display mt-1 text-xl font-medium text-foreground">Murat Kaynaroğlu</h3>
          <p className="mt-3 text-[14px] leading-[1.85] text-muted">{c.instructorBio}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://www.youtube.com/@muratkaynaroglu34"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[999px] border border-border px-4 py-2 text-[13px] font-medium text-foreground/75 transition-all hover:border-[#c9a84c]/30 hover:text-foreground"
            >
              <YouTubeIcon />
              YouTube
            </a>
            <a
              href="https://wa.me/905435051954"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[999px] border border-border px-4 py-2 text-[13px] font-medium text-foreground/75 transition-all hover:border-[#c9a84c]/30 hover:text-foreground"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Alt CTA */}
      <div className="rounded-xl border border-border/60 bg-foreground/[0.02] px-6 py-8 text-center">
        <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-foreground">
          {c.ctaTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-relaxed text-muted">
          {c.ctaDesc}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://wa.me/905435051954?text=MatrixGold%20e%C4%9Fitim%20seti%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[999px] bg-[#c9a84c] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {c.ctaWhatsapp2}
          </a>
          <a
            href="tel:05435051954"
            className="inline-flex items-center gap-2 rounded-[999px] border border-border bg-card px-7 py-3 text-sm font-medium text-foreground/75 transition-all hover:border-[#c9a84c]/30 hover:text-foreground"
          >
            0543 505 19 54
          </a>
        </div>
      </div>

    </main>
  );
}
