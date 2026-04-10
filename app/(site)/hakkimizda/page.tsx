"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function HakkimizdaPage() {
  const { locale } = useLanguage();

  const content = {
    tr: {
      title: "Hakkımızda",
      subtitle: "Mücevherde Yapay Zeka Çağını Başlatan İsim",
      story: [
        "2005 yılından bu yana tekstil, mobilya, ayakkabı ve çanta gibi pek çok sektörde tasarım yapan Murat Kaynaroğlu, doğal taşlarla tanışmasının ardından mücevher dünyasına adım attı. Taşların büyüsü ve estetiği, onu bu alanda derinleşmeye yöneltti.",
        "2018 yılında Türkiye'nin mücevherat sektöründe ilk dijital eğitim setini hazırlayarak tarihe geçti. 2.000'den fazla kişiye Türkiye ve dünyanın dört bir yanında verdiği eğitimlerle sektöre çığır açan bir katkı sağladı.",
        "Gelişen teknolojiyi ve dijital dönüşümü erken kavrayan Murat Kaynaroğlu, yapay zekayı mücevherat sektörüne ilk ve tek uygulayan isim oldu. Bu vizyonla geliştirdiği Remaura AI platformu; tasarımcılara, satıcılara ve meraklılara yapay zeka destekli 3D mücevher tasarımı imkânı sunmaktadır.",
        "Murat Kaynaroğlu ve The AI Mücevherat olmak üzere iki şirketin kurucusu olan Kaynaroğlu, aynı zamanda kurumlara özel danışmanlık hizmetleri de vermektedir.",
      ],
      mission: "Misyonumuz",
      missionText:
        "Yapay zeka ile mücevher tasarımını demokratikleştirmek; her tasarımcının, her satıcının ve her hayalinin bir forma kavuşmasını sağlamak.",
      vision: "Vizyonumuz",
      visionText: "Türkiye'den dünyaya açılan, yapay zeka destekli mücevher tasarım ekosisteminin öncüsü olmak.",
      stats: [
        { value: "2005", label: "Tasarım Yolculuğu" },
        { value: "2000+", label: "Eğitim Verilen Kişi" },
        { value: "2018", label: "İlk Dijital Eğitim Seti" },
        { value: "2", label: "Şirket" },
      ],
    },
    en: {
      title: "About Us",
      subtitle: "The Pioneer Who Brought AI to Jewelry",
      story: [
        "Since 2005, Murat Kaynaroğlu has been designing across textile, furniture, footwear, and accessories. His encounter with natural gemstones led him into the world of jewelry, captivated by their beauty and mystique.",
        "In 2018, he made history by creating Turkey's first digital education set in the jewelry sector, training over 2,000 professionals across Turkey and around the world.",
        "An early adopter of digital transformation, Murat became the first and only person to integrate artificial intelligence into the jewelry industry — through the Remaura AI platform, offering AI-powered 3D jewelry design to designers, sellers, and enthusiasts alike.",
        "Founder of two companies — Murat Kaynaroğlu and The AI Mücevherat — he also provides consultancy services to institutions.",
      ],
      mission: "Our Mission",
      missionText:
        "To democratize jewelry design through AI — enabling every designer, seller, and dreamer to bring their vision to life.",
      vision: "Our Vision",
      visionText: "To be the pioneer of an AI-powered jewelry design ecosystem that reaches from Turkey to the world.",
      stats: [
        { value: "2005", label: "Design Journey" },
        { value: "2000+", label: "People Trained" },
        { value: "2018", label: "First Digital Course" },
        { value: "2", label: "Companies" },
      ],
    },
    de: {
      title: "Über Uns",
      subtitle: "Der Pionier, der KI in die Schmuckbranche brachte",
      story: [
        "Seit 2005 hat Murat Kaynaroğlu in den Bereichen Textil, Möbel, Schuhe und Accessoires gearbeitet. Die Begegnung mit Edelsteinen führte ihn in die Schmuckwelt.",
        "2018 schrieb er Geschichte, indem er das erste digitale Bildungsset der Schmuckbranche in der Türkei entwickelte und über 2.000 Fachleute in der Türkei und weltweit ausbildete.",
        "Als früher Anwender digitaler Transformation war Murat der Erste und Einzige, der künstliche Intelligenz in der Schmuckbranche einsetzte — mit der Remaura AI Plattform.",
        "Er ist Gründer von zwei Unternehmen und bietet institutionellen Beratungsdienstleistungen an.",
      ],
      mission: "Unsere Mission",
      missionText: "Schmuckdesign durch KI zu demokratisieren.",
      vision: "Unsere Vision",
      visionText: "Pionier des KI-gestützten Schmuckdesign-Ökosystems zu sein.",
      stats: [
        { value: "2005", label: "Design-Reise" },
        { value: "2000+", label: "Ausgebildete Personen" },
        { value: "2018", label: "Erster digitaler Kurs" },
        { value: "2", label: "Unternehmen" },
      ],
    },
    ru: {
      title: "О Нас",
      subtitle: "Пионер, принёсший ИИ в ювелирную отрасль",
      story: [
        "С 2005 года Мурат Кайнароглу работает в области текстиля, мебели, обуви и аксессуаров. Знакомство с природными камнями привело его в мир ювелирных украшений.",
        "В 2018 году он вошёл в историю, создав первый цифровой образовательный курс в ювелирной отрасли Турции, обучив более 2000 специалистов.",
        "Будучи первопроходцем цифровой трансформации, Мурат стал первым и единственным человеком, применившим искусственный интеллект в ювелирной отрасли — с платформой Remaura AI.",
        "Он является основателем двух компаний и оказывает консультационные услуги организациям.",
      ],
      mission: "Наша Миссия",
      missionText: "Демократизировать ювелирный дизайн с помощью ИИ.",
      vision: "Наше Видение",
      visionText: "Стать пионером экосистемы ювелирного дизайна на основе ИИ.",
      stats: [
        { value: "2005", label: "Дизайнерский путь" },
        { value: "2000+", label: "Обученных людей" },
        { value: "2018", label: "Первый цифровой курс" },
        { value: "2", label: "Компании" },
      ],
    },
  };

  const c = content[locale as keyof typeof content] ?? content.tr;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Başlık */}
      <div className="mb-12">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Trend Mücevher</p>
        <h1 className="font-display mb-4 text-4xl font-medium tracking-[-0.02em] text-foreground">{c.title}</h1>
        <p className="text-lg text-muted">{c.subtitle}</p>
      </div>

      {/* İstatistikler */}
      <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {c.stats.map((stat, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className="text-2xl font-bold text-[#c9a84c]">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Hikaye */}
      <div className="mb-12 flex flex-col gap-4">
        {c.story.map((paragraph, i) => (
          <p key={i} className="leading-relaxed text-foreground/80">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Misyon & Vizyon */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#c9a84c]">{c.mission}</h2>
          <p className="leading-relaxed text-foreground/80">{c.missionText}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#c9a84c]">{c.vision}</h2>
          <p className="leading-relaxed text-foreground/80">{c.visionText}</p>
        </div>
      </div>
    </main>
  );
}
