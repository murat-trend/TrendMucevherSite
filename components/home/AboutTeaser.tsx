"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const copy: Record<string, { tag: string; name: string; p1: string; p2: string; p3: string; cta: string }> = {
  tr: {
    tag: "Tasarımcı Hakkında",
    name: "Murat Kaynaroğlu",
    p1: "Mücevher tasarımı 2005'ten beri yaptığım iş. Medya, sanat ve spor dünyasının çeşitli isimlerine özel tasarımlar üretmiş bir kariyer.",
    p2: "2018'de, 3D modelleme ve mücevher yazılımları üzerine ilk eğitim setimi hazırladım. O günden bu yana dünyanın farklı bölgelerinden meslektaşlarımla deneyimlerimi paylaşıyorum.",
    p3: "Bu koleksiyon, 20 yılı aşan bu deneyimin doğal devamı.",
    cta: "Hikâyem ve Felsefem →",
  },
  en: {
    tag: "About the Designer",
    name: "Murat Kaynaroğlu",
    p1: "Jewelry design has been my work since 2005. A career that has produced custom designs for notable names in the media, arts, and sports world.",
    p2: "In 2018, I prepared my first training set on 3D modeling and jewelry software. Since then, I have been sharing my experience with colleagues from different parts of the world.",
    p3: "This collection is the natural continuation of that 20-year journey.",
    cta: "My Story and Philosophy →",
  },
  de: {
    tag: "Über den Designer",
    name: "Murat Kaynaroğlu",
    p1: "Schmuckdesign ist meine Arbeit seit 2005. Eine Karriere, in der ich individuelle Designs für bekannte Namen aus Medien, Kunst und Sport erstellt habe.",
    p2: "2018 erstellte ich mein erstes Schulungsset zu 3D-Modellierung und Schmucksoftware. Seitdem teile ich meine Erfahrungen mit Kollegen aus verschiedenen Teilen der Welt.",
    p3: "Diese Kollektion ist die natürliche Fortsetzung dieser 20-jährigen Erfahrung.",
    cta: "Meine Geschichte und Philosophie →",
  },
  ru: {
    tag: "О дизайнере",
    name: "Murat Kaynaroğlu",
    p1: "Ювелирный дизайн — моя работа с 2005 года. Карьера, в которой я создавал эксклюзивные дизайны для известных людей из мира медиа, искусства и спорта.",
    p2: "В 2018 году я подготовил свой первый учебный курс по 3D-моделированию и ювелирным программам. С тех пор я делюсь своим опытом с коллегами из разных уголков мира.",
    p3: "Эта коллекция — естественное продолжение этого 20-летнего опыта.",
    cta: "Моя история и философия →",
  },
};

export function AboutTeaser() {
  const { locale } = useLanguage();
  const c = copy[locale] ?? copy.tr;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-xl border border-border/30 bg-surface/50 p-8 sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">
          {c.tag}
        </p>
        <h2 className="font-display text-xl font-light tracking-wide text-foreground sm:text-2xl">
          {c.name}
        </h2>
        <div className="mt-4 max-w-xl space-y-3 text-sm leading-relaxed text-muted sm:text-base">
          <p>{c.p1}</p>
          <p>{c.p2}</p>
          <p>{c.p3}</p>
        </div>
        <Link
          href="/hakkimda"
          className="mt-5 inline-block text-sm text-[#c9a84c] hover:underline"
        >
          {c.cta}
        </Link>
      </div>
    </section>
  );
}
