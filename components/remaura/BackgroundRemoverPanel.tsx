"use client";

import { useState, useCallback } from "react";

type BackgroundRemoverPanelProps = {
  imageSrc: string;
  onRemoved: (newImage: string) => void;
  onError?: (message: string | null) => void;
  t: {
    removeBackground: string;
    removingBackground: string;
    removeBackgroundHint: string;
  };
};

export function BackgroundRemoverPanel({
  imageSrc,
  onRemoved,
  onError,
  t,
}: BackgroundRemoverPanelProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveBackground = useCallback(async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    onError?.(null);

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(imageSrc);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onRemoved(dataUrl);
        setIsRemoving(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Arka plan çıkarılamadı.";
      onError?.(msg);
      setIsRemoving(false);
    }
  }, [imageSrc, isRemoving, onRemoved, onError]);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
        {t.removeBackground}
      </h4>
      <p className="mb-3 text-[10px] text-muted/80">{t.removeBackgroundHint}</p>
      <button
        type="button"
        onClick={() => void handleRemoveBackground()}
        disabled={isRemoving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-violet-700 active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRemoving ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t.removingBackground}
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
              <line x1="16" x2="22" y1="5" y2="5" />
              <line x1="22" x2="16" y1="9" y2="9" />
              <line x1="16" x2="22" y1="13" y2="13" />
            </svg>
            {t.removeBackground}
          </>
        )}
      </button>
    </div>
  );
}
