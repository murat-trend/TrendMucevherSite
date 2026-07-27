/**
 * Warnings API'leri için ortak süper-admin geçidi.
 * (koleksiyon-edit route'larındaki requireSuperAdmin ile aynı mantık.)
 */

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

export async function isSuperAdminRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    if (isRemauraSuperAdminUserId(user.id)) return true;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return profile?.role === "admin";
  } catch {
    return false;
  }
}
