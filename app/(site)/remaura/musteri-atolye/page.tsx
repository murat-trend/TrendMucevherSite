import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { RemauraAccessGate } from "@/components/remaura/RemauraAccessGate";
import { MusteriAtolyeClient } from "./MusteriAtolyeClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Müşteri Atölyesi | Remaura",
};

export default async function MusteriAtolyePage() {
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

  return (
    <RemauraAccessGate categoryId="musteri-atolye">
      <MusteriAtolyeClient />
    </RemauraAccessGate>
  );
}
