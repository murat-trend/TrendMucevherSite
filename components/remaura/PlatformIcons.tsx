"use client";

import {
  siInstagram,
  siTiktok,
  siThreads,
  siFacebook,
  siPinterest,
  siX,
  siYoutube,
  siEtsy,
  siShopify,
  siGumroad,
} from "simple-icons";

// LinkedIn path (simple-icons compatible)
const linkedinPath = "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

// Shutterstock path
const shutterstockPath = "M9.839 11.718v5.619h5.62v-5.62h-5.62zm-5.619 0v5.619h5.62v-5.62h-5.62zm11.238 0v5.619h5.62v-5.62h-5.62zm-5.619 5.619v5.62h5.62v-5.62h-5.62zm5.619 0v5.62h5.62v-5.62h-5.62zm5.619-11.238v5.62h5.62V6.1h-5.62zm0 11.238v5.62h5.62v-5.62h-5.62zM9.839 6.1v5.619h5.62V6.1h-5.62zm5.619 5.619v5.62h5.62v-5.62h-5.62zM4.22 6.1v5.619h5.62V6.1H4.22zm5.619 5.619v5.62h5.62v-5.62H9.839z";

const iconMap: Record<string, { path: string; hex: string }> = {
  instagram: { path: siInstagram.path, hex: siInstagram.hex },
  tiktok: { path: siTiktok.path, hex: siTiktok.hex },
  threads: { path: siThreads.path, hex: siThreads.hex },
  facebook: { path: siFacebook.path, hex: siFacebook.hex },
  linkedin: { path: linkedinPath, hex: "0A66C2" },
  pinterest: { path: siPinterest.path, hex: siPinterest.hex },
  x: { path: siX.path, hex: siX.hex },
  youtube: { path: siYoutube.path, hex: siYoutube.hex },
  etsy: { path: siEtsy.path, hex: siEtsy.hex },
  amazon: { path: "M15.23 12.5c0-.41-.34-.75-.75-.75H9.5v2.25h4.98c.41 0 .75-.34.75-.75z", hex: "FF9900" },
  shopier: { path: siShopify.path, hex: siShopify.hex },
  gumroad: { path: siGumroad.path, hex: siGumroad.hex },
  adobeStock: { path: "M9.5 10.5v3h2v-3h2v3h2v-3h-6zm-7 6h3v-3h2v3h3v-2h-3v-1h3v-2h-3v-1h3V9h-3v2h-2V9h-3v7zm18-6h-2v2h2v2h-2v2h-2v-2h-2v-2h2v-2h2v2h2v-2h2v2h-2v2h-2v-2h-2v-2h2z", hex: "FF0000" },
  shutterstock: { path: shutterstockPath, hex: "EE2B24" },
  creativeMarket: { path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z", hex: "27A776" },
  next: { path: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z", hex: "00D1B2" },
  trendyol: { path: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", hex: "F27A1A" },
  ciceksepeti: { path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z", hex: "00A650" },
};

type PlatformIconProps = {
  copyId: string;
  size?: number;
  className?: string;
  useBrandColor?: boolean;
};

export function getPlatformHex(copyId: string): string | null {
  const data = iconMap[copyId];
  return data ? (data.hex.startsWith("#") ? data.hex : `#${data.hex}`) : null;
}

export function PlatformIcon({ copyId, size = 16, className = "", useBrandColor = true }: PlatformIconProps) {
  const data = iconMap[copyId];
  if (!data) {
    return <span className={`inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted ${className}`} style={{ width: size, height: size }} />;
  }
  const fill = useBrandColor ? (data.hex.startsWith("#") ? data.hex : `#${data.hex}`) : "currentColor";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={fill}
      aria-hidden
    >
      <path d={data.path} />
    </svg>
  );
}
