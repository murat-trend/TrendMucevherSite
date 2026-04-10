"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Globe, Home, Menu, Search, User } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Props = {
  onHamburgerClick: () => void;
};

export function AdminTopbar({ onHamburgerClick }: Props) {
  const { locale, setLocale } = useLanguage();
  const adminEn = locale !== "tr";
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0c0d10] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onHamburgerClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          aria-label="Menü"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">Super Admin</span>
        <Link
          href="/"
          aria-label={adminEn ? "Back to store — home" : "Mağazaya dön — ana sayfa"}
          className="ml-1 flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[11px] font-semibold text-[#c9a88a] transition-colors hover:border-[#c69575]/35 hover:bg-[#c69575]/10 hover:text-[#f0dcc8] sm:ml-2 sm:px-2.5 sm:text-xs"
          title={adminEn ? "Go to storefront home" : "Site mağazası ana sayfasına git"}
        >
          <Home className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
          <span className="hidden max-w-[9rem] truncate sm:inline">
            {adminEn ? "Back to store" : "Mağazaya dön"}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          aria-label="Ara"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          aria-label="Bildirimler"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#c69575]" />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />

        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          {(["tr", "en", "de", "ru"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors sm:px-2 sm:text-[11px] ${
                locale === code ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <Globe className="ml-1 hidden h-3.5 w-3.5 text-zinc-600 sm:block" aria-hidden />

        <div className="relative ml-1" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((o) => !o)}
            className="flex h-9 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-1 pr-1.5 text-zinc-300 transition-colors hover:bg-white/[0.08]"
            aria-expanded={avatarOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#3d2a2e] to-[#1a1518] text-[#eecdb8]">
              <User className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition ${avatarOpen ? "rotate-180" : ""}`} />
          </button>
          {avatarOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-[100] min-w-[180px] rounded-lg border border-white/[0.1] bg-[#14151a] py-1 shadow-xl shadow-black/40"
            >
              <Link
                href="/"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#c9a88a] hover:bg-white/[0.06]"
                onClick={() => setAvatarOpen(false)}
              >
                <Home className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {adminEn ? "Back to store" : "Mağazaya dön"}
              </Link>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06]"
                onClick={() => setAvatarOpen(false)}
              >
                {adminEn ? "Profile" : "Profil"}
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-xs text-zinc-500 hover:bg-white/[0.06]"
                onClick={() => setAvatarOpen(false)}
              >
                {adminEn ? "Sign out (soon)" : "Çıkış (yakında)"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
