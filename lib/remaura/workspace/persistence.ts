import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";
import type { PersistedWorkspaceStateV2, RemauraPanelId } from "./types";
import {
  WORKSPACE_STORAGE_KEY_V2,
  LEFT_ZONE_COLS_LG,
  type WorkspaceBreakpoint,
} from "./constants";
import { getDefaultWorkspaceLayouts } from "./layout-presets";
import { DEFAULT_PANEL_ORDER, PANEL_REGISTRY, getRegistryLayoutDims } from "./panel-registry";

const BREAKPOINTS: WorkspaceBreakpoint[] = ["lg", "md", "sm", "xs", "xxs"];
const LOCKED_LEFT_PANEL_IDS = new Set<RemauraPanelId>([
  "format",
  "prompt",
  "negativeGenerate",
  "style",
  "imageMaps",
]);

function mergeWithDefaults(saved: ResponsiveLayouts): ResponsiveLayouts {
  const defaults = getDefaultWorkspaceLayouts();
  const result: Partial<ResponsiveLayouts> = {};
  for (const bp of BREAKPOINTS) {
    const def = defaults[bp];
    const s = saved[bp];
    if (!def) continue;
    if (!s || !Array.isArray(s)) {
      result[bp] = def;
      continue;
    }
    const normalized = (s as LayoutItem[]).map((it) => ({
      ...it,
      i: it.i === "main" ? "preview" : it.i,
    }));
    const byId = new Map(normalized.map((it) => [it.i, it]));
    const merged: LayoutItem[] = def.map((d) => {
      const got = byId.get(d.i);
      if (!got) return { ...d };
      const id = d.i as RemauraPanelId;
      if (LOCKED_LEFT_PANEL_IDS.has(id)) {
        return {
          ...d,
          i: d.i,
          minW: d.minW,
          maxW: d.maxW,
          minH: d.minH,
          maxH: d.maxH,
        };
      }
      return {
        ...d,
        ...got,
        i: d.i,
        minW: d.minW,
        maxW: d.maxW,
        minH: d.minH,
        maxH: d.maxH,
      };
    });
    const defIds = new Set(def.map((x) => x.i));
    for (const it of s) {
      if (!defIds.has(it.i)) merged.push({ ...it });
    }
    result[bp] = merged;
  }
  return { ...defaults, ...result } as ResponsiveLayouts;
}

export const DEFAULT_VISIBILITY: Partial<Record<RemauraPanelId, boolean>> = {
  seo: false,
};

export function loadWorkspaceState(): PersistedWorkspaceStateV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY_V2);
    if (raw) {
      const p = JSON.parse(raw) as PersistedWorkspaceStateV2;
      if (p?.version === 2 && p.layouts) {
        return {
          version: 2,
          layouts: mergeWithDefaults(p.layouts),
          visibility: { ...DEFAULT_VISIBILITY, ...p.visibility },
          workspaceMode: p.workspaceMode === "edit" ? "edit" : "locked",
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveWorkspaceState(state: PersistedWorkspaceStateV2): void {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY_V2, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function createInitialWorkspaceState(): PersistedWorkspaceStateV2 {
  return {
    version: 2,
    layouts: getDefaultWorkspaceLayouts(),
    visibility: { ...DEFAULT_VISIBILITY },
    workspaceMode: "locked",
  };
}

export function addPanelToAllBreakpoints(
  layouts: ResponsiveLayouts,
  id: RemauraPanelId
): ResponsiveLayouts {
  const meta = PANEL_REGISTRY[id];
  if (!meta) return layouts;
  const next: Partial<ResponsiveLayouts> = {};
  const defaults = getDefaultWorkspaceLayouts();
  for (const bp of BREAKPOINTS) {
    const cur = layouts[bp] ?? [];
    const def = defaults[bp] ?? [];
    if (cur.some((it) => it.i === id)) {
      next[bp] = cur as Layout;
      continue;
    }
    const d = def.find((it) => it.i === id);
    const dim = getRegistryLayoutDims(id);
    const maxY = cur.reduce((m, it) => Math.max(m, it.y! + it.h!), 0);
    const entry: LayoutItem =
      d ??
      ({
        i: id,
        x: 0,
        y: maxY,
        w: dim.w,
        h: dim.h,
        minW: dim.minW,
        maxW: dim.maxW,
        minH: dim.minH,
        maxH: dim.maxH,
      } as LayoutItem);
    next[bp] = [...cur, { ...entry, y: maxY, x: entry.x ?? 0 }] as Layout;
  }
  return { ...layouts, ...next } as ResponsiveLayouts;
}

export function removePanelFromAllBreakpoints(
  layouts: ResponsiveLayouts,
  id: RemauraPanelId
): ResponsiveLayouts {
  const next: Partial<ResponsiveLayouts> = {};
  for (const bp of BREAKPOINTS) {
    const cur = layouts[bp];
    if (!cur) continue;
    next[bp] = cur.filter((it) => it.i !== id) as Layout;
  }
  return { ...layouts, ...next } as ResponsiveLayouts;
}

export function inferZoneForItem(cols: number, x: number, w: number): "left" | "right" {
  const threshold = Math.max(1, Math.round((cols * LEFT_ZONE_COLS_LG) / 12));
  const mid = x + w / 2;
  return mid < threshold ? "left" : "right";
}

export function buildPanelZoneMap(
  layouts: ResponsiveLayouts,
  breakpoint: WorkspaceBreakpoint
): Record<string, "left" | "right"> {
  const layout = layouts[breakpoint];
  if (!layout) return {};
  const cols =
    breakpoint === "lg" || breakpoint === "md"
      ? 12
      : breakpoint === "sm"
        ? 6
        : breakpoint === "xs"
          ? 4
          : 1;
  const out: Record<string, "left" | "right"> = {};
  for (const it of layout) {
    out[it.i] = inferZoneForItem(cols, it.x!, it.w!);
  }
  return out;
}

export { BREAKPOINTS };
