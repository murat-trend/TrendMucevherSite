"use client";

import { TrendingUp, DollarSign, Package, Users, Brain, BarChart3, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";
import { MockShot } from "./MockShot";

// dict.analytics.stats ile sıra bazlı eşleşir; değerler tanıtım amaçlı sabit
const STAT_META: { Icon: LucideIcon; value: string; change: string; color: string; bgColor: string }[] = [
  { Icon: DollarSign, value: "$2.4M", change: "+23.5%", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  { Icon: Package, value: "847", change: "+18.2%", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  { Icon: TrendingUp, value: "94%", change: "+5.1%", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  { Icon: Users, value: "3.2K", change: "+31.8%", color: "text-purple-400", bgColor: "bg-purple-500/10" },
];

export function Analytics() {
  const { dict } = useRai();
  const t = dict.analytics;
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section id="analytics" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.02] blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader tag={t.tag} pre={t.titlePre} gold={t.titleGold} post={t.titlePost} desc={t.desc} visible={visible} />

        <div className={`mb-16 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.08]">
            <MockShot />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {t.stats.map((stat, idx) => {
            const meta = STAT_META[idx];
            const Icon = meta.Icon;
            return (
              <div
                key={idx}
                className={`glass-card-hover rounded-2xl p-5 lg:p-6 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${200 + idx * 75}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${meta.bgColor} flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}>
                    <ArrowUpRight className="w-3 h-3" />
                    {meta.change}
                  </div>
                </div>
                <p className="text-2xl lg:text-3xl font-bold text-white">{meta.value}</p>
                <p className="text-sm text-[#64748B] mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className={`glass-card rounded-2xl p-6 lg:p-8 border border-[#D4AF37]/20 gold-border-glow transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{t.insightsTitle}</h3>
              <p className="text-sm text-[#64748B]">{t.insightsDesc}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {t.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 className="w-3 h-3 text-[#D4AF37]" />
                </div>
                <p className="text-sm text-[#94A3B8]">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
