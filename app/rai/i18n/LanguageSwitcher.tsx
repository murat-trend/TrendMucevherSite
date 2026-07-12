"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Globe } from "lucide-react";
import { RAI_LOCALES, RAI_LOCALE_NAMES } from ".";
import { useRai } from "./RaiI18nProvider";

// Aynı sayfanın başka dildeki karşılığına geçer: /rai/<locale>/... segmentini değiştirir.
export function LanguageSwitcher() {
  const { locale } = useRai();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const switchTo = (next: string) => {
    setOpen(false);
    if (next === locale) return;
    const parts = pathname.split("/");
    // /rai/<locale>/... → locale segmenti 2. indekste
    if (parts[1] === "rai") {
      parts[2] = next;
      router.push(parts.join("/") || `/rai/${next}`);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] text-xs font-medium text-[#94A3B8] hover:text-white hover:border-white/[0.2] transition-all uppercase"
      >
        <Globe className="w-3.5 h-3.5" />
        {locale}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute top-full mt-2 w-36 rounded-xl border border-white/[0.08] backdrop-blur-2xl shadow-2xl z-50 overflow-hidden p-1.5"
          style={{ background: "rgba(10,8,18,0.98)", insetInlineEnd: 0 }}
        >
          {RAI_LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: l === locale ? "rgba(155,127,212,0.12)" : "transparent",
                color: l === locale ? "#fff" : "#94A3B8",
              }}
            >
              <span>{RAI_LOCALE_NAMES[l]}</span>
              <span className="uppercase text-[9px] text-[#64748B]">{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
