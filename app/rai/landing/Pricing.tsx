"use client";

import { useState } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useReveal } from "../lib/useReveal";
import { useRai } from "../i18n/RaiI18nProvider";
import { SectionHeader } from "./SectionHeader";

export function Pricing() {
  const { dict } = useRai();
  const t = dict.pricing;
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/[0.03] blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding">
        <SectionHeader
          tag={t.tag}
          pre={t.titlePre}
          gold={t.titleGold}
          post={t.titlePost}
          desc={t.desc}
          visible={visible}
          className="mb-12"
        />

        {/* Toggle */}
        <div className={`flex items-center justify-center gap-4 mb-12 transition-all duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <button
            onClick={() => setIsAnnual(false)}
            className={`text-sm font-medium transition-colors ${!isAnnual ? "text-white" : "text-[#64748B]"}`}
          >
            {t.monthly}
          </button>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAnnual ? "bg-[#D4AF37]" : "bg-white/10"}`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${isAnnual ? "left-8" : "left-1"}`}
            />
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`text-sm font-medium transition-colors ${isAnnual ? "text-white" : "text-[#64748B]"}`}
          >
            {t.annual}
          </button>
          {isAnnual && <span className="tag-gold text-[9px]">{t.save}</span>}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div
            className={`glass-card rounded-2xl p-6 lg:p-8 border border-white/[0.08] transition-all duration-700 delay-200 ${
              !isAnnual ? "border-[#D4AF37]/30 gold-border-glow" : ""
            } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">{t.monthlyPlan.title}</h3>
              <p className="text-sm text-[#64748B]">{t.monthlyPlan.subtitle}</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl lg:text-5xl font-bold text-white">{t.monthlyPlan.price}</span>
              <span className="text-[#94A3B8] ms-2">{t.monthlyPlan.period}</span>
            </div>

            <div className="space-y-3 mb-8">
              {t.monthlyPlan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm text-[#94A3B8]">{feature}</span>
                </div>
              ))}
            </div>

            <button className={`w-full btn-secondary ${!isAnnual ? "gradient-gold text-[#050505] border-0" : ""}`}>
              {!isAnnual && <Sparkles className="w-4 h-4" />}
              {t.getStarted}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Annual Plan */}
          <div
            className={`glass-card rounded-2xl p-6 lg:p-8 border border-[#D4AF37]/30 gold-border-glow transition-all duration-700 delay-300 ${
              isAnnual ? "ring-1 ring-[#D4AF37]/20" : ""
            } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{t.annualPlan.title}</h3>
                <p className="text-sm text-[#64748B]">{t.annualPlan.subtitle}</p>
              </div>
              <span className="tag-gold ms-auto">{t.recommended}</span>
            </div>

            <div className="mb-6">
              <span className="text-4xl lg:text-5xl font-bold gradient-text-gold">{t.annualPlan.price}</span>
              <span className="text-[#94A3B8] ms-2">{t.annualPlan.period}</span>
            </div>

            <div className="space-y-3 mb-8">
              {t.annualPlan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                  <span className="text-sm text-[#94A3B8]">{feature}</span>
                </div>
              ))}
            </div>

            {isAnnual ? (
              <button className="w-full btn-primary">
                <Sparkles className="w-4 h-4" />
                {t.getStarted}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button className="w-full btn-secondary">
                {t.getStarted}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className={`mt-8 text-center transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-sm text-[#64748B]">{t.note}</p>
        </div>
      </div>
    </section>
  );
}
