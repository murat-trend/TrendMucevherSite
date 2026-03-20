/**
 * Remaura dashboard kartları — tek tasarım sistemi (Tailwind)
 */
export const dashboardCardTokens = {
  /** Kart gövdesi */
  shell:
    "rounded-2xl border border-border bg-card/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
  /** İçerik alanı (handle hariç) */
  body: "min-h-0 flex-1 overflow-auto p-5",
  /** Sürükleme tutamacı şeridi */
  dragStrip:
    "dashboard-drag-handle flex shrink-0 cursor-grab touch-none items-center gap-1 border-b border-border px-2 py-1.5 active:cursor-grabbing dark:border-white/10",
} as const;
