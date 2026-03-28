import type { LayoutItem, ResponsiveLayouts } from "react-grid-layout";

/** Grid kolonunda sol / sağ bölge (varsayılan yerleştirme ve editör göstergesi için) */
export type WorkspaceZone = "left" | "right";

/** Workspace’teki tüm panel kimlikleri */
export type RemauraPanelId =
  | "format"
  | "prompt"
  | "negativeGenerate"
  | "style"
  | "preview"
  | "distribution"
  | "seo";

/** Panel başına kalıcı meta (RGL alanları + görünürlük + bölge) */
export type WorkspacePanelLayoutMeta = LayoutItem & {
  /** Son bilinen mantıksal bölge — taşıyınca güncellenir */
  zone?: WorkspaceZone;
  isVisible?: boolean;
};

export type WorkspaceMode = "edit" | "locked";

export type PersistedWorkspaceStateV2 = {
  version: 2;
  layouts: ResponsiveLayouts;
  /** id -> görünür mü; false ise grid’de yok */
  visibility: Partial<Record<RemauraPanelId, boolean>>;
  /** Son kullanılan builder modu */
  workspaceMode: WorkspaceMode;
};

export type DashboardCardSize =
  | "small"
  | "medium"
  | "large"
  | "preview"
  | "wide"
  | "compact";
