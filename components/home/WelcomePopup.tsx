"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const SESSION_KEY = "welcome_popup_seen";
const DISCOUNT_CODE = "HOSGELDIN10";

export default function WelcomePopup() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (!seen) {
        const timer = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(timer);
      }
    } catch {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
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

            <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              <code className="rounded-lg border border-[#c9a84c]/35 bg-black/40 px-3 py-2 font-mono text-sm tracking-wider text-[#f0d080]">
                {DISCOUNT_CODE}
              </code>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className="rounded-lg border border-[#c9a84c]/50 bg-[#c9a84c]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/30"
              >
                {copied ? "Kopyalandı!" : "Kopyala"}
              </button>
            </div>
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
