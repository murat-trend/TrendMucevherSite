"use client";

/**
 * Önizleme: export ile aynı konum/opacity (8% genişlik, sağ alt 12px).
 */
export function RemauraWatermarkOverlay() {
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-[2] w-[8%] min-w-[20px] max-w-[72px]"
      style={{ opacity: 0.72 }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
      <img src="/rem-icon.png" alt="" className="h-auto w-full select-none object-contain" draggable={false} />
    </div>
  );
}
