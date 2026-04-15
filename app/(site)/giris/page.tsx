"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type AccountKind = "buyer" | "seller";

function GirisPageContent() {
  const { t } = useLanguage();
  const g = t.site.giris;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams.get("redirect");
  const tip = searchParams.get("tip");

  const [kind, setKind] = useState<AccountKind>("seller");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (tip === "uye") {
      router.replace("/uye-giris");
    }
  }, [tip, router]);

  useEffect(() => {
    if (tip === "alici" || tip === "buyer") setKind("buyer");
    else if (tip === "satici" || tip === "seller") setKind("seller");
  }, [tip]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login")) {
          setError(g.errInvalidCredentials);
        } else if (error.message.includes("Email not confirmed")) {
          setError(g.errEmailNotConfirmed);
        } else {
          setError(g.errLoginFailed);
        }
        return;
      }

      const r = redirectAfterLogin;
      const safeRedirect =
        r && r.startsWith("/") && !r.startsWith("//") ? r : null;

      const dest = safeRedirect ?? (kind === "buyer" ? "/hesabim" : "/satici/dashboard");
      // Hard redirect: session cookie'nin middleware'e ulaşması için tam sayfa yenileme gerekli
      window.location.href = dest;
    } catch {
      setError(g.errUnexpected);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetError(null);
    const supabase = createClient();
    const resetPath = kind === "buyer" ? "/hesabim" : "/satici/hesabim";
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}${resetPath}`,
    });
    setResetSent(true);
    setResetLoading(false);
  };

  const uyeKayitHref =
    redirectAfterLogin && redirectAfterLogin.startsWith("/")
      ? `/uye-giris?redirect=${encodeURIComponent(redirectAfterLogin)}`
      : "/uye-giris";

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">

        {/* Üst başlık */}
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.06]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-[-0.03em] text-foreground">
            {kind === "buyer" ? g.buyerTitle : g.sellerTitle}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            {kind === "buyer" ? g.buyerSubtitle : g.sellerSubtitle}
          </p>
        </div>

        {/* Form kartı */}
        <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-[0_4px_24px_rgba(30,28,26,0.06)] dark:border-border dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <div className="mb-6 flex rounded-xl border border-border/40 p-1">
            <button
              type="button"
              onClick={() => {
                setKind("buyer");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                kind === "buyer" ? "bg-[#c9a84c] text-black" : "text-muted hover:text-foreground"
              }`}
            >
              {g.tabBuyer}
            </button>
            <button
              type="button"
              onClick={() => {
                setKind("seller");
                setError(null);
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                kind === "seller" ? "bg-[#c9a84c] text-black" : "text-muted hover:text-foreground"
              }`}
            >
              {g.tabSeller}
            </button>
          </div>
          {resetMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-6">
                <h3 className="font-semibold text-foreground mb-1">{g.resetPasswordTitle}</h3>
                {resetSent ? (
                  <>
                    <p className="text-sm text-emerald-400 mt-3">{g.resetSent}</p>
                    <button type="button" onClick={() => { setResetMode(false); setResetSent(false); setResetEmail("") }} className="mt-4 w-full rounded-xl border border-border/40 py-2.5 text-sm text-muted hover:text-foreground transition-colors">
                      {g.close}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted mt-1 mb-4">{g.resetHint}</p>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={g.placeholderEmail}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/50"
                    />
                    {resetError && <p className="mt-2 text-xs text-red-400">{resetError}</p>}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setResetMode(false)} className="flex-1 rounded-xl border border-border/40 py-2.5 text-sm text-muted hover:text-foreground transition-colors">
                        {g.cancel}
                      </button>
                      <button type="button" onClick={() => void handleReset()} disabled={resetLoading || !resetEmail.trim()} className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50 transition-colors">
                        {resetLoading ? g.sending : g.send}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hata mesajı */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-red-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p className="text-[13px] leading-relaxed text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">

            {/* E-posta */}
            <div>
              <label htmlFor="email" className="mb-2 block text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                {t.auth.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={g.placeholderEmail}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-muted/50 outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/10 dark:bg-surface-alt"
              />
            </div>

            {/* Şifre */}
            <div>
              <label htmlFor="password" className="mb-2 block text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                {t.auth.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-[14px] text-foreground placeholder:text-muted/50 outline-none transition-all duration-200 focus:border-accent/50 focus:ring-2 focus:ring-accent/10 dark:bg-surface-alt"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/60 transition-colors hover:text-muted"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Giriş butonu */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-accent py-3.5 text-[14px] font-semibold tracking-[0.03em] text-accent-foreground transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {g.loggingIn}
                </span>
              ) : (
                g.loginSubmit
              )}
            </button>
          </form>

          {/* Alt linkler */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
            {kind === "buyer" ? (
              <Link href={uyeKayitHref} className="text-[13px] text-muted transition-colors hover:text-accent">
                {g.noAccountRegister}
              </Link>
            ) : (
              <Link href="/satici-ol" className="text-[13px] text-muted transition-colors hover:text-accent">
                {g.createSellerLink}
              </Link>
            )}
            <button
              type="button"
              className="text-[13px] text-muted transition-colors hover:text-accent"
              onClick={() => setResetMode(true)}
            >
              {t.auth.forgotPassword}
            </button>
          </div>
        </div>

        {/* Alt not */}
        <p className="mt-8 text-center text-[12px] text-muted/60">
          {g.problemContactPrefix}{" "}
          <Link href="/iletisim" className="text-muted transition-colors hover:text-foreground">
            {g.contactUs}
          </Link>
        </p>

      </div>
    </main>
  );
}

export default function GirisPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted/30" aria-hidden />
        </main>
      }
    >
      <GirisPageContent />
    </Suspense>
  );
}
