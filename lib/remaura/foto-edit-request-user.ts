import { cookies } from "next/headers";
import { createClient as createSupabaseAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Foto edit API rotaları: önce Authorization Bearer (access_token), yoksa çerezler.
 */
export async function resolveRemauraUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();

  if (bearer && url && anonKey) {
    const supabase = createSupabaseAnonClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearer);
    if (!error && user?.id) return user.id;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
