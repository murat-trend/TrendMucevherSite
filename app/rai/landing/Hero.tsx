"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Play, Sparkles, Shield, Zap, Globe } from "lucide-react";
import { MockShot } from "./MockShot";
import { useRai } from "../i18n/RaiI18nProvider";

const TRUST_ICONS = [Shield, Zap, Globe];

export function Hero() {
  const { dict } = useRai();
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 20;
      const y = (clientY / innerHeight - 0.5) * 20;
      imageRef.current.style.transform = `perspective(1000px) rotateY(${x * 0.1}deg) rotateX(${-y * 0.1}deg) translateY(${Math.sin(Date.now() / 2000) * 8}px)`;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background ambient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/[0.03] blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.02] blur-[120px]" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.04), transparent 70%)" }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto section-padding w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">{dict.hero.badge}</span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight mb-6 animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              {dict.hero.titlePre && <>{dict.hero.titlePre} </>}
              <span className="gradient-text-gold">{dict.hero.titleGold}</span>
              {dict.hero.titlePost && <> {dict.hero.titlePost}</>}
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg lg:text-xl text-[#94A3B8] leading-relaxed mb-8 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              {dict.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <button onClick={() => scrollToSection("#pricing")} className="btn-primary group">
                {dict.hero.ctaPrimary}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => scrollToSection("#why-remaura")} className="btn-secondary group">
                <Play className="w-4 h-4" />
                {dict.hero.ctaSecondary}
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {dict.hero.trust.map((label, i) => {
                const Icon = TRUST_ICONS[i] ?? Shield;
                return (
                  <div key={label} className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Icon className="w-4 h-4 text-[#D4AF37]" />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right content - Dashboard mock */}
          <div
            ref={imageRef}
            className="relative animate-fade-in-up hidden lg:block"
            style={{
              animationDelay: "0.3s",
              transition: "transform 0.3s ease-out",
            }}
          >
            {/* Glow behind dashboard */}
            <div className="absolute -inset-8 bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-[#D4AF37]/10 rounded-3xl blur-2xl" />

            {/* Dashboard container */}
            <div className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.08] animate-float">
              <MockShot />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Floating stats card */}
            <div
              className="absolute -bottom-6 -left-6 glass-card rounded-xl p-4 border border-white/[0.08] animate-float"
              style={{ animationDelay: "1s" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">{dict.hero.statTasks}</p>
                  <p className="text-lg font-bold text-white">2,847</p>
                </div>
              </div>
            </div>

            {/* Floating efficiency card */}
            <div
              className="absolute -top-4 -right-4 glass-card rounded-xl p-4 border border-white/[0.08] animate-float"
              style={{ animationDelay: "2s" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">{dict.hero.statEfficiency}</p>
                  <p className="text-lg font-bold text-white">+340%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
