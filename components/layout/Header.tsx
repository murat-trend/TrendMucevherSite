"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { UtilityCluster } from "@/components/layout/UtilityCluster";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const NAV_ITEMS = [
  { href: "/", key: "home" as const },
  { href: "/urunler", key: "products" as const },
  { href: "/ozel-siparis", key: "customOrder" as const },
  { href: "/remaura", key: "remaura" as const },
  { href: "/gunluk", key: "daily" as const },
  { href: "/iletisim", key: "contact" as const },
  { href: "/giris", key: "login" as const },
];

export function Header() {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[10px] transition-all duration-300"
      >
        <div className="mx-auto flex min-h-[5rem] max-w-7xl items-center justify-between gap-8 px-4 py-5 sm:px-6 lg:min-h-[5.125rem] lg:px-8 lg:py-6">
          {/* Logo - refined brand lockup */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-display block text-[1.125rem] font-medium tracking-[-0.02em] text-foreground sm:text-xl lg:text-[1.5rem]">
              Trend Mücevher
            </span>
            <span className="font-display mt-0.5 block text-[11px] font-normal tracking-[0.08em] text-muted sm:text-xs">
              by Murat Kaynaroğlu
            </span>
          </Link>

          {/* Desktop: Navigation + Utility cluster (right) */}
          <div className="hidden items-center gap-8 lg:flex">
            <nav className="flex items-center gap-7 xl:gap-10">
              {NAV_ITEMS.map((item) =>
                item.key === "remaura" ? (
                  <div key={item.href} className="group relative">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 rounded-[999px] border border-[#a65f69]/80 bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-3 py-1.5 text-[14px] font-medium tracking-[0.02em] text-white transition-colors hover:bg-[linear-gradient(135deg,#b76e79,#a65f69,#9a5560)]"
                    >
                      <span className="icon-2-5d-sm inline-block">
                        <Image
                          src="/rem-icon-32.png"
                          alt=""
                          width={18}
                          height={18}
                          className="h-[18px] w-[18px] opacity-95"
                          unoptimized
                        />
                      </span>
                      {t.nav[item.key]}
                    </Link>
                    <div className="invisible absolute left-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-border bg-card/95 p-2 opacity-0 shadow-2xl backdrop-blur transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <Link
                        href="/remaura?category=jewelry"
                        className="block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground"
                      >
                        {t.remauraWorkspace.categoryJewelryDesign}
                      </Link>
                      <Link
                        href="/remaura?category=background"
                        className="mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground"
                      >
                        {t.remauraWorkspace.categoryBackgroundRemoval}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-[14px] font-medium tracking-[0.02em] text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {t.nav[item.key]}
                  </Link>
                )
              )}
            </nav>
            <UtilityCluster />
          </div>

          {/* Mobile & Tablet: Utility cluster + Nav Hamburger */}
          <div className="flex items-center gap-2 lg:hidden">
            <UtilityCluster />
            <button
              type="button"
              aria-label={t.header.menuOpen}
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-foreground/90 transition-colors hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10"
            >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.25}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Sheet Menu */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${
          mobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop - premium overlay */}
        <div
          className={`absolute inset-0 bg-foreground/25 backdrop-blur-md transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Sheet Panel - premium feel, slides from right */}
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-[min(22rem,88vw)] border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out sm:max-w-[22rem] ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto px-6 py-8 pb-12">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="font-display block text-lg font-medium tracking-[-0.02em] text-foreground">
                  Trend Mücevher
                </span>
                <span className="font-display mt-0.5 block text-[11px] font-normal tracking-[0.08em] text-muted">
                  by Murat Kaynaroğlu
                </span>
              </div>
              <button
                type="button"
                aria-label={t.header.menuClose}
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-8 border-t border-border/60 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted">{t.header.language} / {t.header.theme}</span>
                <UtilityCluster />
              </div>
            </div>
            <div className="mt-4 border-t border-border/60">
              <nav className="flex flex-col">
                {NAV_ITEMS.map((item) =>
                  item.key === "remaura" ? (
                    <div key={item.href} className="my-2 rounded-xl border border-[#a65f69]/30 p-2">
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="inline-flex w-fit items-center gap-1.5 rounded-[999px] border border-[#a65f69]/80 bg-[linear-gradient(135deg,#c4838b,#b76e79,#a65f69)] px-3 py-1.5 text-[14px] font-medium tracking-[0.02em] text-white transition-colors hover:bg-[linear-gradient(135deg,#b76e79,#a65f69,#9a5560)]"
                      >
                        <span className="icon-2-5d-sm inline-block">
                          <Image
                            src="/rem-icon-32.png"
                            alt=""
                            width={18}
                            height={18}
                            className="h-[18px] w-[18px] opacity-95"
                            unoptimized
                          />
                        </span>
                        {t.nav[item.key]}
                      </Link>
                      <div className="mt-2 flex flex-col">
                        <Link
                          href="/remaura?category=jewelry"
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-lg px-2 py-2 text-[13px] text-foreground/85 hover:bg-foreground/[0.02]"
                        >
                          {t.remauraWorkspace.categoryJewelryDesign}
                        </Link>
                        <Link
                          href="/remaura?category=background"
                          onClick={() => setMobileMenuOpen(false)}
                          className="rounded-lg px-2 py-2 text-[13px] text-foreground/85 hover:bg-foreground/[0.02]"
                        >
                          {t.remauraWorkspace.categoryBackgroundRemoval}
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="border-b border-border/60 py-4 text-[14px] font-medium tracking-[0.02em] text-foreground transition-colors last:border-b-0 hover:bg-foreground/[0.02] active:bg-foreground/5"
                    >
                      {t.nav[item.key]}
                    </Link>
                  )
                )}
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
