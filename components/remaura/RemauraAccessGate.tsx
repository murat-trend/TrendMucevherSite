"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  categoryId: string;
  children: React.ReactNode;
};

export function RemauraAccessGate({ categoryId, children }: Props) {
  // Lokal geliştirme: geçit atlanır (production build'de her zaman "loading" başlar)
  const [status, setStatus] = useState<"loading" | "granted" | "denied">(
    process.env.NODE_ENV === "development" ? "granted" : "loading",
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development") return;

    // 1) USTA DAVET KODU (hesap gerekmez; kod kategoriye kilitli).
    //    Linkteki ?davet=... doğrulanırsa tarayıcıda saklanır, sonraki
    //    ziyaretlerde sessizce yeniden doğrulanır.
    const davetKontrol = async (): Promise<boolean> => {
      const sakliAnahtar = `remaura-davet-${categoryId}`;
      const params = new URLSearchParams(window.location.search);
      const kod = params.get("davet") ?? localStorage.getItem(sakliAnahtar);
      if (!kod) return false;
      try {
        const r = await fetch(
          `/api/remaura/davet?kod=${encodeURIComponent(kod)}&kategori=${encodeURIComponent(categoryId)}`,
          { cache: "no-store" },
        );
        const j = await r.json();
        if (j?.ok) {
          localStorage.setItem(sakliAnahtar, kod);
          if (params.has("davet")) {
            params.delete("davet");
            const q = params.toString();
            history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
          }
          setStatus("granted");
          return true;
        }
        if (localStorage.getItem(sakliAnahtar) === kod) localStorage.removeItem(sakliAnahtar);
      } catch { /* ağ hatası — normal akışa düş */ }
      return false;
    };

    void (async () => {
      if (await davetKontrol()) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("denied"); return; }

      // Süperadmin kontrolü
      const res = await fetch("/api/auth/header-context", { credentials: "same-origin", cache: "no-store" });
      const ctx = await res.json();
      if (ctx?.isSuperAdmin) { setStatus("granted"); return; }

      // Kredi kontrolü
      const walletRes = await fetch(`/api/billing/wallet?userId=${encodeURIComponent(user.id)}`);
      const walletData = await walletRes.json();
      const credits = Number(walletData?.wallet?.balanceCredits ?? 0);
      setStatus(credits > 0 ? "granted" : "denied");
    })();
  }, [categoryId]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b76e79]/30 border-t-[#b76e79]" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">Bu alana erişiminiz yok</h2>
        <p className="mb-8 max-w-sm text-sm text-muted">
          Bu özelliği kullanmak için erişim talebinde bulunun. En kısa sürede size ulaşacağız.
        </p>
        <div className="mb-8 flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-6">
          <a
            href="mailto:murat@trendmucevher.com"
            className="flex items-center gap-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,12 2,6"/>
            </svg>
            murat@trendmucevher.com
          </a>
          <a
            href="tel:+905435051954"
            className="flex items-center gap-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +90 543 505 19 54
          </a>
        </div>
        <a
          href="mailto:murat@trendmucevher.com?subject=Remaura AI Erişim Talebi"
          className="rounded-full bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Erişim Talep Et
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
