import type { RemauraPanelId, WorkspaceZone, DashboardCardSize } from "./types";

export type PanelRegistryEntry = {
  id: RemauraPanelId;
  /** i18n: `t.remauraWorkspace[titleKey]` */
  titleKey?: string;
  titleFallback: string;
  defaultZone: WorkspaceZone;
  defaultSize: DashboardCardSize;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  /** Builder’da listede önerilsin mi */
  enabled: boolean;
  /** Varsayılan yerleşimde grid’de olsun mu */
  inDefaultLayout: boolean;
};

const sizes = {
  small: { w: 4, h: 6, minW: 2, maxW: 6, minH: 4, maxH: 14 },
  medium: { w: 4, h: 9, minW: 4, maxW: 4, minH: 9, maxH: 9 },
  large: { w: 8, h: 18, minW: 4, maxW: 12, minH: 12, maxH: 48 },
  /** Önizleme: çok yüksek varsayılan değil */
  preview: { w: 6, h: 16, minW: 4, maxW: 12, minH: 10, maxH: 40 },
  wide: { w: 12, h: 20, minW: 6, maxW: 12, minH: 12, maxH: 60 },
  compact: { w: 4, h: 5, minW: 2, maxW: 6, minH: 4, maxH: 12 },
} as const;

function entry(
  e: Omit<PanelRegistryEntry, "minW" | "maxW" | "minH" | "maxH"> & {
    defaultSize: DashboardCardSize;
  }
): PanelRegistryEntry {
  const s = sizes[e.defaultSize];
  return {
    ...e,
    minW: s.minW,
    maxW: s.maxW,
    minH: s.minH,
    maxH: s.maxH,
  };
}

export const PANEL_REGISTRY: Record<RemauraPanelId, PanelRegistryEntry> = {
  format: entry({
    id: "format",
    titleKey: "visualFormat",
    titleFallback: "Format",
    defaultZone: "left",
    defaultSize: "medium",
    enabled: true,
    inDefaultLayout: true,
  }),
  prompt: entry({
    id: "prompt",
    titleKey: "visualDesc",
    titleFallback: "Prompt",
    defaultZone: "left",
    defaultSize: "medium",
    enabled: true,
    inDefaultLayout: true,
  }),
  negativeGenerate: entry({
    id: "negativeGenerate",
    titleKey: "negativePrompt",
    titleFallback: "Negatif",
    defaultZone: "left",
    defaultSize: "medium",
    enabled: true,
    inDefaultLayout: true,
  }),
  style: entry({
    id: "style",
    titleKey: "styleWindow",
    titleFallback: "Stil",
    defaultZone: "left",
    defaultSize: "medium",
    enabled: true,
    inDefaultLayout: true,
  }),
  imageMaps: entry({
    id: "imageMaps",
    titleKey: "depthMap",
    titleFallback: "Haritalar",
    defaultZone: "left",
    defaultSize: "medium",
    enabled: true,
    inDefaultLayout: true,
  }),
  preview: entry({
    id: "preview",
    titleFallback: "Önizleme",
    defaultZone: "right",
    defaultSize: "preview",
    enabled: true,
    inDefaultLayout: true,
  }),
  distribution: entry({
    id: "distribution",
    titleKey: "distributionChannels",
    titleFallback: "Dağıtım",
    defaultZone: "right",
    defaultSize: "wide",
    enabled: true,
    inDefaultLayout: true,
  }),
  seo: entry({
    id: "seo",
    titleFallback: "SEO",
    defaultZone: "right",
    defaultSize: "compact",
    enabled: true,
    inDefaultLayout: false,
  }),
};

export const DEFAULT_PANEL_ORDER: RemauraPanelId[] = [
  "format",
  "prompt",
  "negativeGenerate",
  "style",
  "imageMaps",
  "preview",
  "distribution",
  "seo",
];

export function getRegistryLayoutDims(id: RemauraPanelId) {
  const r = PANEL_REGISTRY[id];
  const key = r.defaultSize as keyof typeof sizes;
  const s = sizes[key];
  return {
    w: s.w,
    h: s.h,
    minW: r.minW,
    maxW: r.maxW,
    minH: r.minH,
    maxH: r.maxH,
  };
}
