"use client";

import type { RemauraPanelId } from "@/lib/remaura/workspace/types";
import { PANEL_REGISTRY } from "@/lib/remaura/workspace/panel-registry";
import { DashboardCard } from "@/components/remaura/dashboard/DashboardCard";
import { useRemauraLayout } from "./RemauraWorkspaceContexts";
import { FormatPanel } from "../panels/FormatPanel";
import { PromptPanel } from "../panels/PromptPanel";
import { NegativePromptPanel } from "../panels/NegativePromptPanel";
import { StylePanel } from "../panels/StylePanel";
import { PreviewPanel } from "../panels/PreviewPanel";
import { DistributionPanel } from "../panels/DistributionPanel";
import { SeoPanel } from "../panels/SeoPanel";

function PanelBody({ id }: { id: RemauraPanelId }) {
  switch (id) {
    case "format":           return <FormatPanel />;
    case "prompt":           return <PromptPanel />;
    case "negativeGenerate": return <NegativePromptPanel />;
    case "style":            return <StylePanel />;
    case "preview":          return <PreviewPanel />;
    case "distribution":     return <DistributionPanel />;
    case "seo":              return <SeoPanel />;
    default:                 return null;
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
      className={`${className} !h-auto`}
      bodyClassName={id === "format" ? "overflow-visible" : ""}
    >
      <PanelBody id={id} />
    </DashboardCard>
  );
}

const LEFT_PANELS: RemauraPanelId[] = ["format", "prompt", "negativeGenerate", "style"];
const BOTTOM_PANELS: RemauraPanelId[] = ["distribution", "seo"];

export function RemauraPanelWorkspace() {
  const { visibility } = useRemauraLayout();
  const isVisible = (id: RemauraPanelId) => visibility[id] !== false;

  const visibleLeft   = LEFT_PANELS.filter(isVisible);
  const visibleBottom = BOTTOM_PANELS.filter(isVisible);

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-6 px-4">

      {/* ÜST BÖLÜM: Sol ve Sağ Sütun */}
      <div className="flex flex-col items-start gap-6 xl:flex-row">

        {/* SOL SÜTUN */}
        <div className="flex w-full flex-shrink-0 flex-col gap-4 xl:w-[280px]">
          {visibleLeft.map((id) => (
            <Panel key={id} id={id} />
          ))}
        </div>

        {/* SAĞ SÜTUN - Preview */}
        {isVisible("preview") && (
          <div className="min-w-0 w-full flex-1">
            <div className="xl:sticky xl:top-8">
              <Panel
                id="preview"
                className="w-full border border-white/10 shadow-2xl !min-h-[450px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ALT PANELLER */}
      <div className="flex w-full flex-col gap-6 pt-4">
        {visibleBottom.map((id) => (
          <Panel key={id} id={id} />
        ))}
      </div>

      <div className="h-20" />
    </div>
  );
}
