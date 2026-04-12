"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

function deriveSource(): string {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = window.location.hostname;
    const rHost = new URL(ref).hostname;
    if (rHost === host) return "internal";
    if (/google|bing|yahoo/i.test(ref)) return "organic";
    if (/instagram|facebook|twitter|tiktok/i.test(ref)) return "social";
    return "referral";
  } catch {
    return "direct";
  }
}

function sessionKey(): string {
  if (typeof sessionStorage === "undefined") return "";
  const k = "pv_session_id";
  let id = sessionStorage.getItem(k);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(k, id);
  }
  return id;
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/")) return;
    if (pathname.startsWith("/admin")) return;
    // Ürün detayı: kendi effect'i /api/page-view ile product_id gönderir
    if (/^\/modeller\/[^/]+/.test(pathname)) return;

    const dedupeKey = `pv_dedupe_${pathname}`;
    const now = Date.now();
    try {
      const prev = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(dedupeKey) : null;
      if (prev && now - Number(prev) < 1500) return;
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(dedupeKey, String(now));
    } catch {
      /* sessionStorage kapalı */
    }

    const send = async () => {
      const source = deriveSource();
      const session_id = sessionKey();
      let user_id: string | undefined;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        user_id = data.session?.user?.id;
      } catch {
        /* anon */
      }

      try {
        await fetch("/api/page-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            page_path: pathname,
            source,
            session_id,
            ...(user_id ? { user_id } : {}),
          }),
        });
      } catch {
        /* isteğe bağlı */
      }
    };

    void send();
  }, [pathname]);

  return null;
}
