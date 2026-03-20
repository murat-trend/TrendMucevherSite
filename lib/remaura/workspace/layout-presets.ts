import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import type { RemauraPanelId, WorkspaceZone } from "./types";
import { getRegistryLayoutDims, PANEL_REGISTRY } from "./panel-registry";
import { LEFT_ZONE_COLS_LG } from "./constants";

const RIGHT_ZONE_START = LEFT_ZONE_COLS_LG;

function item(
  id: RemauraPanelId,
  x: number,
  y: number,
  _zone: WorkspaceZone,
  overrides?: Partial<LayoutItem>
): LayoutItem {
  const d = getRegistryLayoutDims(id);
  void _zone;
  return {
    i: id,
    x,
    y,
    w: d.w,
    h: d.h,
    minW: d.minW,
    maxW: d.maxW,
    minH: d.minH,
    maxH: d.maxH,
    ...overrides,
  };
}

function layoutLg(): Layout {
  const leftX = 0;
  const leftW = LEFT_ZONE_COLS_LG;
  const rightX = LEFT_ZONE_COLS_LG;
  let y = 0;
  const format = { ...item("format", leftX, y, "left"), w: leftW };
  y += format.h!;
  const prompt = { ...item("prompt", leftX, y, "left"), w: leftW };
  y += prompt.h!;
  const negativeGenerate = { ...item("negativeGenerate", leftX, y, "left"), w: leftW };
  y += negativeGenerate.h!;
  const style = { ...item("style", leftX, y, "left"), w: leftW };
  y += style.h!;
  const imageMaps = { ...item("imageMaps", leftX, y, "left"), w: leftW };
  y += imageMaps.h!;

  const leftH = y;
  const preview = {
    ...item("preview", rightX, 0, "right"),
    w: 12 - RIGHT_ZONE_START,
    h: Math.max(leftH, PANEL_REGISTRY.preview.minH),
  };
  const previewBottom = preview.h!;

  const yDist = Math.max(leftH, previewBottom);
  const distribution = {
    ...item("distribution", 0, yDist, "right", { w: 12, h: 22 }),
    minH: 14,
  };

  return [format, prompt, negativeGenerate, style, imageMaps, preview, distribution];
}

function layoutMd(): Layout {
  return layoutLg();
}

function layoutSm(): Layout {
  const leftW = 3;
  let y = 0;
  const fmt = { ...item("format", 0, y, "left"), w: 3, maxW: 6 };
  y += fmt.h!;
  const pr = { ...item("prompt", 0, y, "left"), w: 3, minW: 2, maxW: 6 };
  y += pr.h!;
  const neg = { ...item("negativeGenerate", 0, y, "left"), w: 3, minW: 2, maxW: 6 };
  y += neg.h!;
  const st = { ...item("style", 0, y, "left"), w: 3, minW: 2, maxW: 6 };
  y += st.h!;
  const img = { ...item("imageMaps", 0, y, "left"), w: 3, minW: 2, maxW: 6 };
  y += img.h!;
  const leftH = y;
  const preview = {
    ...item("preview", leftW, 0, "right"),
    w: 3,
    minW: 3,
    maxW: 6,
    h: Math.max(leftH, PANEL_REGISTRY.preview.minH),
  };
  const yDist = Math.max(leftH, preview.h!);
  const distribution = {
    ...item("distribution", 0, yDist, "right"),
    w: 6,
    h: 24,
    minH: 12,
  };
  return [fmt, pr, neg, st, img, preview, distribution];
}

function layoutXs(): Layout {
  let y = 0;
  const out: LayoutItem[] = [];
  for (const id of [
    "format",
    "prompt",
    "negativeGenerate",
    "style",
    "imageMaps",
  ] as RemauraPanelId[]) {
    const base = item(id, 0, y, "left", { w: 4, minW: 2, maxW: 4 });
    out.push(base);
    y += base.h!;
  }
  out.push({
    ...item("preview", 0, y, "right", { w: 4, minW: 2, maxW: 4 }),
    h: Math.max(14, PANEL_REGISTRY.preview.minH),
  });
  y += out[out.length - 1].h!;
  out.push({
    ...item("distribution", 0, y, "right", { w: 4, h: 20, minH: 12 }),
  });
  return out;
}

function layoutXxs(): Layout {
  const order: RemauraPanelId[] = [
    "format",
    "prompt",
    "negativeGenerate",
    "style",
    "imageMaps",
    "preview",
    "distribution",
  ];
  let y = 0;
  const out: LayoutItem[] = [];
  for (const id of order) {
    const dim = getRegistryLayoutDims(id);
    const base = item(
      id,
      0,
      y,
      id === "distribution" ? "right" : "left",
      {
        w: 1,
        minW: 1,
        maxW: 1,
        h: Math.max(dim.minH, id === "preview" ? 14 : dim.h),
        static: true,
      }
    );
    out.push(base);
    y += base.h!;
  }
  return out;
}

export function getDefaultWorkspaceLayouts(): ResponsiveLayouts {
  return {
    lg: layoutLg(),
    md: layoutMd(),
    sm: layoutSm(),
    xs: layoutXs(),
    xxs: layoutXxs(),
  };
}

/** Görünür olmayan panelleri layout dizisinden çıkar */
export function filterLayoutByVisibility(
  layout: Layout,
  visibility: Partial<Record<RemauraPanelId, boolean>>
): Layout {
  const vis = visibility;
  return layout.filter((it) => {
    const id = it.i as RemauraPanelId;
    if (vis[id] === false) return false;
    return true;
  }) as Layout;
}

export function filterResponsiveByVisibility(
  layouts: ResponsiveLayouts,
  visibility: Partial<Record<RemauraPanelId, boolean>>
): ResponsiveLayouts {
  return {
    lg: filterLayoutByVisibility(layouts.lg ?? [], visibility),
    md: filterLayoutByVisibility(layouts.md ?? [], visibility),
    sm: filterLayoutByVisibility(layouts.sm ?? [], visibility),
    xs: filterLayoutByVisibility(layouts.xs ?? [], visibility),
    xxs: filterLayoutByVisibility(layouts.xxs ?? [], visibility),
  };
}

/** Panel en az bir breakpoint layout’unda var mı (gizlense bile) */
export function panelExistsInLayouts(layouts: ResponsiveLayouts, id: string): boolean {
  const keys: (keyof ResponsiveLayouts)[] = ["lg", "md", "sm", "xs", "xxs"];
  for (const k of keys) {
    const row = layouts[k];
    if (Array.isArray(row) && row.some((it) => it.i === id)) return true;
  }
  return false;
}
