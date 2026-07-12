"use client";

import { Diamond, Mail, MapPin, Phone, ArrowRight, ExternalLink } from "lucide-react";
import { useRai } from "../i18n/RaiI18nProvider";

// Sütun bağlantı hedefleri — dict.footer.columns.*.links ile sıra bazlı eşleşir
const COLUMN_HREFS: Record<string, string[]> = {
  product: ["#why-remaura", "#ai-suite", "#manufacturing", "#ecommerce", "#analytics", "#pricing"],
  company: ["#", "#", "#", "#", "#"],
  resources: ["#faq", "#", "#", "#", "#"],
  legal: ["#", "#", "#", "#"],
};

export function Footer() {
  const { dict } = useRai();
  const t = dict.footer;

  const scrollToSection = (href: string) => {
    if (href === "#") return;
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative pt-24 lg:pt-32 pb-8 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#D4AF37]/[0.02] blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        {/* CTA Banner */}
        <div className="glass-card rounded-2xl p-8 lg:p-12 border border-[#D4AF37]/20 gold-border-glow mb-16 lg:mb-24 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            {t.ctaTitlePre} <span className="gradient-text-gold">{t.ctaTitleGold}</span>
          </h2>
          <p className="text-lg text-[#94A3B8] max-w-xl mx-auto mb-8">{t.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollToSection("#pricing")} className="btn-primary">
              {t.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="btn-secondary">
              <Mail className="w-4 h-4" />
              {t.ctaSecondary}
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                <Diamond className="w-4 h-4 text-[#050505]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                REMAURA <span className="gradient-text-gold">AI</span>
              </span>
            </div>
            <p className="text-sm text-[#64748B] mb-4 max-w-xs">{t.about}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>New York, NY</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Mail className="w-4 h-4 shrink-0" />
                <span>hello@remaura.ai</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Phone className="w-4 h-4 shrink-0" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {(Object.keys(t.columns) as Array<keyof typeof t.columns>).map((key) => {
            const column = t.columns[key];
            const hrefs = COLUMN_HREFS[key] ?? [];
            return (
              <div key={key}>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{column.title}</h3>
                <ul className="space-y-3">
                  {column.links.map((label, idx) => (
                    <li key={label}>
                      <button
                        onClick={() => scrollToSection(hrefs[idx] ?? "#")}
                        className="text-sm text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1 group"
                      >
                        {label}
                        {(hrefs[idx] ?? "#") === "#" && (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748B]">{t.copyright}</p>
          <div className="flex items-center gap-6">
            {t.bottomLinks.map((label) => (
              <button key={label} className="text-xs text-[#64748B] hover:text-white transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
