"use client";

import {
  Globe, ShoppingBag, CreditCard, TrendingUp, Search, Zap,
  Instagram, Facebook, Pin, Music2, Store, ExternalLink, type LucideIcon,
} from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";
import { MockShot } from "./MockShot";

// Platform adları marka adıdır, çevrilmez ("Your Website" hariç — dict'ten gelir)
const PLATFORMS: { Icon: LucideIcon; name: string | null; color: string }[] = [
  { Icon: Instagram, name: "Instagram", color: "bg-pink-500/10 text-pink-400" },
  { Icon: Facebook, name: "Facebook", color: "bg-blue-500/10 text-blue-400" },
  { Icon: Pin, name: "Pinterest", color: "bg-red-500/10 text-red-400" },
  { Icon: Music2, name: "TikTok", color: "bg-cyan-500/10 text-cyan-400" },
  { Icon: Store, name: "Etsy", color: "bg-orange-500/10 text-orange-400" },
  { Icon: ShoppingBag, name: "Shopify", color: "bg-emerald-500/10 text-emerald-400" },
  { Icon: ExternalLink, name: "WooCommerce", color: "bg-purple-500/10 text-purple-400" },
  { Icon: Globe, name: null, color: "bg-[#D4AF37]/10 text-[#D4AF37]" },
];

// dict.ecommerce.features ile sıra bazlı eşleşir
const FEATURE_ICONS: LucideIcon[] = [Globe, Zap, Search, TrendingUp, ShoppingBag, CreditCard];

export function Ecommerce() {
  const { dict } = useRai();
  const t = dict.ecommerce;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section id="ecommerce" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.02] blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className={`mb-16 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.08]">
            <MockShot />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {t.features.map((feature, idx) => {
            const Icon = FEATURE_ICONS[idx];
            return (
              <div
                key={idx}
                className={`glass-card-hover rounded-2xl p-5 lg:p-6 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${200 + idx * 75}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className={`glass-card rounded-2xl p-6 lg:p-8 border border-white/[0.08] transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t.exportTitle}</h3>
              <p className="text-sm text-[#64748B]">{t.exportDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLATFORMS.map((platform, idx) => {
              const Icon = platform.Icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-lg ${platform.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-[#94A3B8] group-hover:text-white transition-colors">
                    {platform.name ?? t.yourWebsite}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
