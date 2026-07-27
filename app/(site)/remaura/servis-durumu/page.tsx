import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { RemauraServiceStatus } from "@/components/remaura/RemauraServiceStatus";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Servis Durumu | Remaura",
};

export default async function ServisDurumuPage() {
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
    <div className="min-h-screen bg-[#07080a] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Servis Durumu & Uyarılar</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tüm Remaura araçlarının bağlı olduğu servislerin canlı durumu ve aktif uyarılar.
          </p>
        </div>
        <RemauraServiceStatus />
      </div>
    </div>
  );
}
