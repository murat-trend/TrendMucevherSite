"use client";

import type { RemauraPanelId } from "@/lib/remaura/workspace/types";
import { PANEL_REGISTRY } from "@/lib/remaura/workspace/panel-registry";
import { DashboardCard } from "@/components/remaura/dashboard/DashboardCard";
import { useRemauraLayout } from "./RemauraWorkspaceContexts";
import { FormatPanel } from "../panels/FormatPanel";
import { PromptPanel } from "../panels/PromptPanel";
import { NegativePromptPanel } from "../panels/NegativePromptPanel";
import { StylePanel } from "../panels/StylePanel";
import { UploadMapPanel } from "../panels/UploadMapPanel";
import { PreviewPanel } from "../panels/PreviewPanel";
import { DistributionPanel } from "../panels/DistributionPanel";
import { SeoPanel } from "../panels/SeoPanel";

function PanelBody({ id }: { id: RemauraPanelId }) {
  switch (id) {
    case "format":         return <FormatPanel />;
    case "prompt":         return <PromptPanel />;
    case "negativeGenerate": return <NegativePromptPanel />;
    case "style":          return <StylePanel />;
    case "imageMaps":      return <UploadMapPanel />;
    case "preview":        return <PreviewPanel />;
    case "distribution":   return <DistributionPanel />;
    case "seo":            return <SeoPanel />;
    default:               return null;
  }
}

function Panel({ id, className = "" }: { id: RemauraPanelId; className?: string }) {
  const meta = PANEL_REGISTRY[id];
  const size = meta?.defaultSize ?? "medium";
  return (
    <DashboardCard
      size={size}
      showDragHandle={false}
      onHidePanel={undefined}
      className={className}
      bodyClassName={id === "format" ? "overflow-visible" : ""}
    >
      <PanelBody id={id} />
    </DashboardCard>
  );
}

const LEFT_PANELS: RemauraPanelId[] = [
  "format",
  "prompt",
  "negativeGenerate",
  "style",
  "imageMaps",
];

const BOTTOM_PANELS: RemauraPanelId[] = ["distribution", "seo"];

export function RemauraPanelWorkspace() {
  const { visibility } = useRemauraLayout();

  const isVisible = (id: RemauraPanelId) => visibility[id] !== false;

  const visibleLeft   = LEFT_PANELS.filter(isVisible);
  const visibleBottom = BOTTOM_PANELS.filter(isVisible);

  return (
    <div className="space-y-4">
      {/* Two-column area: left panels + preview */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left column — 5/12 */}
        <div className="col-span-12 space-y-4 md:col-span-5">
          {visibleLeft.map((id) => (
            <Panel key={id} id={id} />
          ))}
        </div>

        {/* Right column — 7/12 */}
        {isVisible("preview") && (
          <div className="col-span-12 md:col-span-7">
            <Panel id="preview" className="min-h-[240px]" />
          </div>
        )}
      </div>

      {/* Bottom panels — full width */}
      {visibleBottom.map((id) => (
        <Panel key={id} id={id} />
      ))}
    </div>
  );
}
