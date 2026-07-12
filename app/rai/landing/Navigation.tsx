"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Diamond,
  Box,
  Sparkles,
  Camera,
  Video,
  Eraser,
  Scissors,
  Eye,
  FileType,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useRai } from "../i18n/RaiI18nProvider";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";

// dict.nav.menuItems ile sıra bazlı eşleşen ikonlar (ilk 4: AI Design, son 4: AI Visualization)
const MENU_ICONS = [Diamond, Eraser, Camera, Scissors, Eye, Box, FileType, Video];

export function Navigation() {
  const { dict, locale } = useRai();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [mobileMegaMenu, setMobileMegaMenu] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const studioHref = `/rai/${locale}/studio`;

  const megaCategories = [
    { title: dict.nav.aiDesignCategory, items: dict.nav.menuItems.slice(0, 4), icons: MENU_ICONS.slice(0, 4) },
    { title: dict.nav.aiVisualizationCategory, items: dict.nav.menuItems.slice(4), icons: MENU_ICONS.slice(4) },
  ];

  const anchorItems: { label: string; href: string }[] = [
    { label: dict.nav.home, href: "#hero" },
    { label: dict.nav.jewelryOS, href: "#why-remaura" },
    { label: dict.nav.manufacturing, href: "#manufacturing" },
    { label: dict.nav.ecommerce, href: "#ecommerce" },
    { label: dict.nav.pricing, href: "#pricing" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node) &&
        navRef.current &&
        !navRef.current.contains(event.target as Node)
      ) {
        setMegaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
    setMegaMenuOpen(false);
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-[#050505]/90 backdrop-blur-2xl border-b border-white/[0.06]" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto section-padding">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <button onClick={() => scrollToSection("#hero")} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
                <Diamond className="w-4 h-4 text-[#050505]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                REMAURA <span className="gradient-text-gold">AI</span>
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => scrollToSection("#hero")}
                className="nav-link px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
              >
                {dict.nav.home}
              </button>
              <Link
                href={studioHref}
                className={`nav-link px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-all ${
                  pathname === studioHref ? "text-[#D4AF37] bg-[#D4AF37]/10" : ""
                }`}
              >
                {dict.nav.jewelryDesign}
              </Link>
              <button
                onClick={() => scrollToSection("#why-remaura")}
                className="nav-link px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
              >
                {dict.nav.jewelryOS}
              </button>
              <button
                onClick={() => setMegaMenuOpen((o) => !o)}
                className={`nav-link flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                  megaMenuOpen ? "text-white bg-white/[0.06]" : "hover:bg-white/[0.04]"
                }`}
              >
                {dict.nav.aiSuite}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {anchorItems.slice(2).map((item) => (
                <button
                  key={item.href}
                  onClick={() => scrollToSection(item.href)}
                  className="nav-link px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => scrollToSection("#faq")}
                className="text-sm font-medium text-[#94A3B8] hover:text-white transition-colors px-2 py-2"
              >
                {dict.nav.documentation}
              </button>
              <button onClick={() => scrollToSection("#pricing")} className="btn-primary text-xs px-5 py-2.5">
                {dict.nav.startFreeDemo}
              </button>
            </div>

            {/* Mobile: switcher + menu button */}
            <div className="lg:hidden flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mega Menu Dropdown */}
      {megaMenuOpen && (
        <div ref={megaMenuRef} className="fixed top-16 lg:top-20 left-0 right-0 z-40 animate-fade-in">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/[0.08]">
              {megaCategories.map((category, catIdx) => (
                <div key={catIdx} className={catIdx > 0 ? "mt-6 pt-6 border-t border-white/[0.06]" : ""}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{category.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {category.items.map((item, itemIdx) => {
                      const Icon = category.icons[itemIdx];
                      return (
                        <button
                          key={itemIdx}
                          onClick={() => scrollToSection("#ai-suite")}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-all group text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/10 transition-colors">
                            <Icon className="w-4 h-4 text-[#94A3B8] group-hover:text-[#D4AF37] transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-[#D4AF37] transition-colors">
                              {item.label}
                            </p>
                            <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{item.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-2xl" />
          <div className="relative h-full overflow-y-auto pt-20 pb-8 px-6">
            <div className="space-y-2">
              <button
                onClick={() => scrollToSection("#hero")}
                className="block w-full py-3 text-left text-lg font-medium text-white"
              >
                {dict.nav.home}
              </button>
              <Link
                href={studioHref}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-3 text-left text-lg font-medium text-white"
              >
                {dict.nav.jewelryDesign}
              </Link>
              <div>
                <button
                  onClick={() => setMobileMegaMenu((o) => !o)}
                  className="flex items-center justify-between w-full py-3 text-left"
                >
                  <span className="text-lg font-medium text-white">{dict.nav.aiSuite}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#94A3B8] transition-transform ${mobileMegaMenu ? "rotate-180" : ""}`}
                  />
                </button>
                {mobileMegaMenu && (
                  <div className="pl-4 space-y-4 pb-4">
                    {megaCategories.map((category, catIdx) => (
                      <div key={catIdx}>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                          <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                            {category.title}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {category.items.map((subItem, subIdx) => {
                            const Icon = category.icons[subIdx];
                            return (
                              <button
                                key={subIdx}
                                onClick={() => scrollToSection("#ai-suite")}
                                className="flex items-center gap-3 w-full py-2 text-left"
                              >
                                <Icon className="w-4 h-4 text-[#64748B]" />
                                <span className="text-sm text-[#94A3B8]">{subItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {anchorItems.slice(2).map((item) => (
                <button
                  key={item.href}
                  onClick={() => scrollToSection(item.href)}
                  className="block w-full py-3 text-left text-lg font-medium text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-white/[0.08] space-y-3">
              <button onClick={() => scrollToSection("#pricing")} className="btn-primary w-full">
                {dict.nav.startFreeDemo}
              </button>
              <button onClick={() => scrollToSection("#faq")} className="btn-secondary w-full">
                {dict.nav.viewDocumentation}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
