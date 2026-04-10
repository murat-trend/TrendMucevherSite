"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("welcome_popup_seen");
    if (!seen) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("welcome_popup_seen", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#c9a84c]/30 bg-[#0a0a0a] shadow-2xl">
        {/* Üst dekoratif şerit */}
        <div className="h-1 w-full bg-gradient-to-r from-[#c9a84c] via-[#f0d080] to-[#c9a84c]" />

        <div className="p-8 text-center">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 text-muted transition-colors hover:text-foreground"
          >
            ✕
          </button>

          <p className="mb-4 text-3xl">✨</p>
          <h2 className="font-display mb-2 text-2xl font-medium text-foreground">Trend Mücevher&apos;e Hoş Geldiniz</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Türkiye&apos;nin ilk yapay zeka destekli 3D mücevher tasarım platformu. Benzersiz koleksiyonumuzu keşfedin.
          </p>

          <div className="mb-6 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
            <p className="mb-1 text-xs uppercase tracking-widest text-muted">Özel Teklif</p>
            <p className="text-lg font-semibold text-[#c9a84c]">İlk Alışverişinizde %10 İndirim</p>
            <p className="mt-1 text-xs text-muted">Üye olun, indirimi kazanın</p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/uye-giris"
              onClick={handleClose}
              className="w-full rounded-xl bg-[#c9a84c] py-3 text-sm font-semibold text-black transition-all hover:opacity-90"
            >
              Üye Ol, İndirim Kazan
            </Link>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl border border-border/40 py-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              Şimdi Değil, Modellere Bakayım
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
