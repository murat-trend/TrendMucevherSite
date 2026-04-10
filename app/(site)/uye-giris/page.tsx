"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function UyeGirisPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"giris" | "kayit">("giris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "kayit") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSuccess("Kayıt başarılı! Email adresinizi doğrulayın.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    const redirectTo = new URLSearchParams(window.location.search).get("redirect") ?? "/";
    router.push(redirectTo);
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-medium text-foreground">{mode === "giris" ? "Giriş Yap" : "Üye Ol"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "giris" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-8">
          {/* Sekme */}
          <div className="mb-6 flex rounded-xl border border-border/40 p-1">
            <button
              type="button"
              onClick={() => setMode("giris")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === "giris" ? "bg-[#c9a84c] text-black" : "text-muted hover:text-foreground"}`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => setMode("kayit")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === "kayit" ? "bg-[#c9a84c] text-black" : "text-muted hover:text-foreground"}`}
            >
              Üye Ol
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {mode === "kayit" && (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Ad Soyad</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/50"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@mail.com"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent/50"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[#c9a84c] py-3.5 text-sm font-semibold text-black transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Lütfen bekleyin..." : mode === "giris" ? "Giriş Yap" : "Üye Ol"}
            </button>
          </div>

          {mode === "giris" && (
            <p className="mt-4 text-center text-xs text-muted">
              Hesabınız yok mu?{" "}
              <button type="button" onClick={() => setMode("kayit")} className="text-[#c9a84c] hover:underline">
                Üye olun
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
