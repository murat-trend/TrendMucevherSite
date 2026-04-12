"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LanguageMenu } from "@/components/i18n/LanguageMenu";
import { UtilityCluster } from "@/components/layout/UtilityCluster";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { createClient } from "@/utils/supabase/client";

const NAV_ITEMS = [
  { href: "/", key: "home" as const },
  { href: "/modeller", key: "modeller" as const },
  { href: "/ozel-siparis", key: "customOrder" as const },
  { href: "/remaura", key: "remaura" as const },
  { href: "/gunluk", key: "daily" as const },
  { href: "/iletisim", key: "contact" as const },
  { href: "/admin", key: "superAdmin" as const },
];

type HeaderSession = {
  email: string | null;
  role: "seller" | "buyer";
  isSuperAdmin: boolean;
};

export function Header() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<HeaderSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    setLoggingOut(true);
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
    router.push("/");
    router.refresh();
    setLoggingOut(false);
  };

  useEffect(() => {
    const supabase = createClient();

    const syncSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSession(null);
          setAccountMenuOpen(false);
          return;
        }
        const res = await fetch("/api/auth/header-context", { credentials: "same-origin", cache: "no-store" });
        const ctx = (await res.json()) as
          | { signedIn: false }
          | { signedIn: true; email: string | null; role: "seller" | "buyer"; isSuperAdmin: boolean };
        if (ctx.signedIn) {
          setSession({
            email: ctx.email,
            role: ctx.role,
            isSuperAdmin: ctx.isSuperAdmin,
          });
        } else {
          setSession({
            email: user.email ?? null,
            role: "buyer",
            isSuperAdmin: false,
          });
        }
        setAccountMenuOpen(false);
      } finally {
        setAuthLoading(false);
      }
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [accountMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[10px] transition-all duration-300">
        <div className="mx-auto flex min-h-[5rem] max-w-7xl items-center justify-between gap-8 px-4 py-5 sm:px-6 lg:min-h-[5.125rem] lg:px-8 lg:py-6">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-display block text-[1.125rem] font-medium tracking-[-0.02em] text-foreground sm:text-xl lg:text-[1.5rem]">
              Trend Mücevher
            </span>
            <span className="font-display mt-0.5 block text-[11px] font-normal tracking-[0.08em] text-muted sm:text-xs">
              by Murat Kaynaroğlu
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 lg:flex">
            <nav className="flex items-center gap-7 xl:gap-10">
              {NAV_ITEMS.map((item) =>
                item.key === "remaura" ? (
                  <div key={item.href} className="group relative">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 rounded-[999px] border border-[#a65f69]/80 bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-3 py-1.5 text-[14px] font-medium tracking-[0.02em] text-white transition-colors hover:bg-[linear-gradient(135deg,#b76e79,#a65f69,#9a5560)]"
                    >
                      <span className="icon-2-5d-sm inline-block">
                        <Image src="/rem-icon-32.png" alt="" width={18} height={18} className="h-[18px] w-[18px] opacity-95" unoptimized />
                      </span>
                      {t.nav[item.key]}
                    </Link>
                    {/* Dropdown */}
                    <div className="invisible absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-border bg-card/95 p-2 opacity-0 shadow-2xl backdrop-blur transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <Link href="/remaura?category=jewelry" className="block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        {t.remauraWorkspace.categoryJewelryDesign}
                      </Link>
                      <Link href="/remaura/arka-plan-kaldir" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        {t.remauraWorkspace.categoryBackgroundRemoval}
                      </Link>
                      <Link href="/remaura/foto-edit" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        {t.remauraWorkspace.categoryPhotoEdit}
                      </Link>
                      <Link href="/remaura/nesne-kaldir" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        {t.nav.nesneKaldir ?? "Nesne Kaldır"}
                      </Link>
                      <Link href="/remaura?category=mesh3d" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        Remaura AI 3D <span className="text-[10px] font-normal text-muted">(görüntüden 3D)</span>
                      </Link>
                      <Link href="/remaura?category=ring-rail" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        Ring Rail Resize
                      </Link>
                      <Link href="/convert" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        3D Dönüştürücü
                      </Link>
                      <Link href="/remaura/video-optimize" className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        Video Optimizasyonu
                      </Link>
                      <Link href="/remaura/webm-to-mp4" onClick={() => setMobileMenuOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        WebM → MP4
                      </Link>
                      {/* Studio — Remaura AI altına taşındı */}
                      <div className="my-1.5 border-t border-border/60" />
                      <Link href="/studio" className="block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground">
                        Studio
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      item.key === "superAdmin"
                        ? "text-[12px] font-medium tracking-[0.02em] text-muted/50 transition-colors hover:text-muted"
                        : "text-[14px] font-medium tracking-[0.02em] text-foreground/80 transition-colors hover:text-foreground"
                    }
                  >
                    {t.nav[item.key]}
                  </Link>
                )
              )}
            </nav>

            {/* Hesap: giriş yok → Giriş menüsü; oturum var → e-posta + profil menüsü (Etsy tarzı) */}
            {!authLoading &&
              (session ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    aria-label="Hesap menüsü"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="true"
                    onClick={() => setAccountMenuOpen((o) => !o)}
                    className={`flex h-9 max-w-[min(100vw-10rem,260px)] items-center gap-2 rounded-[999px] border border-border bg-card py-1 pl-1 pr-2 text-left text-[12px] font-medium text-foreground/85 transition-all hover:border-accent/40 hover:text-foreground ${accountMenuOpen ? "border-accent/40" : ""}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/18 text-[11px] font-semibold uppercase text-[#b8923a]">
                      {(session.email?.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{session.email ?? "Hesap"}</span>
                    <svg
                      className={`h-3 w-3 shrink-0 opacity-60 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-[200] mt-2 w-64 rounded-xl border border-border/40 bg-card py-1 shadow-xl">
                      <div className="border-b border-border/40 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Oturum</p>
                        <p className="mt-1 break-all text-sm font-medium leading-snug text-foreground">{session.email ?? "—"}</p>
                      </div>
                      <Link
                        href="/hesabim"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Hesabım
                      </Link>
                      {session.role === "seller" && (
                        <>
                          <Link
                            href="/satici/dashboard"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Satıcı paneli
                          </Link>
                          <Link
                            href="/satici/hesabim"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                          >
                            Mağaza hesabım
                          </Link>
                        </>
                      )}
                      {session.isSuperAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                        >
                          Super Admin
                        </Link>
                      )}
                      {session.role === "buyer" && (
                        <Link
                          href="/giris?tip=satici"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                        >
                          Satıcı girişi
                        </Link>
                      )}
                      <div className="border-t border-border/40 pt-1">
                        <button
                          type="button"
                          disabled={loggingOut}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500/90 transition-colors hover:bg-red-500/[0.06] disabled:opacity-50"
                          onClick={() => void handleSignOut()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {loggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    aria-label="Giriş seçenekleri"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="true"
                    onClick={() => setAccountMenuOpen((o) => !o)}
                    className={`flex h-9 items-center gap-2 rounded-[999px] border border-border bg-card pl-3 pr-2 text-[13px] font-medium text-foreground/80 transition-all hover:border-accent/40 hover:text-foreground ${accountMenuOpen ? "border-accent/40" : ""}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Giriş
                    <svg className={`h-3 w-3 shrink-0 opacity-70 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-[200] mt-2 w-56 rounded-xl border border-border/40 bg-card py-1 shadow-xl">
                      <Link
                        href="/giris?tip=uye"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Giriş
                      </Link>
                      <Link
                        href="/giris"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2 border-t border-border/20 px-4 py-3 text-sm text-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Satıcı Girişi
                      </Link>
                    </div>
                  )}
                </div>
              ))}

            <UtilityCluster languageLayout="menu" languageMenuAlign="end" />
          </div>

          {/* Mobile: tema + hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <UtilityCluster showLanguages={false} />
            <button
              type="button"
              aria-label={t.header.menuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-foreground/90 transition-colors hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sheet Menu */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${mobileMenuOpen ? "visible" : "invisible"}`}>
        <div
          className={`absolute inset-0 bg-foreground/25 backdrop-blur-md transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
        <aside className={`absolute right-0 top-0 flex h-full w-full max-w-[min(22rem,88vw)] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out sm:max-w-[22rem] ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>

          {/* Mobile header */}
          <div className="shrink-0 px-6 pb-4 pt-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="font-display block text-lg font-medium tracking-[-0.02em] text-foreground">Trend Mücevher</span>
                <span className="font-display mt-0.5 block text-[11px] font-normal tracking-[0.08em] text-muted">by Murat Kaynaroğlu</span>
              </div>
              <button
                type="button"
                aria-label={t.header.menuClose}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Hesap / giriş — mobil */}
          {!authLoading && (
            <div className="shrink-0 border-b border-border/40 px-6 pb-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Hesap</p>
              {session ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c9a84c]/18 text-sm font-semibold uppercase text-[#b8923a]">
                      {(session.email?.trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Oturum</p>
                      <p className="break-all text-[13px] font-medium leading-snug text-foreground">{session.email ?? "—"}</p>
                    </div>
                  </div>
                  <Link
                    href="/hesabim"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-[14px] font-medium text-foreground/80 transition-all hover:border-accent/40 hover:text-foreground"
                  >
                    Hesabım
                  </Link>
                  {session.role === "seller" && (
                    <>
                      <Link
                        href="/satici/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-[14px] font-medium text-foreground/80 transition-all hover:border-accent/40 hover:text-foreground"
                      >
                        Satıcı paneli
                      </Link>
                      <Link
                        href="/satici/hesabim"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center justify-center rounded-xl border border-border/50 py-2.5 text-[13px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
                      >
                        Mağaza hesabım
                      </Link>
                    </>
                  )}
                  {session.isSuperAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl border border-border/50 py-2.5 text-[13px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
                    >
                      Super Admin
                    </Link>
                  )}
                  {session.role === "buyer" && (
                    <Link
                      href="/giris?tip=satici"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center rounded-xl border border-border/50 py-2.5 text-[13px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
                    >
                      Satıcı girişi
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={() => void handleSignOut()}
                    className="w-full rounded-xl border border-red-500/25 bg-red-500/[0.06] py-3 text-[14px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {loggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/giris?tip=uye"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-[14px] font-medium text-foreground/80 transition-all hover:border-accent/40 hover:text-foreground"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Giriş
                  </Link>
                  <Link
                    href="/giris"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-[14px] font-medium text-foreground/80 transition-all hover:border-accent/40 hover:text-foreground"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Satıcı Girişi
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Dil + Tema */}
          <div className="shrink-0 border-t border-border/60 px-6 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t.header.language}</p>
            <div className="mt-3"><LanguageMenu align="start" /></div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t.header.theme}</p>
            <div className="mt-3 flex justify-start"><ThemeToggle compact /></div>
          </div>

          {/* Nav linkleri */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-2">
            <nav className="flex flex-col border-t border-border/60 pt-4">
              {NAV_ITEMS.map((item) =>
                item.key === "remaura" ? (
                  <div key={item.href} className="my-2 rounded-xl border border-[#a65f69]/30 p-2">
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex w-fit items-center gap-1.5 rounded-[999px] border border-[#a65f69]/80 bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-3 py-1.5 text-[14px] font-medium tracking-[0.02em] text-white"
                    >
                      <span className="icon-2-5d-sm inline-block">
                        <Image src="/rem-icon-32.png" alt="" width={18} height={18} className="h-[18px] w-[18px] opacity-95" unoptimized />
                      </span>
                      {t.nav[item.key]}
                    </Link>
                    <div className="mt-2 flex flex-col">
                      {[
                        { href: "/remaura?category=jewelry", label: t.remauraWorkspace.categoryJewelryDesign },
                        { href: "/remaura/arka-plan-kaldir", label: t.remauraWorkspace.categoryBackgroundRemoval },
                        { href: "/remaura/foto-edit", label: t.remauraWorkspace.categoryPhotoEdit },
                        { href: "/remaura/nesne-kaldir", label: t.nav.nesneKaldir ?? "Nesne Kaldır" },
                        { href: "/remaura?category=mesh3d", label: "Remaura AI 3D (görüntüden 3D)" },
                        { href: "/remaura?category=ring-rail", label: "Ring Rail Resize" },
                        { href: "/convert", label: "3D Dönüştürücü" },
                        { href: "/remaura/video-optimize", label: "Video Optimizasyonu" },
                        { href: "/remaura/webm-to-mp4", label: "WebM → MP4" },
                        { href: "/studio", label: "Studio" },
                      ].map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-2 py-2 text-[13px] text-foreground/85 hover:bg-foreground/[0.02]">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={
                      item.key === "superAdmin"
                        ? "border-b border-border/60 py-4 text-[12px] font-medium tracking-[0.02em] text-muted/50 transition-colors hover:text-muted"
                        : "border-b border-border/60 py-4 text-[14px] font-medium tracking-[0.02em] text-foreground transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
                    }
                  >
                    {t.nav[item.key]}
                  </Link>
                )
              )}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
