import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

/** Dashboard kart boyut tipleri (grid birimleri `remaura-dashboard-layout` ile sabitlenir) */
export type DashboardCardSize = "small" | "medium" | "large";

export const DASHBOARD_SIZES = {
  small: { w: 4, h: 6, minW: 3, maxW: 5, minH: 4, maxH: 12 },
  medium: { w: 4, h: 8, minW: 3, maxW: 6, minH: 6, maxH: 16 },
  large: { w: 8, h: 22, minW: 6, maxW: 12, minH: 14, maxH: 48 },
} as const satisfies Record<
  DashboardCardSize,
  { w: number; h: number; minW: number; maxW: number; minH: number; maxH: number }
>;

export type RemauraWidgetId =
  | "format"
  | "main"
  | "prompt"
  | "negativeGenerate"
  | "style";

export const REMAURA_WIDGET_ORDER: RemauraWidgetId[] = [
  "format",
  "prompt",
  "negativeGenerate",
  "style",
  "main",
];

export const WIDGET_CARD_SIZE: Record<RemauraWidgetId, DashboardCardSize> = {
  format: "small",
  prompt: "medium",
  negativeGenerate: "medium",
  style: "medium",
  main: "large",
};

export const REMAURA_DASHBOARD_LAYOUT_KEY = "remaura-dashboard-layouts-v1";

export const DASHBOARD_BREAKPOINTS = {
  lg: 1280,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
} as const;

export const DASHBOARD_COLS = {
  lg: 12,
  md: 12,
  sm: 6,
  xs: 4,
  xxs: 1,
} as const;

export type DashboardBreakpoint = keyof typeof DASHBOARD_BREAKPOINTS;

function item(
  id: RemauraWidgetId,
  x: number,
  y: number,
  size: DashboardCardSize
): Layout[number] {
  const s = DASHBOARD_SIZES[size];
  return {
    i: id,
    x,
    y,
    w: s.w,
    h: s.h,
    minW: s.minW,
    maxW: s.maxW,
    minH: s.minH,
    maxH: s.maxH,
  };
}

/** Masaüstü: sol kontroller, sağda ana önizleme (yükseklik sol yığınla hizalı) */
function layoutLg(): Layout {
  const leftW = 4;
  let y = 0;
  const format = item("format", 0, y, "small");
  y += format.h!;
  const prompt = item("prompt", 0, y, "medium");
  y += prompt.h!;
  const negativeGenerate = item("negativeGenerate", 0, y, "medium");
  y += negativeGenerate.h!;
  const style = item("style", 0, y, "medium");
  y += style.h!;

  const main = {
    ...item("main", leftW, 0, "large"),
    h: Math.max(y, DASHBOARD_SIZES.large.minH),
  };

  return [format, prompt, negativeGenerate, style, main];
}

/** md: lg ile aynı mantık */
function layoutMd(): Layout {
  return layoutLg();
}

/** sm (6 kolon): üstte iki sütun benzeri; main sağda kısıtlı */
function layoutSm(): Layout {
  const leftW = 3;
  let y = 0;
  const fmt = { ...item("format", 0, y, "small"), w: 3, maxW: 6 };
  y += fmt.h!;
  const pr = { ...item("prompt", 0, y, "medium"), w: 3, minW: 2, maxW: 6 };
  y += pr.h!;
  const neg = { ...item("negativeGenerate", 0, y, "medium"), w: 3, minW: 2, maxW: 6 };
  y += neg.h!;
  const st = { ...item("style", 0, y, "medium"), w: 3, minW: 2, maxW: 6 };
  y += st.h!;

  const leftH = fmt.h! + pr.h! + neg.h! + st.h!;
  const main = {
    ...item("main", leftW, 0, "large"),
    w: 3,
    minW: 3,
    maxW: 6,
    h: Math.max(leftH, DASHBOARD_SIZES.large.minH),
  };
  return [fmt, pr, neg, st, main];
}

/** xs: tek “mantıksal” sütun, 4 kolon */
function layoutXs(): Layout {
  let y = 0;
  const out: LayoutItem[] = [];
  for (const id of ["format", "prompt", "negativeGenerate", "style"] as RemauraWidgetId[]) {
    const size = WIDGET_CARD_SIZE[id];
    const base = item(id, 0, y, size);
    const n = { ...base, w: 4, minW: 2, maxW: 4 };
    out.push(n);
    y += n.h!;
  }
  out.push({
    ...item("main", 0, y, "large"),
    w: 4,
    minW: 2,
    maxW: 4,
    h: DASHBOARD_SIZES.large.minH,
  });
  return out;
}

/** Mobil: tek kolon, sürükle kapalı — main en sonda */
function layoutXxs(): Layout {
  let y = 0;
  const order: RemauraWidgetId[] = [
    "format",
    "prompt",
    "negativeGenerate",
    "style",
    "main",
  ];
  const out: LayoutItem[] = [];
  for (const id of order) {
    const size = WIDGET_CARD_SIZE[id];
    const base = item(id, 0, y, size);
    const h =
      id === "main"
        ? Math.max(base.h!, 16)
        : Math.max(base.h!, base.minH ?? 4);
    out.push({
      ...base,
      x: 0,
      y,
      w: 1,
      minW: 1,
      maxW: 1,
      h,
      static: true,
    });
    y += h;
  }
  return out;
}

export function getDefaultDashboardLayouts(): ResponsiveLayouts {
  return {
    lg: layoutLg(),
    md: layoutMd(),
    sm: layoutSm(),
    xs: layoutXs(),
    xxs: layoutXxs(),
  };
}

export function mergeLayoutsFromStorage(
  parsed: unknown
): ResponsiveLayouts | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const defaults = getDefaultDashboardLayouts();
  const breakpoints: DashboardBreakpoint[] = ["lg", "md", "sm", "xs", "xxs"];
  const result: Partial<ResponsiveLayouts> = {};
  let hasAny = false;

  for (const bp of breakpoints) {
    const raw = o[bp];
    if (!Array.isArray(raw)) continue;
    const def = defaults[bp];
    if (!def) continue;
    const byId = new Map((raw as Layout).map((it) => [it.i, it]));
    const merged: LayoutItem[] = def.map((d) => {
      const saved = byId.get(d.i);
      if (!saved) return { ...d };
      hasAny = true;
      return {
        ...d,
        ...saved,
        i: d.i,
        minW: d.minW,
        maxW: d.maxW,
        minH: d.minH,
        maxH: d.maxH,
      };
    });
    result[bp] = merged;
  }

  if (!hasAny) return null;
  return { ...defaults, ...result } as ResponsiveLayouts;
}

export function saveDashboardLayouts(layouts: ResponsiveLayouts): void {
  try {
    localStorage.setItem(REMAURA_DASHBOARD_LAYOUT_KEY, JSON.stringify(layouts));
  } catch {
    /* ignore */
  }
}
