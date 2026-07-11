import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { KolyeDeneClient } from "./KolyeDeneClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Kolye Dene | Remaura",
};

export default async function KolyeDenePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    redirect("/remaura");
  }

  return <KolyeDeneClient />;
}
