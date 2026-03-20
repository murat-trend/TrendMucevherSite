"use client";

import { useSyncExternalStore } from "react";
import { WORKSPACE_BREAKPOINTS } from "@/lib/remaura/workspace/constants";

const MOBILE_MAX = WORKSPACE_BREAKPOINTS.sm - 1;

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

export function useIsWorkspaceMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? MobileMaxInternal() : false),
    () => false
  );
}

function MobileMaxInternal() {
  return window.innerWidth <= MOBILE_MAX;
}
