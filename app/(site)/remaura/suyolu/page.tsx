import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { SuyoluClient } from "./SuyoluClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Suyolu | Remaura",
};

// SUYOLU — sadece süper-admin (Murat). Telkari/geometri sayfasından bağımsız,
// tek amaçlı araç: suyolu (tennis) bileklik üretimi. Kurallar: lib/remaura/suyolu/SUYOLU.md
export default async function SuyoluPage() {
  // lokal önizleme: dev modunda gate atlanır (production'da etkisiz —
  // RemauraAccessGate'teki kanıtlı desen)
  if (process.env.NODE_ENV === "development") return <SuyoluClient />;

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

  return <SuyoluClient />;
}
