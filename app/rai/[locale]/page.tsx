import type { Metadata } from "next";
import { getRaiDict, isRaiLocale, RAI_DEFAULT_LOCALE, type RaiLocale } from "../i18n";
import { Navigation } from "../landing/Navigation";
import { Hero } from "../landing/Hero";
import { WhyRemaura } from "../landing/WhyRemaura";
import { AISuite } from "../landing/AISuite";
import { Features } from "../landing/Features";
import { Manufacturing } from "../landing/Manufacturing";
import { Ecommerce } from "../landing/Ecommerce";
import { Analytics } from "../landing/Analytics";
import { Pricing } from "../landing/Pricing";
import { Testimonials } from "../landing/Testimonials";
import { FAQ } from "../landing/FAQ";
import { Footer } from "../landing/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = getRaiDict(isRaiLocale(locale) ? (locale as RaiLocale) : RAI_DEFAULT_LOCALE);
  return {
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
  };
}

export default function RaiLandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/[0.02] blur-[200px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.015] blur-[180px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.02), transparent 70%)" }}
        />
      </div>

      <Navigation />
      <main className="relative z-10">
        <Hero />
        <WhyRemaura />
        <AISuite />
        <Features />
        <Manufacturing />
        <Ecommerce />
        <Analytics />
        <Pricing />
        <Testimonials />
        <FAQ />
        <Footer />
      </main>
    </div>
  );
}
