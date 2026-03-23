"use client";

import type { ReactNode } from "react";

/** Header cell — fixed above scroll; matches card surface (#10121a). Add `text-left` / `text-right` / `tabular-nums` per column. */
const FINANCE_TH =
  "relative z-[2] border-b border-white/[0.06] bg-[#10121a] px-3.5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]";

const DEFAULT_BODY_MAX_H = "max-h-[360px]";

type FinanceScrollTableProps = {
  /** Minimum table width for horizontal scroll (wide dashboards). */
  minWidthPx: number;
  /** Shared column definitions for header + body tables (alignment). */
  colgroup: ReactNode;
  /** `<th>` cells for the header row. */
  headerCells: ReactNode;
  /** `<tr>` rows for the body. */
  bodyRows: ReactNode;
  /**
   * Fixed max height of the **body** scroll area only (header stays outside).
   * Default `max-h-[360px]` — keeps the card from growing with row count.
   */
  bodyMaxHeightClass?: string;
};

/**
 * Finans kartları: thead sabit, sadece tbody alanı dikey kayar (Stripe / Shopify tarzı).
 * Dış kartta overflow yok; sadece iç body sarmalayıcıda `overflow-y: auto`.
 */
export function FinanceScrollTable({
  minWidthPx,
  colgroup,
  headerCells,
  bodyRows,
  bodyMaxHeightClass = DEFAULT_BODY_MAX_H,
}: FinanceScrollTableProps) {
  const bodyScrollClass =
    `finance-table-body-scroll min-h-0 ${bodyMaxHeightClass} overflow-y-auto overflow-x-hidden overscroll-contain`.trim();

  return (
    <div className="w-full min-h-0 min-w-0 overflow-x-auto rounded-xl border border-white/[0.06]">
      <div
        className="flex w-full min-h-0 min-w-0 max-w-full flex-col"
        style={{ minWidth: `${minWidthPx}px` }}
      >
        <table className="w-full shrink-0 table-fixed border-collapse text-left text-sm">
          {colgroup}
          <thead>
            <tr>{headerCells}</tr>
          </thead>
        </table>
        <div className={bodyScrollClass} aria-label="Kaydırılabilir tablo gövdesi">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            {colgroup}
            <tbody className="divide-y divide-white/[0.05]">{bodyRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { FINANCE_TH };
