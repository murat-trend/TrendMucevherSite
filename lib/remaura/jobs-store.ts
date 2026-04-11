import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export type RemauraJobType = "generate" | "optimize" | "analyze_style" | "analyze_jewelry";
export type RemauraJobStatus = "ok" | "error";

export type RemauraJobEntry = {
  id: string;
  type: RemauraJobType;
  status: RemauraJobStatus;
  userId?: string;
  platform?: string;
  durationMs: number;
  estimatedCostUsd?: number;
  message?: string;
  createdAt: string;
};

type RemauraJobRow = {
  id: string;
  type: string;
  status: string;
  user_id: string | null;
  platform: string | null;
  estimated_cost_usd: number | string | null;
  message: string | null;
  duration_ms: number;
  created_at: string;
};

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function rowToEntry(row: RemauraJobRow): RemauraJobEntry {
  const est = row.estimated_cost_usd;
  return {
    id: row.id,
    type: row.type as RemauraJobType,
    status: row.status as RemauraJobStatus,
    userId: row.user_id ?? undefined,
    platform: row.platform ?? undefined,
    durationMs: row.duration_ms,
    estimatedCostUsd: est != null && est !== "" ? Number(est) : undefined,
    message: row.message ?? undefined,
    createdAt: row.created_at,
  };
}

export async function appendRemauraJob(
  input: Omit<RemauraJobEntry, "id" | "createdAt">
): Promise<RemauraJobEntry> {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const fallback: RemauraJobEntry = { id, createdAt, ...input };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[remaura jobs] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return fallback;
  }

  const { data, error } = await supabase
    .from("remaura_jobs")
    .insert({
      id,
      type: input.type,
      status: input.status,
      user_id: input.userId ?? null,
      platform: input.platform ?? null,
      estimated_cost_usd: input.estimatedCostUsd ?? null,
      message: input.message ?? null,
      duration_ms: input.durationMs,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[remaura jobs] insert failed:", error);
    return fallback;
  }

  return rowToEntry(data as RemauraJobRow);
}

export async function listRemauraJobs(limit = 200): Promise<RemauraJobEntry[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[remaura jobs] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return [];
  }

  const { data, error } = await supabase
    .from("remaura_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, limit));

  if (error) {
    console.error("[remaura jobs] list failed:", error);
    return [];
  }

  return ((data ?? []) as RemauraJobRow[]).map(rowToEntry);
}
