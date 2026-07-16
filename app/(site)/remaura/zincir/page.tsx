import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { ZincirClient } from "./ZincirClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Zincir | Remaura",
};

// ZİNCİR — sadece süper-admin (Murat). Suyolu gibi tek amaçlı izole araç:
// parametrik zincir üretimi (forse/gurmet/Küba/figaro). Kurallar:
// lib/remaura/zincir/ZINCIR.md
export default async function ZincirPage() {
  // lokal önizleme: dev modunda gate atlanır (production'da etkisiz —
  // RemauraAccessGate'teki kanıtlı desen)
  if (process.env.NODE_ENV === "development") return <ZincirClient />;

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

  return <ZincirClient />;
}
