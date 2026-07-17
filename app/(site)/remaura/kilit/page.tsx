import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { KilitClient } from "./KilitClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Kilit | Remaura",
};

// KİLİT — sadece süper-admin (Murat). Zincir ailesinin kardeş aracı:
// parametrik kilit üretimi (kutu kilit / toggle / kanca — dökülebilir tipler).
// Kurallar: lib/remaura/kilit/KILIT.md
export default async function KilitPage() {
  // lokal önizleme: dev modunda gate atlanır (production'da etkisiz)
  if (process.env.NODE_ENV === "development") return <KilitClient />;

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

  return <KilitClient />;
}
