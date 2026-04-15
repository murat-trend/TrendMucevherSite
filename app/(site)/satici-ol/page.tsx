"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type AppStatus = "pending" | "approved" | "rejected";

type ApplicationState =
  | { phase: "loading" }
  | { phase: "unauthenticated" }
  | { phase: "form" }
  | { phase: "existing"; status: AppStatus; rejection_reason?: string | null }
  | { phase: "submitted" };

export default function SaticiOlPage() {
  const router = useRouter();
  const [state, setState] = useState<ApplicationState>({ phase: "loading" });
  const [form, setForm] = useState({
    full_name: "",
    store_name: "",
    phone: "",
    tax_number: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState({ phase: "unauthenticated" }); return; }

      // Onaylı satıcı ise doğrudan panele yönlendir
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_approved_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "seller" && profile?.is_approved_seller) {
        router.replace("/satici/dashboard");
        return;
      }

      // Mevcut başvuru kontrolü
      const { data: app } = await supabase
        .from("seller_applications")
        .select("status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (app) {
        setState({ phase: "existing", status: app.status as AppStatus, rejection_reason: app.rejection_reason });
      } else {
        setState({ phase: "form" });
      }
    })();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/satici-ol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setError(json.error ?? "Bir hata oluştu."); return; }
      setState({ phase: "submitted" });
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (state.phase === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="h-6 w-32 animate-pulse rounded bg-foreground/10 mx-auto" />
      </main>
    );
  }

  if (state.phase === "unauthenticated") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-medium text-foreground">Satıcı Ol</h1>
        <p className="mt-3 text-sm text-muted">
          Başvuru yapabilmek için önce giriş yapmanız gerekiyor.
        </p>
        <Link
          href="/giris?redirect=/satici-ol"
          className="mt-6 inline-block rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition hover:opacity-80"
        >
          Giriş Yap
        </Link>
      </main>
    );
  }

  if (state.phase === "submitted") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl mb-6">✓</div>
        <h1 className="font-display text-2xl font-medium text-foreground">Başvurunuz alındı</h1>
        <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">
          Başvurunuz incelemeye alındı. En kısa sürede size e-posta ile dönüş yapacağız.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-muted underline underline-offset-4">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  if (state.phase === "existing") {
    const statusMap: Record<AppStatus, { label: string; color: string; desc: string }> = {
      pending:  { label: "İnceleniyor",   color: "text-amber-600 bg-amber-50 border-amber-200",   desc: "Başvurunuz inceleme aşamasında. En kısa sürede size dönüş yapacağız." },
      approved: { label: "Onaylandı",     color: "text-green-700 bg-green-50 border-green-200",   desc: "Başvurunuz onaylandı! Satıcı panelinize giriş yapabilirsiniz." },
      rejected: { label: "Reddedildi",    color: "text-red-700 bg-red-50 border-red-200",         desc: "Başvurunuz bu aşamada onaylanamadı." },
    };
    const s = statusMap[state.status];

    return (
      <main className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="font-display text-2xl font-medium text-foreground">Başvuru Durumu</h1>
        <div className={`mt-6 rounded-xl border px-5 py-4 ${s.color}`}>
          <p className="font-semibold text-sm">{s.label}</p>
          <p className="mt-1 text-sm">{s.desc}</p>
          {state.status === "rejected" && state.rejection_reason && (
            <p className="mt-2 text-sm opacity-80">
              <strong>Gerekçe:</strong> {state.rejection_reason}
            </p>
          )}
        </div>
        {state.status === "approved" && (
          <Link
            href="/satici/dashboard"
            className="mt-6 inline-block rounded-full bg-foreground px-8 py-3 text-sm font-medium text-background transition hover:opacity-80"
          >
            Satıcı Paneline Git
          </Link>
        )}
      </main>
    );
  }

  // phase === "form"
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground">
          Satıcı Ol
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Platformumuzda mağaza açmak için aşağıdaki formu doldurun. Ekibimiz başvurunuzu
          inceleyerek en kısa sürede size dönüş yapacaktır.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ad Soyad" required>
            <input
              name="full_name"
              type="text"
              placeholder="Ahmet Yılmaz"
              value={form.full_name}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Mağaza Adı" required>
            <input
              name="store_name"
              type="text"
              placeholder="Yılmaz Kuyumculuk"
              value={form.store_name}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Telefon" required>
            <input
              name="phone"
              type="tel"
              placeholder="+90 5xx xxx xx xx"
              value={form.phone}
              onChange={handleChange}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Vergi Numarası" required hint="10 veya 11 haneli">
            <input
              name="tax_number"
              type="text"
              inputMode="numeric"
              placeholder="1234567890"
              value={form.tax_number}
              onChange={handleChange}
              required
              maxLength={11}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Kendinizi ve Mağazanızı Tanıtın" required hint="En fazla 2000 karakter">
          <textarea
            name="description"
            rows={5}
            placeholder="Ne tür ürünler satmayı planlıyorsunuz? Deneyiminizden kısaca bahsedin..."
            value={form.description}
            onChange={handleChange}
            required
            maxLength={2000}
            className={`${inputCls} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-muted">{form.description.length} / 2000</p>
        </Field>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-foreground py-3.5 text-sm font-semibold text-background transition hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "Gönderiliyor…" : "Başvuruyu Gönder"}
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-foreground/20";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
