"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { DepthMapPanel } from "./DepthMapPanel";

type ImageMapsUploadBlockProps = {
  /** DashboardCard ile sarıldığında dış çerçeveyi kaldırır */
  embedded?: boolean;
  t: {
    uploadImageForMaps: string;
    uploadImageForMapsHint: string;
    upload: string;
    remove: string;
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

export function ImageMapsUploadBlock({ t, embedded = false }: ImageMapsUploadBlockProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClear = useCallback(() => {
    setUploadedImage(null);
  }, []);

  const inner = (
    <>
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <div
          className="h-2 w-2 shrink-0 rounded-full bg-teal-500"
          style={{ boxShadow: "0 0 8px #14b8a6" }}
          aria-hidden
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-muted">
          {t.uploadImageForMaps}
        </span>
      </div>
      <p className="mb-3 text-[10px] text-muted/80">
        {t.uploadImageForMapsHint}
      </p>

      {!uploadedImage ? (
        <label
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors ${
            isDragging
              ? "border-teal-500 bg-teal-500/10"
              : "border-border hover:border-teal-500/50 hover:bg-teal-500/5 dark:border-white/10 dark:hover:border-teal-500/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          <span className="text-sm font-medium text-foreground">
            {t.upload}
          </span>
          <span className="text-[10px] text-muted">
            PNG, JPG veya WebP
          </span>
        </label>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-xl border border-border bg-black/20 dark:border-white/10">
            <Image
              src={uploadedImage}
              alt=""
              width={400}
              height={400}
              className="h-32 w-full object-contain"
              unoptimized
              sizes="400px"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 focus:outline-none"
              aria-label={t.remove}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <DepthMapPanel
            imageSrc={uploadedImage}
            t={{
              depthMap: t.depthMap,
              normalMap: t.normalMap,
              displacementMap: t.displacementMap,
              generatingDepth: t.generatingDepth,
              generatingNormal: t.generatingNormal,
              generatingDisplacement: t.generatingDisplacement,
              depthMapHint: t.depthMapHint,
              downloadImage: t.downloadImage,
            }}
          />
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="flex h-full min-h-0 flex-col">{inner}</div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 dark:border-white/10 dark:bg-white/[0.03]">
      {inner}
    </div>
  );
}
