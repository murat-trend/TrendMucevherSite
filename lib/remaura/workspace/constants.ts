export const WORKSPACE_STORAGE_KEY_V2 = "remaura-workspace-v8";
/** Eski sade layout dump — tek seferlik migrasyon */
export const LEGACY_LAYOUT_KEY_V1 = "remaura-dashboard-layouts-v1";

export const WORKSPACE_BREAKPOINTS = {
  lg: 1280,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
} as const;

export const WORKSPACE_COLS = {
  lg: 12,
  md: 12,
  sm: 6,
  xs: 4,
  xxs: 1,
} as const;

/** lg/md: sol bölge 0..LEFT_ZONE_COLS-1 */
export const LEFT_ZONE_COLS_LG = 5;

export type WorkspaceBreakpoint = keyof typeof WORKSPACE_BREAKPOINTS;
