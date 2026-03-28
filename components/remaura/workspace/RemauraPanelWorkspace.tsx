"use client";

import type { RemauraPanelId } from "@/lib/remaura/workspace/types";
import { PANEL_REGISTRY } from "@/lib/remaura/workspace/panel-registry";
import { DashboardCard } from "@/components/remaura/dashboard/DashboardCard";
import { useRemauraApp, useRemauraLayout } from "./RemauraWorkspaceContexts";
import { FormatPanel } from "../panels/FormatPanel";
import { JEWELRY_DESIGN_EXCLUDED_FORMATS } from "@/components/remaura/remaura-types";
import { PromptPanel } from "../panels/PromptPanel";
import { NegativePromptPanel } from "../panels/NegativePromptPanel";
import { StylePanel } from "../panels/StylePanel";
import { PreviewPanel } from "../panels/PreviewPanel";
import { DistributionPanel } from "../panels/DistributionPanel";
import { SeoPanel } from "../panels/SeoPanel";
import { ProductStoryPanel } from "../panels/ProductStoryPanel";

const AI_DISCLAIMER_LINE =
  "rounded-lg border border-border/60 bg-surface-alt/90 px-4 py-3 text-center text-sm font-normal leading-relaxed text-muted sm:text-base sm:leading-relaxed dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-foreground/70";

function JewelryAiDisclaimerBanner() {
  const { t } = useRemauraApp();
  return (
    <div className="mx-auto w-full max-w-[1300px] px-2 sm:px-3">
      <p className={AI_DISCLAIMER_LINE} role="note">
        {t.remauraWorkspace.aiContentDisclaimer}
      </p>
    </div>
  );
}

function PanelBody({ id }: { id: RemauraPanelId }) {
  switch (id) {
    case "format":           return <FormatPanel excludeFormats={JEWELRY_DESIGN_EXCLUDED_FORMATS} />;
    case "prompt":           return <PromptPanel />;
    case "negativeGenerate": return <NegativePromptPanel />;
    case "style":            return <StylePanel />;
    case "preview":          return <PreviewPanel />;
    case "distribution":     return <DistributionPanel />;
    case "seo":              return <SeoPanel />;
    default:                 return null;
  }
}

/** Alt satırda stil / prompt ile aynı yükseklik için kartı sütunu doldurur */
function ProductStoryPanelCard() {
  return (
    <DashboardCard
      size="medium"
      showDragHandle={false}
      onHidePanel={undefined}
      className="h-full min-h-0 w-full !h-auto xl:!h-full xl:flex xl:flex-col"
      bodyClassName="min-h-0 flex-1 overflow-y-auto p-5"
    >
      <ProductStoryPanel />
    </DashboardCard>
  );
}

function Panel({
  id,
  className = "",
  fillWorkspaceRow = false,
}: {
  id: RemauraPanelId;
  className?: string;
  /** Alt ızgara satırında ürün hikayesi ile aynı yükseklik */
  fillWorkspaceRow?: boolean;
}) {
  const meta = PANEL_REGISTRY[id];
  const size = meta?.defaultSize ?? "medium";
  const rowHeight =
    fillWorkspaceRow
      ? "h-full min-h-0 w-full !h-auto xl:!h-full xl:flex xl:flex-col"
      : "!h-auto";
  const bodyClassName =
    id === "format"
      ? "min-h-0 flex-1 overflow-visible p-5"
      : fillWorkspaceRow
        ? "min-h-0 flex-1 overflow-y-auto p-5"
        : "";
  return (
    <DashboardCard
      size={size}
      showDragHandle={false}
      onHidePanel={undefined}
      className={`${className} ${rowHeight}`}
      bodyClassName={bodyClassName}
    >
      <PanelBody id={id} />
    </DashboardCard>
  );
}

const LEFT_COLUMN_PANELS: RemauraPanelId[] = ["format"];
const WORKSPACE_ROW_PANELS: RemauraPanelId[] = ["prompt", "negativeGenerate", "style"];
const BOTTOM_PANELS: RemauraPanelId[] = ["distribution", "seo"];

function secondRowGridClass(nBelow: number): string {
  const base = "grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:items-stretch";
  if (nBelow <= 0) return `${base} xl:grid-cols-[minmax(0,280px)]`;
  if (nBelow === 1) return `${base} xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]`;
  if (nBelow === 2) return `${base} xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,1fr)]`;
  return `${base} xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]`;
}

export function RemauraPanelWorkspace() {
  const { visibility } = useRemauraLayout();
  const isVisible = (id: RemauraPanelId) => visibility[id] !== false;

  const visibleLeftColumn = LEFT_COLUMN_PANELS.filter(isVisible);
  const visibleRowPanels = WORKSPACE_ROW_PANELS.filter(isVisible);
  const visibleBottom = BOTTOM_PANELS.filter(isVisible);

  const showPreview = isVisible("preview");
  const showTopRight = showPreview;
  const nBelow = visibleRowPanels.length;

  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-6 px-4">
      {/* Üst: format | önizleme */}
      <div className="flex flex-col gap-4">
        {(visibleLeftColumn.length > 0 || showTopRight) && <JewelryAiDisclaimerBanner />}
        <div className="flex flex-col items-start gap-6 xl:flex-row">
          {visibleLeftColumn.length > 0 && (
            <div className="flex w-full flex-shrink-0 flex-col gap-4 xl:w-[280px]">
              {visibleLeftColumn.map((id) => (
                <Panel key={id} id={id} />
              ))}
            </div>
          )}

          {showTopRight && (
            <div className="min-w-0 w-full flex-1">
              <div className="xl:sticky xl:top-8 xl:z-[5]">
                <Panel
                  id="preview"
                  className="w-full border border-white/10 shadow-2xl !min-h-[450px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alt: ürün hikayesi + prompt / negatif / stil — xl’de aynı satır, eş yükseklik */}
      <div className="flex w-full flex-col gap-0">
        <div className={secondRowGridClass(nBelow)}>
          <div className="flex min-h-[min(280px,50vh)] min-w-0 xl:min-h-[320px]">
            <ProductStoryPanelCard />
          </div>
          {visibleRowPanels.map((id) => (
            <div key={id} className="flex min-h-[min(280px,50vh)] min-w-0 xl:min-h-[320px]">
              <Panel id={id} fillWorkspaceRow />
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-6 pt-4">
        {visibleBottom.map((id) => (
          <Panel key={id} id={id} />
        ))}
      </div>

      <div className="h-20" />
    </div>
  );
}
