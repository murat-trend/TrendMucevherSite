"use client";

import type { ReactNode } from "react";

const DEFAULT_MAX_H = "max-h-[min(60vh,480px)]";

const scrollInnerClass = (maxHeightClass: string, overflowY: "auto" | "scroll") => {
  const y = overflowY === "scroll" ? "overflow-y-scroll" : "overflow-y-auto";
  return `admin-scrollbar min-h-0 ${maxHeightClass} ${y} overflow-x-auto overscroll-contain`;
};

/**
 * Sticky header cell for admin data tables inside {@link AdminDataScroll}.
 * Apply to each `<th>` (vertical scroll keeps column titles visible).
 */
export const ADMIN_TABLE_TH_STICKY =
  "sticky top-0 z-[2] bg-[#10121a]/98 backdrop-blur-[2px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]";

/** Same as {@link ADMIN_TABLE_TH_STICKY} with a soft drop shadow for SaaS-style grids. */
export const ADMIN_TABLE_TH_STICKY_ELEVATED =
  "sticky top-0 z-[2] bg-[#10121a]/98 backdrop-blur-[2px] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06),0_6px_18px_-8px_rgba(0,0,0,0.55)]";

/**
 * Ortak max yükseklik: dashboard’daki onay bekleyen şikâyetler ve sonuç vermeyen aramalar
 * listeleri — tutarlı dikey kaydırma.
 */
export const ADMIN_PANEL_LIST_MAX_HEIGHT_CLASS = "max-h-[min(48vh,380px)]";

/**
 * Kritik satıcılar: sabit tavan — kutu aşağı uzamaz; fazla satır içeride kaydırılır.
 */
export const ADMIN_CRITICAL_SELLERS_SCROLL_MAX_HEIGHT_CLASS = "max-h-[min(45vh,280px)]";

/**
 * Onay bekleyen şikâyetler — düşük tavan; az satırda bile taşma/kaydırma görünür olur (demo ~3 satır).
 */
export const ADMIN_PENDING_COMPLAINTS_SCROLL_MAX_HEIGHT_CLASS = "max-h-[220px]";

type AdminDataScrollProps = {
  children: ReactNode;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Max height of the scroll area (Tailwind). Default: `max-h-[min(60vh,480px)]`. */
  maxHeightClass?: string;
  /** Dikey taşma: `scroll` kaydırma çubuğu alanını daha tutarlı gösterir (kritik tablo vb.) */
  overflowY?: "auto" | "scroll";
  /** İç kaydırma kutusuna ek sınıflar (ör. pr-1) */
  scrollInnerClassName?: string;
  /** Soft gradient hint that more rows exist below (does not block scrollbar; `right` offset). */
  fadeBottom?: boolean;
  /**
   * When true (default), outer ring matches bordered data tables (`rounded-xl border`).
   * When false, only `relative` + scroll — use inside an existing bordered card (e.g. satıcı listesi).
   */
  bordered?: boolean;
  /** Kaydırma bölgesi için ekran okuyucu etiketi */
  scrollAriaLabel?: string;
};

/**
 * Internal vertical + horizontal scroll for long admin tables/lists inside cards.
 * Keeps page height reasonable; pair with `ADMIN_TABLE_TH_STICKY` on `<th>` cells.
 */
export function AdminDataScroll({
  children,
  className = "",
  maxHeightClass = DEFAULT_MAX_H,
  overflowY = "auto",
  scrollInnerClassName = "",
  fadeBottom = true,
  bordered = true,
  scrollAriaLabel = "Kaydırılabilir tablo",
}: AdminDataScrollProps) {
  const outer = bordered
    ? `relative min-h-0 rounded-xl border border-white/[0.06] ${className}`.trim()
    : `relative min-h-0 ${className}`.trim();

  const inner = `${scrollInnerClass(maxHeightClass, overflowY)} ${scrollInnerClassName}`.trim();

  return (
    <div className={outer}>
      <div className={inner} role="region" aria-label={scrollAriaLabel}>
        {children}
      </div>
      {fadeBottom ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-2 z-[1] h-9 bg-gradient-to-t from-[#060708]/90 via-[#060708]/40 to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
