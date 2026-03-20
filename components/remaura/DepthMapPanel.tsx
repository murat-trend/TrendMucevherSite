"use client";

import { useState, useCallback } from "react";

type DepthMapPanelProps = {
  imageSrc: string;
  t: {
    depthMap: string;
    normalMap: string;
    displacementMap: string;
    generatingDepth: string;
    generatingNormal: string;
    generatingDisplacement: string;
    depthMapHint: string;
    downloadImage: string;
  };
};

export function DepthMapPanel({ imageSrc, t }: DepthMapPanelProps) {
  const [depthMap, setDepthMap] = useState<string | null>(null);
  const [normalMap, setNormalMap] = useState<string | null>(null);
  const [displacementMap, setDisplacementMap] = useState<string | null>(null);
  const [isDepthLoading, setIsDepthLoading] = useState(false);
  const [isNormalLoading, setIsNormalLoading] = useState(false);
  const [isDisplacementLoading, setIsDisplacementLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDepthMap = useCallback(async () => {
    if (isDepthLoading) return;
    setIsDepthLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remaura/depth-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setDepthMap(data.depthMap ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Derinlik haritası üretilemedi.");
    } finally {
      setIsDepthLoading(false);
    }
  }, [imageSrc, isDepthLoading]);

  const handleNormalMap = useCallback(async () => {
    if (isNormalLoading) return;
    setIsNormalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remaura/normal-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageSrc,
          ...(depthMap && { depthMap }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setNormalMap(data.normalMap ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Normal map üretilemedi.");
    } finally {
      setIsNormalLoading(false);
    }
  }, [imageSrc, depthMap, isNormalLoading]);

  const handleDisplacementMap = useCallback(async () => {
    if (isDisplacementLoading) return;
    setIsDisplacementLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remaura/displacement-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageSrc,
          ...(depthMap && { depthMap }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Hata");
      setDisplacementMap(data.displacementMap ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Displacement map üretilemedi.");
    } finally {
      setIsDisplacementLoading(false);
    }
  }, [imageSrc, depthMap, isDisplacementLoading]);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
        2.5D / 3D Yardımcı Haritalar
      </h4>
      <p className="mb-3 text-[10px] text-muted/80">
        {t.depthMapHint}
      </p>
      {error && (
        <p className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleDepthMap()}
          disabled={isDepthLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDepthLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.generatingDepth}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18" />
                <path d="m8 7 4-4 4 4" />
                <path d="m8 17 4 4 4-4" />
              </svg>
              {t.depthMap}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleNormalMap()}
          disabled={isNormalLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isNormalLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.generatingNormal}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {t.normalMap}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => void handleDisplacementMap()}
          disabled={isDisplacementLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDisplacementLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t.generatingDisplacement}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
              {t.displacementMap}
            </>
          )}
        </button>
      </div>
      {(depthMap || normalMap || displacementMap) && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {depthMap && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium text-muted">{t.depthMap}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={depthMap} alt="Depth" className="h-24 w-full rounded-lg object-cover" />
              <a
                href={depthMap}
                download="remaura-depth-map.png"
                className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {t.downloadImage}
              </a>
            </div>
          )}
          {normalMap && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium text-muted">{t.normalMap}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={normalMap} alt="Normal" className="h-24 w-full rounded-lg object-cover" />
              <a
                href={normalMap}
                download="remaura-normal-map.png"
                className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {t.downloadImage}
              </a>
            </div>
          )}
          {displacementMap && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-medium text-muted">{t.displacementMap}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displacementMap} alt="Displacement" className="h-24 w-full rounded-lg object-cover" />
              <a
                href={displacementMap}
                download="remaura-displacement-map.png"
                className="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {t.downloadImage}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
