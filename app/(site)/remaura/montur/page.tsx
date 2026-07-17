import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { MonturClient } from "./MonturClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Montur | Remaura",
};

// MONTÜR — sadece süper-admin (Murat). Reçete-önce + prompt düzenleme:
// reçete kural motorundan üretilir, komutlar reçeteyi düzenler (MONTUR.md §0).
// Kurallar: lib/remaura/montur/MONTUR.md
export default async function MonturPage() {
  // lokal önizleme: dev modunda gate atlanır (production'da etkisiz)
  if (process.env.NODE_ENV === "development") return <MonturClient />;

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

  return <MonturClient />;
}
