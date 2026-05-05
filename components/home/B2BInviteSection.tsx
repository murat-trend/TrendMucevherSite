"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy: Record<string, {
  tag: string;
  headline: string;
  quote: string;
  p1: string;
  p2: string;
  closing: string;
  cta: string;
  footnote: string;
  waitlistText: string;
  waitlistCta: string;
}> = {
  tr: {
    tag: "ÖZEL B2B ERİŞİMİ",
    headline: "Kaliteyi kendi atölyenizde test edin",
    quote: "Sözün bittiği yerde işçilik başlar.",
    p1: "Tasarım yaklaşımımı ve teknik hassasiyeti kendi atölyenizde görmeniz için size özel bir imkan sunuyorum.",
    p2: "Koleksiyonumdan seçeceğiniz herhangi bir (1) tasarımı ücretsiz indirin. Kısıtlama yok — dosyanın döküm kalitesini, taş yuvası uyumunu ve detay hassasiyetini kendi üretim parkurunuzda test edin.",
    closing: "Umarım tekrar görüşürüz.",
    cta: "Davet Kodumu Kullan ve Modeli Seç",
    footnote: "Bu ayrıcalık sadece davetiye gönderilen imalatçılar ve mücevher evleri için geçerlidir.",
    waitlistText: "Davetiniz yoksa: bekleme listesine yazılın, sıra geldiğinde bilgi vereyim.",
    waitlistCta: "Bekleme Listesine Katıl",
  },
  en: {
    tag: "EXCLUSIVE B2B ACCESS",
    headline: "Test the quality in your own workshop",
    quote: "Where words end, craftsmanship begins.",
    p1: "I offer you an exclusive opportunity to experience my design approach and technical precision in your own workshop.",
    p2: "Download any one (1) design from my collection for free. No restrictions — test the casting quality, stone setting compatibility, and detail precision on your own production line.",
    closing: "I hope we meet again.",
    cta: "Use My Invite Code and Select a Model",
    footnote: "This privilege is valid only for manufacturers and jewelry houses who have received an invitation.",
    waitlistText: "No invite? Join the waitlist and I'll let you know when it's your turn.",
    waitlistCta: "Join the Waitlist",
  },
  de: {
    tag: "EXKLUSIVER B2B-ZUGANG",
    headline: "Testen Sie die Qualität in Ihrer eigenen Werkstatt",
    quote: "Wo Worte enden, beginnt das Handwerk.",
    p1: "Ich biete Ihnen eine exklusive Möglichkeit, meinen Designansatz und meine technische Präzision in Ihrer eigenen Werkstatt zu erleben.",
    p2: "Laden Sie ein (1) beliebiges Design aus meiner Kollektion kostenlos herunter. Keine Einschränkungen — testen Sie die Gussqualität, die Steinfassungskompatibilität und die Detailpräzision in Ihrer eigenen Produktion.",
    closing: "Ich hoffe, wir sehen uns wieder.",
    cta: "Meinen Einladungscode verwenden und Modell auswählen",
    footnote: "Dieses Privileg gilt nur für Hersteller und Schmuckhäuser, die eine Einladung erhalten haben.",
    waitlistText: "Keine Einladung? Tragen Sie sich in die Warteliste ein, ich melde mich, wenn Sie an der Reihe sind.",
    waitlistCta: "Zur Warteliste",
  },
  ru: {
    tag: "ЭКСКЛЮЗИВНЫЙ B2B ДОСТУП",
    headline: "Протестируйте качество в своей мастерской",
    quote: "Там, где заканчиваются слова, начинается мастерство.",
    p1: "Я предлагаю вам эксклюзивную возможность оценить мой подход к дизайну и техническую точность в вашей собственной мастерской.",
    p2: "Скачайте любой один (1) дизайн из моей коллекции бесплатно. Без ограничений — протестируйте качество литья, совместимость с закрепкой камней и точность деталей на вашей собственной производственной линии.",
    closing: "Надеюсь, мы снова встретимся.",
    cta: "Использовать код приглашения и выбрать модель",
    footnote: "Эта привилегия действительна только для производителей и ювелирных домов, получивших приглашение.",
    waitlistText: "Нет приглашения? Запишитесь в лист ожидания — я сообщу, когда придёт ваша очередь.",
    waitlistCta: "Записаться в лист ожидания",
  },
};

export function B2BInviteSection() {
  const { locale } = useLanguage();
  const c = copy[locale] ?? copy.tr;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      {/* Ana B2B kartı */}
      <div className="rounded-2xl border border-[#c9a84c]/25 bg-gradient-to-br from-[#c9a84c]/10 via-[#c9a84c]/5 to-transparent p-8 sm:p-10">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c9a84c]">
          {c.tag}
        </p>

        <h2 className="font-display text-2xl font-light tracking-wide text-foreground sm:text-3xl">
          {c.headline}
        </h2>

        <p className="mt-5 font-display text-base italic text-muted/70 sm:text-lg">
          &ldquo;{c.quote}&rdquo;
        </p>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
          {c.p1}
        </p>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
          {c.p2}
        </p>

        <p className="mt-4 text-sm text-muted/60">
          {c.closing}
        </p>

        <div className="mt-7">
          <Link
            href="/davet"
            className="inline-flex items-center justify-center rounded-full bg-[#c9a84c] px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {c.cta} →
          </Link>
        </div>

        <p className="mt-4 text-[11px] italic text-muted/50">
          {c.footnote}
        </p>
      </div>

      {/* İkincil — bekleme listesi */}
      <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-border/30 bg-surface/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted/70">
          {c.waitlistText}
        </p>
        <Link
          href="/bekleme-listesi"
          className="shrink-0 rounded-full border border-border/50 px-5 py-2 text-sm text-muted/80 transition-colors hover:border-border hover:text-foreground"
        >
          {c.waitlistCta}
        </Link>
      </div>
    </section>
  );
}
