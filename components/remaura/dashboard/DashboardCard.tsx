"use client";

import { dashboardCardTokens } from "./dashboard-card-tokens";

export type DashboardCardProps = {
  children: React.ReactNode;
  /** aria / data — registry’deki boyut etiketi */
  size: string;
  /** Builder: sürükleme şeridi */
  showDragHandle?: boolean;
  /** Builder: paneli gizle */
  onHidePanel?: () => void;
  className?: string;
  bodyClassName?: string;
};

export function DashboardCard({
  children,
  size,
  showDragHandle = true,
  onHidePanel,
  className = "",
  bodyClassName = "",
}: DashboardCardProps) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col ${dashboardCardTokens.shell} ${className}`}
      data-dashboard-size={size}
    >
      {(showDragHandle || onHidePanel) && (
        <div
          className={`${dashboardCardTokens.dragStrip} ${!showDragHandle ? "justify-end" : "justify-between"}`}
        >
          {showDragHandle ? (
            <div className="dashboard-drag-handle flex cursor-grab touch-none items-center gap-1 active:cursor-grabbing">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted"
                aria-hidden
              >
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="19" r="1" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Taşı</span>
            </div>
          ) : (
            <span />
          )}
          {onHidePanel ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHidePanel();
              }}
              className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted hover:bg-destructive/10 hover:text-destructive"
            >
              Gizle
            </button>
          ) : null}
        </div>
      )}
      <div className={`${dashboardCardTokens.body} ${bodyClassName}`}>{children}</div>
    </div>
  );
}
