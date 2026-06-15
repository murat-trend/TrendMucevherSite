/**
 * 3D-ÜRET izole panel — ortak süper-admin geçidi.
 *
 * Panel şimdilik süper-admin/iç araç olarak başlatılır (Remaura deseni).
 * İleride müşteriye açılırken yalnızca bu yardımcı kredi-bazlı guard ile
 * değiştirilecek; rotalara dokunmadan auth modeli buradan yönetilir.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

export type SuperAdminGate =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function requireSuperAdmin(): Promise<SuperAdminGate> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }),
    };
  }
  return { ok: true };
}
