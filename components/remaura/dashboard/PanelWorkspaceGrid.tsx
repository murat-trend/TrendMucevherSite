"use client";

import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import type { ResponsiveLayouts } from "react-grid-layout";
import {
  WORKSPACE_BREAKPOINTS,
  WORKSPACE_COLS,
} from "@/lib/remaura/workspace/constants";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type PanelWorkspaceGridProps = {
  children: React.ReactNode;
  layouts: ResponsiveLayouts;
  onLayoutsChange: (layouts: ResponsiveLayouts) => void;
  editMode: boolean;
  showZoneDivider?: boolean;
};

export function PanelWorkspaceGrid({
  children,
  layouts,
}: PanelWorkspaceGridProps) {
  return (
    <div className="relative">
      <ResponsiveGridLayout
        className="remaura-dashboard-layout -mx-1 min-h-[200px]"
        layouts={layouts}
        breakpoints={WORKSPACE_BREAKPOINTS}
        cols={WORKSPACE_COLS}
        rowHeight={32}
        margin={[16, 16]}
        containerPadding={[4, 4]}
        isDraggable={false}
        isResizable={false}
        compactType={null}
        preventCollision
        measureBeforeMount
        useCSSTransforms
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}
