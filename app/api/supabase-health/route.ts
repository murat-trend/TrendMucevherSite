import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isLikelyPermissionError(message: string) {
  const m = message.toLowerCase();
  return m.includes("permission") || m.includes("row-level security") || m.includes("rls");
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        connected: false,
        reason: "missing_env",
        detail: "Supabase env değişkenleri eksik.",
      },
      { status: 200 },
    );
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Route health-check for connectivity only.
      },
    },
  });

  const startedAt = Date.now();

  try {
    const { error, count } = await supabase
      .from("products_3d")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (!error) {
      return NextResponse.json({
        connected: true,
        reason: "ok",
        latencyMs: Date.now() - startedAt,
        products3dCount: count ?? null,
      });
    }

    // Permission errors still confirm network/auth connectivity.
    if (isLikelyPermissionError(error.message)) {
      return NextResponse.json({
        connected: true,
        reason: "permission_limited",
        latencyMs: Date.now() - startedAt,
        detail: error.message,
      });
    }

    return NextResponse.json({
      connected: false,
      reason: "query_error",
      latencyMs: Date.now() - startedAt,
      detail: error.message,
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      reason: "network_or_runtime_error",
      latencyMs: Date.now() - startedAt,
      detail: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
