import { smoothLinePath } from "@/components/admin/dashboard/smooth-line-path";

type Props = {
  values: number[];
  className?: string;
  /** Unique prefix for SVG gradient ids (avoid clashes). */
  chartId?: string;
};

export function SellerDetailMiniChart({ values, className = "", chartId = "seller-mini" }: Props) {
  const w = 320;
  const h = 96;
  const padX = 4;
  const padY = 8;
  if (!values.length) {
    return (
      <div
        className={`flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-xs text-zinc-500 ${className}`}
      >
        Veri yok
      </div>
    );
  }
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;
  const innerW = w - padX * 2;
  const innerH = h - padY - 4;
  const pts = values.map((v, i) => ({
    x: padX + (innerW * i) / Math.max(values.length - 1, 1),
    y: padY + innerH - ((v - minV) / range) * innerH,
  }));
  const line = smoothLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area =
    line && last && first ? `${line} L ${last.x} ${h - 2} L ${first.x} ${h - 2} Z` : "";

  return (
    <div className={`relative overflow-hidden rounded-lg border border-white/[0.06] bg-[#07080a] ${className}`}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${chartId}-line`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a574" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6b5a48" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c69575" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#c69575" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && (
          <>
            <path d={area} fill={`url(#${chartId}-area)`} />
            <path
              d={line}
              fill="none"
              stroke={`url(#${chartId}-line)`}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}
