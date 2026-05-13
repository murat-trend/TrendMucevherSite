"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { Loader2 } from "lucide-react";

const WA_NUMBER = "905435051954";

const COPY = {
  tr: {
    title: "İletişim",
    subtitle: "Soru, sipariş veya işbirliği için bize yazın.",
    name: "Ad Soyad *",
    email: "E-posta *",
    subject: "Konu (opsiyonel)",
    message: "Mesajınız *",
    namePh: "Adınız ve soyadınız",
    emailPh: "ornek@mail.com",
    subjectPh: "Mesajınızın konusu",
    messagePh: "Mesajınızı buraya yazın…",
    sendEmail: "E-posta Gönder",
    sendWa: "WhatsApp ile Gönder",
    orDivider: "veya",
    success: "Mesajınız iletildi! En kısa sürede dönüş yapacağız.",
    errRequired: "Ad, e-posta ve mesaj zorunludur.",
    errEmail: "Geçerli bir e-posta adresi girin.",
    errServer: "Bir hata oluştu, lütfen tekrar deneyin.",
    directTitle: "Doğrudan Ulaşın",
    directDesc: "Hızlı yanıt için WhatsApp tercih edebilirsiniz.",
    phone: "0543 505 19 54",
  },
  en: {
    title: "Contact",
    subtitle: "Write to us for questions, orders or collaboration.",
    name: "Full Name *",
    email: "Email *",
    subject: "Subject (optional)",
    message: "Your Message *",
    namePh: "Your full name",
    emailPh: "example@mail.com",
    subjectPh: "What is this about?",
    messagePh: "Write your message here…",
    sendEmail: "Send Email",
    sendWa: "Send via WhatsApp",
    orDivider: "or",
    success: "Message received! We'll get back to you shortly.",
    errRequired: "Name, email and message are required.",
    errEmail: "Please enter a valid email address.",
    errServer: "Something went wrong, please try again.",
    directTitle: "Reach Us Directly",
    directDesc: "For a faster reply, WhatsApp is preferred.",
    phone: "+90 543 505 19 54",
  },
  de: {
    title: "Kontakt",
    subtitle: "Schreiben Sie uns für Fragen, Bestellungen oder Zusammenarbeit.",
    name: "Vollständiger Name *",
    email: "E-Mail *",
    subject: "Betreff (optional)",
    message: "Ihre Nachricht *",
    namePh: "Ihr vollständiger Name",
    emailPh: "beispiel@mail.com",
    subjectPh: "Worum geht es?",
    messagePh: "Schreiben Sie hier Ihre Nachricht…",
    sendEmail: "E-Mail senden",
    sendWa: "Per WhatsApp senden",
    orDivider: "oder",
    success: "Nachricht erhalten! Wir melden uns bald.",
    errRequired: "Name, E-Mail und Nachricht sind erforderlich.",
    errEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    errServer: "Ein Fehler ist aufgetreten, bitte versuchen Sie es erneut.",
    directTitle: "Direkt erreichen",
    directDesc: "Für schnellere Antworten bevorzugen wir WhatsApp.",
    phone: "+90 543 505 19 54",
  },
  ru: {
    title: "Контакты",
    subtitle: "Напишите нам по вопросам заказов или сотрудничества.",
    name: "Имя и фамилия *",
    email: "E-mail *",
    subject: "Тема (необязательно)",
    message: "Ваше сообщение *",
    namePh: "Ваше полное имя",
    emailPh: "example@mail.com",
    subjectPh: "О чём ваше сообщение?",
    messagePh: "Напишите ваше сообщение здесь…",
    sendEmail: "Отправить e-mail",
    sendWa: "Написать в WhatsApp",
    orDivider: "или",
    success: "Сообщение получено! Мы свяжемся с вами в ближайшее время.",
    errRequired: "Имя, e-mail и сообщение обязательны.",
    errEmail: "Введите действительный адрес e-mail.",
    errServer: "Произошла ошибка, попробуйте ещё раз.",
    directTitle: "Связаться напрямую",
    directDesc: "Для быстрого ответа предпочтителен WhatsApp.",
    phone: "+90 543 505 19 54",
  },
} as const;

type Locale = keyof typeof COPY;

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.52 5.847L.057 23.5l5.797-1.52A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.374l-.36-.214-3.44.902.918-3.352-.234-.374A9.818 9.818 0 1 1 12 21.818z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none transition-colors focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/20";

export function IletisimClient() {
  const { locale } = useLanguage();
  const c = COPY[(locale as Locale) in COPY ? (locale as Locale) : "tr"];

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return c.errRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return c.errEmail;
    return null;
  };

  const sendEmail = async () => {
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }
    setSending(true);
    setErr(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setErr(j.error ?? c.errServer); return; }
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setErr(c.errServer);
    } finally {
      setSending(false);
    }
  };

  const openWhatsApp = () => {
    const validErr = validate();
    if (validErr) { setErr(validErr); return; }
    setErr(null);
    const lines = [
      `Ad: ${form.name.trim()}`,
      `E-posta: ${form.email.trim()}`,
      form.subject.trim() ? `Konu: ${form.subject.trim()}` : "",
      "",
      form.message.trim(),
    ].filter((l, i) => i !== 2 || l !== "").join("\n");
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Başlık */}
      <div className="mb-12">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground">
          {c.title}
        </h1>
        <p className="mt-3 text-[15px] text-muted">{c.subtitle}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">

        {/* Form */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">✓</span>
              <p className="text-[15px] font-medium text-foreground">{c.success}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">{c.name}</span>
                  <input
                    value={form.name}
                    onChange={set("name")}
                    placeholder={c.namePh}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">{c.email}</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder={c.emailPh}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">{c.subject}</span>
                <input
                  value={form.subject}
                  onChange={set("subject")}
                  placeholder={c.subjectPh}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">{c.message}</span>
                <textarea
                  value={form.message}
                  onChange={set("message")}
                  placeholder={c.messagePh}
                  rows={6}
                  className={INPUT_CLASS + " resize-none"}
                />
              </label>

              {err && (
                <p className="rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-sm text-rose-400">
                  {err}
                </p>
              )}

              {/* Butonlar */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => void sendEmail()}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-[999px] bg-[#c9a84c] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailIcon />}
                  {c.sendEmail}
                </button>

                <span className="text-xs text-muted">{c.orDivider}</span>

                <button
                  type="button"
                  onClick={openWhatsApp}
                  disabled={sending}
                  className="inline-flex items-center gap-2 rounded-[999px] border border-[#25d366]/40 bg-[#25d366]/10 px-6 py-2.5 text-sm font-semibold text-[#25d366] transition-colors hover:bg-[#25d366]/15 disabled:opacity-50"
                >
                  <WhatsAppIcon />
                  {c.sendWa}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sağ panel — doğrudan iletişim */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-base font-semibold text-foreground">{c.directTitle}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.directDesc}</p>

            <div className="mt-5 space-y-3">
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-[#25d366]/30 bg-[#25d366]/5 px-4 py-3 text-sm font-medium text-[#25d366] transition-colors hover:bg-[#25d366]/10"
              >
                <WhatsAppIcon />
                {c.phone}
              </a>

              <a
                href="mailto:murat@trendmucevher.com"
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-[#c9a84c]/40 hover:text-foreground"
              >
                <MailIcon />
                murat@trendmucevher.com
              </a>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
