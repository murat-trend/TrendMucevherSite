"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import Link from "next/link";

export default function NasilCalisirPage() {
  const { locale } = useLanguage();

  const content = {
    tr: {
      title: "Nasıl Çalışır?",
      subtitle: "Trend Mücevher'de sipariş ve tasarım süreci 3 adımda tamamlanır.",
      steps: [
        {
          number: "01",
          title: "Modeli Keşfet",
          desc: "Modeller sayfasında yüzlerce benzersiz 3D mücevher tasarımını inceleyin. Her model GLB ve STL formatında teslim edilir.",
          icon: "🔍",
        },
        {
          number: "02",
          title: "Satın Al",
          desc: "Beğendiğiniz modeli seçin, lisans tipinizi belirleyin (Kişisel veya Ticari) ve ödemenizi yapın. Ödeme onayının ardından indirme linki e-posta adresinize gönderilir.",
          icon: "💳",
        },
        {
          number: "03",
          title: "İndir ve Üret",
          desc: "E-postanızdaki link ile modelinizi indirin. GLB dosyasını AR/VR için, STL dosyasını 3D baskı veya CNC üretimi için kullanın.",
          icon: "📦",
        },
      ],
      paymentTitle: "Ödeme Yöntemleri",
      paymentDesc:
        "Güvenli ödeme için banka havalesi kabul edilmektedir. Ödeme onayının ardından modeliniz otomatik olarak e-posta adresinize iletilir.",
      payments: [
        { icon: "🏦", title: "Banka Havalesi / EFT", desc: "Tüm Türk bankaları üzerinden havale yapabilirsiniz." },
        { icon: "💳", title: "Kredi Kartı", desc: "Yakında aktif olacak." },
      ],
      licenseTitle: "Lisans Tipleri",
      licenses: [
        {
          title: "Kişisel Lisans",
          desc: "Kişisel projeler, hobiler ve bireysel 3D baskı için. Ticari amaçla kullanılamaz.",
          price: "Standart fiyat",
        },
        {
          title: "Ticari Lisans",
          desc: "Üretim, satış, marka ürünleri ve ticari projeler için. Sınırsız üretim hakkı.",
          price: "Ticari fiyat",
        },
      ],
      faqTitle: "Sık Sorulan Sorular",
      faqs: [
        {
          q: "Modellerimi kaç kez indirebilirim?",
          a: "Her satın alımda 3 indirme hakkınız bulunmaktadır. Link 7 gün geçerlidir.",
        },
        {
          q: "Hangi formatlarda teslim ediliyor?",
          a: "Tüm modeller GLB (3D görüntüleyici/AR) ve STL (3D baskı/CNC) formatında teslim edilir.",
        },
        { q: "İade politikası nedir?", a: "Dijital ürün olması nedeniyle indirme sonrası iade yapılamamaktadır." },
        {
          q: "Özel tasarım yaptırabilir miyim?",
          a: "Evet! Özel Sipariş sayfamızdan talebinizi iletebilirsiniz.",
        },
      ],
      cta: "Modelleri İncele",
    },
    en: {
      title: "How It Works",
      subtitle: "The order and design process at Trend Mücevher is completed in 3 steps.",
      steps: [
        {
          number: "01",
          title: "Discover Models",
          desc: "Browse hundreds of unique 3D jewelry designs. Every model is delivered in GLB and STL formats.",
          icon: "🔍",
        },
        {
          number: "02",
          title: "Purchase",
          desc: "Select your model, choose your license type (Personal or Commercial), and complete your payment. A download link will be sent to your email.",
          icon: "💳",
        },
        {
          number: "03",
          title: "Download & Produce",
          desc: "Use the link in your email to download your model. Use the GLB file for AR/VR, and the STL file for 3D printing or CNC production.",
          icon: "📦",
        },
      ],
      paymentTitle: "Payment Methods",
      paymentDesc:
        "Bank transfer is accepted for secure payment. Your model is automatically delivered to your email after payment confirmation.",
      payments: [
        { icon: "🏦", title: "Bank Transfer / EFT", desc: "You can transfer from all Turkish banks." },
        { icon: "💳", title: "Credit Card", desc: "Coming soon." },
      ],
      licenseTitle: "License Types",
      licenses: [
        {
          title: "Personal License",
          desc: "For personal projects, hobbies, and individual 3D printing. Not for commercial use.",
          price: "Standard price",
        },
        {
          title: "Commercial License",
          desc: "For production, sales, branded products, and commercial projects.",
          price: "Commercial price",
        },
      ],
      faqTitle: "FAQ",
      faqs: [
        {
          q: "How many times can I download?",
          a: "Each purchase includes 3 download attempts. The link is valid for 7 days.",
        },
        { q: "What formats are delivered?", a: "All models are delivered in GLB and STL format." },
        { q: "What is the return policy?", a: "No refunds after download as these are digital products." },
        { q: "Can I request a custom design?", a: "Yes! Submit your request via our Custom Order page." },
      ],
      cta: "Browse Models",
    },
  };

  const c = (content as Record<string, (typeof content)["tr"]>)[locale] ?? content.tr;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#c9a84c]">Trend Mücevher</p>
        <h1 className="font-display mb-4 text-4xl font-medium tracking-[-0.02em] text-foreground">{c.title}</h1>
        <p className="text-muted">{c.subtitle}</p>
      </div>

      {/* Adımlar */}
      <div className="mb-16 flex flex-col gap-6">
        {c.steps.map((step, i) => (
          <div key={i} className="flex gap-6 rounded-xl border border-border/40 bg-card p-6">
            <div className="flex-shrink-0 text-3xl">{step.icon}</div>
            <div>
              <p className="mb-1 text-xs font-bold text-[#c9a84c]">{step.number}</p>
              <h2 className="mb-2 font-semibold text-foreground">{step.title}</h2>
              <p className="text-sm leading-relaxed text-muted">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ödeme */}
      <div className="mb-12">
        <h2 className="font-display mb-2 text-2xl font-medium text-foreground">{c.paymentTitle}</h2>
        <p className="mb-4 text-sm text-muted">{c.paymentDesc}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {c.payments.map((p, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-border/40 bg-card p-4">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{p.title}</p>
                <p className="mt-1 text-xs text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lisans */}
      <div className="mb-12">
        <h2 className="font-display mb-4 text-2xl font-medium text-foreground">{c.licenseTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {c.licenses.map((l, i) => (
            <div
              key={i}
              className={`rounded-xl border p-5 ${i === 1 ? "border-[#c9a84c]/30 bg-[#c9a84c]/5" : "border-border/40 bg-card"}`}
            >
              <p className="mb-2 font-semibold text-foreground">{l.title}</p>
              <p className="mb-3 text-sm leading-relaxed text-muted">{l.desc}</p>
              <p className="text-xs text-[#c9a84c]">{l.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SSS */}
      <div className="mb-12">
        <h2 className="font-display mb-4 text-2xl font-medium text-foreground">{c.faqTitle}</h2>
        <div className="flex flex-col gap-3">
          {c.faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4">
              <p className="mb-1 text-sm font-medium text-foreground">{f.q}</p>
              <p className="text-sm text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          href="/modeller"
          className="inline-flex items-center gap-2 rounded-xl bg-[#c9a84c] px-8 py-3.5 text-sm font-semibold text-black transition-all hover:opacity-90"
        >
          {c.cta} →
        </Link>
      </div>
    </main>
  );
}
