"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

const FOOTER_LINKS = {
  main: [
    { href: "/", key: "home" as const },
    { href: "/modeller", key: "modeller" as const },
    { href: "/ozel-siparis", key: "customOrder" as const },
    { href: "/remaura", key: "remaura" as const },
    { href: "/iletisim", key: "contact" as const },
  ],
  support: [
    { href: "/nasil-calisir", key: "howItWorks" as const },
    { href: "/fiyatlandirma", key: "pricing" as const },
    { href: "/hakkimizda", key: "about" as const },
    { href: "/satici-ol", key: "becomeSeller" as const },
  ],
};

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border/60 bg-surface-footer px-4 py-16 sm:px-6 sm:py-24 lg:px-8 dark:bg-surface-footer">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-16 sm:grid-cols-2 sm:gap-20 lg:grid-cols-4 lg:gap-16">
          {/* Brand - premium typography */}
          <div className="space-y-5">
            <Link href="/" className="group block">
              <span className="font-display block text-xl font-medium tracking-[-0.03em] text-foreground transition-colors group-hover:text-accent/90 sm:text-[1.3rem]">
                Trend Mücevher
              </span>
              <span className="font-display mt-1.5 block text-[11px] font-normal tracking-[0.22em] text-muted">
                by Murat Kaynaroğlu
              </span>
            </Link>
            <Link
              href="/remaura"
              className="inline-flex items-center rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-accent transition-all duration-300 hover:border-accent/70 hover:bg-accent/20"
            >
              Remaura AI
            </Link>
          </div>

          {/* Main Links */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80">
              {t.footer.menu}
            </h3>
            <ul className="mt-5 space-y-3">
              {FOOTER_LINKS.main.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted transition-colors hover:text-foreground"
                  >
                    {t.nav[link.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80">
              {t.footer.support}
            </h3>
            <ul className="mt-5 space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted transition-colors hover:text-foreground"
                  >
                    {t.footer[link.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/80">
              {t.footer.getStarted}
            </h3>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/remaura"
                className="text-[13px] font-medium text-accent transition-colors hover:text-accent/80"
              >
                Remaura AI
              </Link>
              <Link
                href="/giris"
                className="text-[13px] font-medium text-muted transition-colors hover:text-foreground"
              >
                {t.footer.login}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-border/80 pt-12 sm:mt-24 sm:flex-row sm:gap-6">
          <p className="text-[13px] leading-relaxed text-muted">
            © {new Date().getFullYear()} Trend Mücevher. {t.footer.copyright}
          </p>
          <p className="text-[13px] tracking-[0.06em] text-muted">
            trendmucevher.com
          </p>
        </div>
      </div>
    </footer>
  );
}
