"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useCallback, useMemo, useState } from "react";

type Copy = {
  title: string;
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  imagesLabel: string;
  imagesHint: string;
  notesLabel: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  successNoEmail: string;
  errorGeneric: string;
  removeFile: string;
};

export default function OzelSiparisPage() {
  const { locale } = useLanguage();
  const copy = useMemo((): Copy => {
    if (locale === "en") {
      return {
        title: "Custom Order",
        intro:
          "Describe the 3D jewelry model you would like produced. Optionally attach reference photos (sketches, inspiration, or photos of similar pieces). We will get back to you.",
        nameLabel: "Full name",
        namePlaceholder: "Your name",
        emailLabel: "Email",
        emailPlaceholder: "you@example.com",
        imagesLabel: "Reference images (optional)",
        imagesHint: "Up to 8 images, max 8 MB each — JPG, PNG, WebP, GIF.",
        notesLabel: "Notes & details",
        notesPlaceholder:
          "Metal, dimensions, style, deadline, budget range, or any details that help us understand your project…",
        submit: "Send request",
        submitting: "Sending…",
        success: "Thank you. Your request was received. We will contact you by email.",
        successNoEmail:
          "Your request was saved. If you do not hear from us, please email us — notification mail may not be configured on the server.",
        errorGeneric: "Something went wrong. Please try again or contact us directly.",
        removeFile: "Remove",
      };
    }
    if (locale === "de") {
      return {
        title: "Sonderanfertigung",
        intro:
          "Beschreiben Sie das 3D-Schmuckmodell, das produziert werden soll. Optional Referenzbilder (Skizzen, Inspiration, ähnliche Stücke). Wir melden uns bei Ihnen.",
        nameLabel: "Name",
        namePlaceholder: "Ihr Name",
        emailLabel: "E-Mail",
        emailPlaceholder: "sie@beispiel.de",
        imagesLabel: "Referenzbilder (optional)",
        imagesHint: "Bis zu 8 Bilder, je max. 8 MB — JPG, PNG, WebP, GIF.",
        notesLabel: "Notizen & Details",
        notesPlaceholder:
          "Metall, Maße, Stil, Termin, Budget oder alles, was uns beim Verständnis hilft…",
        submit: "Anfrage senden",
        submitting: "Wird gesendet…",
        success: "Vielen Dank. Ihre Anfrage ist eingegangen. Wir melden uns per E-Mail.",
        successNoEmail:
          "Ihre Anfrage wurde gespeichert. Falls keine Rückmeldung kommt, schreiben Sie uns — E-Mail-Benachrichtigung ist ggf. nicht konfiguriert.",
        errorGeneric: "Etwas ist schiefgelaufen. Bitte erneut versuchen oder direkt kontaktieren.",
        removeFile: "Entfernen",
      };
    }
    if (locale === "ru") {
      return {
        title: "Индивидуальный заказ",
        intro:
          "Опишите ювелирную 3D-модель, которую хотите изготовить. При необходимости прикрепите референсы (наброски, фото, похожие изделия). Мы свяжемся с вами по почте.",
        nameLabel: "Имя",
        namePlaceholder: "Ваше имя",
        emailLabel: "Email",
        emailPlaceholder: "you@example.com",
        imagesLabel: "Изображения (необязательно)",
        imagesHint: "До 8 файлов, до 8 МБ каждый — JPG, PNG, WebP, GIF.",
        notesLabel: "Комментарии",
        notesPlaceholder: "Металл, размеры, стиль, сроки, бюджет и любые детали…",
        submit: "Отправить заявку",
        submitting: "Отправка…",
        success: "Спасибо. Заявка получена. Мы свяжемся с вами по email.",
        successNoEmail:
          "Заявка сохранена. Если ответа нет, напишите нам — уведомления по почте могут быть не настроены.",
        errorGeneric: "Ошибка. Попробуйте снова или свяжитесь с нами напрямую.",
        removeFile: "Удалить",
      };
    }
    return {
      title: "Özel Sipariş",
      intro:
        "Ürettirmek istediğiniz 3B mücevher modelini anlatın. Varsa referans görsellerinizi (çizim, ilham fotoğrafı, benzer ürün görseli) yükleyebilirsiniz. Size e-posta ile dönüş yapacağız.",
      nameLabel: "Ad Soyad",
      namePlaceholder: "Adınız",
      emailLabel: "E-posta",
      emailPlaceholder: "ornek@eposta.com",
      imagesLabel: "Referans görseller (isteğe bağlı)",
      imagesHint: "En fazla 8 görsel, dosya başına en fazla 8 MB — JPG, PNG, WebP, GIF.",
      notesLabel: "Notlar ve detaylar",
      notesPlaceholder:
        "Metal tercihi, ölçüler, tarz, termin, bütçe aralığı veya modeli anlatmamıza yardımcı olacak her şey…",
      submit: "Talebi gönder",
      submitting: "Gönderiliyor…",
      success: "Teşekkürler. Talebiniz alındı. En kısa sürede e-posta ile size döneceğiz.",
      successNoEmail:
        "Talebiniz kaydedildi. Yapılandırılmadıysa e-posta bildirimi gelmeyebilir; bizden haber alamazsanız iletişim sayfasından yazın.",
      errorGeneric: "Gönderim başarısız oldu. Lütfen tekrar deneyin veya doğrudan iletişime geçin.",
      removeFile: "Kaldır",
    };
  }, [locale]);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onFilesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (let i = 0; i < list.length; i++) {
        const f = list.item(i);
        if (f && next.length < 8) next.push(f);
      }
      return next;
    });
    e.target.value = "";
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("loading");
      setErrorMessage(null);
      try {
        const fd = new FormData();
        fd.set("customerName", customerName.trim());
        fd.set("customerEmail", customerEmail.trim());
        fd.set("notes", notes);
        files.forEach((f) => fd.append("images", f));
        const res = await fetch("/api/custom-order", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          ok?: boolean;
          emailed?: boolean;
        };
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error ?? copy.errorGeneric);
          return;
        }
        setStatus("success");
        setEmailSent(data.emailed ?? false);
        setCustomerName("");
        setCustomerEmail("");
        setNotes("");
        setFiles([]);
      } catch {
        setStatus("error");
        setErrorMessage(copy.errorGeneric);
      }
    },
    [customerName, customerEmail, notes, files, copy.errorGeneric],
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">{copy.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{copy.intro}</p>

      {status === "success" ? (
        <div
          className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {emailSent ? copy.success : copy.successNoEmail}
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-10 flex flex-col gap-6">
          <div>
            <label htmlFor="co-name" className="block text-xs font-semibold uppercase tracking-widest text-muted">
              {copy.nameLabel}
            </label>
            <input
              id="co-name"
              name="customerName"
              type="text"
              autoComplete="name"
              required
              maxLength={200}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={copy.namePlaceholder}
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="co-email" className="block text-xs font-semibold uppercase tracking-widest text-muted">
              {copy.emailLabel}
            </label>
            <input
              id="co-email"
              name="customerEmail"
              type="email"
              autoComplete="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
            />
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-widest text-muted">{copy.imagesLabel}</span>
            <p className="mt-1 text-xs text-muted/80">{copy.imagesHint}</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onFilesChange}
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
            />
            {files.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-foreground/[0.02] px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-foreground">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-accent hover:underline"
                    >
                      {copy.removeFile}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <label htmlFor="co-notes" className="block text-xs font-semibold uppercase tracking-widest text-muted">
              {copy.notesLabel}
            </label>
            <textarea
              id="co-notes"
              name="notes"
              rows={6}
              maxLength={8000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={copy.notesPlaceholder}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2"
            />
          </div>
          {status === "error" && errorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#b76e79] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#a65f69] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? copy.submitting : copy.submit}
          </button>
        </form>
      )}
    </main>
  );
}
