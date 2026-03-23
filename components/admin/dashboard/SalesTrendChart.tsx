"use client";

import { useMemo, useState, useCallback, type MouseEvent } from "react";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { smoothLinePath } from "./smooth-line-path";

type Point = { day: string; value: number };

type Props = {
  data: Point[];
};

const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

export function SalesTrendChart({ data }: Props) {
  const w = 640;
  const h = 228;
  const padL = 46;
  const padR = 14;
  const padTop = 30;
  const padBottom = 10;
  const innerW = w - padL - padR;
  const innerH = h - padTop - padBottom;

  const [nearestIndex, setNearestIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!data.length) {
      return {
        pathD: "",
        areaD: "",
        max: 0,
        min: 0,
        points: [] as { x: number; y: number; day: string; value: number }[],
        ticks: [] as { y: number; value: number }[],
      };
    }
    const values = data.map((d) => d.value);
    const maxV = Math.max(...values);
    const minV = Math.min(...values);
    const range = maxV - minV || 1;
    const pts = data.map((d, i) => {
      const x = padL + (innerW * i) / Math.max(data.length - 1, 1);
      const y = padTop + innerH - ((d.value - minV) / range) * innerH;
      return { x, y, day: d.day, value: d.value };
    });
    const line = smoothLinePath(pts.map((p) => ({ x: p.x, y: p.y })));
    const last = pts[pts.length - 1];
    const first = pts[0];
    const areaBottom = h - padBottom;
    const area =
      line && last && first ? `${line} L ${last.x} ${areaBottom} L ${first.x} ${areaBottom} Z` : "";

    const tickCount = 4;
    const ticks: { y: number; value: number }[] = [];
    for (let i = 0; i < tickCount; i++) {
      const t = i / (tickCount - 1);
      const value = maxV - t * (maxV - minV);
      const y = padTop + t * innerH;
      ticks.push({ y, value });
    }

    return { pathD: line, areaD: area, max: maxV, min: minV, points: pts, ticks };
  }, [data, innerH, innerW, h, padBottom, padL, padTop]);

  const handleSvgMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (!chart.points.length) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * w;
      let best = 0;
      let bestD = Infinity;
      chart.points.forEach((p, i) => {
        const d = Math.abs(p.x - sx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      setNearestIndex(best);
    },
    [chart.points, w],
  );

  const handleSvgLeave = useCallback(() => setNearestIndex(null), []);

  if (data.length === 0) {
    return (
      <AdminEmptyState
        message="Grafik için yeterli veri yok."
        hint="Satış verisi geldiğinde trend çizgisi burada görünecek."
        variant="shield"
        size="compact"
        className="min-h-[220px] w-full justify-center rounded-lg"
      />
    );
  }

  const p = nearestIndex !== null ? chart.points[nearestIndex] : null;

  return (
    <div className="w-full overflow-visible rounded-lg border border-white/[0.09] bg-gradient-to-b from-[#c69575]/[0.06] to-transparent">
      <div className="relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full max-h-[260px] [&_text]:select-none"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Satış trendi, ${data.length} gün, en yüksek ${fmt(chart.max)}, en düşük ${fmt(chart.min)}`}
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={handleSvgLeave}
      >
        <title>Satış trendi çizgisi</title>
        <defs>
          <linearGradient id="salesLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0d4b8" stopOpacity="1" />
            <stop offset="45%" stopColor="#d4a574" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#8b6914" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="salesAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c69575" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#c69575" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1a1510" stopOpacity="0" />
          </linearGradient>
        </defs>

        {chart.ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={tick.y}
              x2={w - padR}
              y2={tick.y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={padL - 6}
              y={tick.y + 4}
              textAnchor="end"
              fill="#b4b4b8"
              fontSize="11"
              fontWeight="500"
              className="tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {fmt(Math.round(tick.value))}
            </text>
          </g>
        ))}

        {chart.pathD && (
          <>
            <path d={chart.areaD} fill="url(#salesAreaGrad)" />
            {nearestIndex !== null && chart.points[nearestIndex] && (
              <line
                x1={chart.points[nearestIndex].x}
                y1={padTop}
                x2={chart.points[nearestIndex].x}
                y2={h - padBottom}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
                strokeDasharray="3 3"
                pointerEvents="none"
              />
            )}
            <path
              d={chart.pathD}
              fill="none"
              stroke="url(#salesLineGrad)"
              strokeWidth="2.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {nearestIndex !== null &&
              chart.points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === nearestIndex ? 6 : 4}
                    fill="rgba(10,10,12,0.92)"
                    stroke={i === nearestIndex ? "#e8c4a0" : "rgba(255,255,255,0.35)"}
                    strokeWidth={i === nearestIndex ? 2 : 1.25}
                    pointerEvents="none"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={i === nearestIndex ? 2.2 : 1.25}
                    fill="#f5d4b0"
                    pointerEvents="none"
                  />
                </g>
              ))}
          </>
        )}
      </svg>

      {p && nearestIndex !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/[0.12] bg-[#0b0d12]/95 px-2.5 py-1.5 text-xs shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)] backdrop-blur-sm"
          style={{
            left: `${((p.x / w) * 100).toFixed(2)}%`,
            top: `${((p.y / h) * 100).toFixed(2)}%`,
            transform: "translate(-50%, calc(-100% - 0.75rem))",
          }}
        >
          <p className="font-medium text-zinc-200">{p.day}</p>
          <p className="mt-0.5 tabular-nums text-[#f0dcc8]">
            {fmt(p.value)} <span className="text-[11px] font-normal text-zinc-500">bin ₺</span>
          </p>
        </div>
      )}
      </div>

      <div className="flex justify-between border-t border-white/[0.1] px-2 pb-2 pt-1.5 text-[11px] font-medium text-zinc-500 sm:px-3">
        {data.map((d) => (
          <span key={d.day} className="min-w-0 truncate text-center">
            {d.day}
          </span>
        ))}
      </div>
      <span className="sr-only">
        Satış trendi: maksimum {chart.max}, minimum {chart.min}
      </span>
    </div>
  );
}
