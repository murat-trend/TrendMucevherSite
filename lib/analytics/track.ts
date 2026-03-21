"use client";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = { event, ...params };

  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }
}

