import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ signedIn: false as const });
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role: "seller" | "buyer" = profile?.role === "seller" ? "seller" : "buyer";
    return NextResponse.json({
      signedIn: true as const,
      email: user.email ?? null,
      role,
      isSuperAdmin: isRemauraSuperAdminUserId(user.id),
    });
  } catch {
    return NextResponse.json({ signedIn: false as const });
  }
}
