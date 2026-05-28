import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { GaleriClient } from "./GaleriClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Galeri | Remaura",
};

export type Koleksiyon = {
  id: string;
  created_at: string;
  user_id: string | null;
  koleksiyon_adi: string | null;
  gorsel_url: string;
  tip: string | null;
  tema: string | null;
  metal: string | null;
  stil_karti_id: string | null;
};

export type StilKarti = {
  id: string;
  user_id: string | null;
  isim: string;
  metal: string | null;
  teknik: string | null;
  motif: string | null;
  tas_detay: string | null;
  mood: string | null;
  stil_prompt: string;
  referans_gorsel_url: string | null;
  ornek_uretim_url: string | null;
  created_at: string;
};

export default async function GaleriPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/giris");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isRemauraSuperAdminUserId(user.id) && profile?.role !== "admin") {
    redirect("/remaura");
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const [kolRes, stilRes] = await Promise.all([
    admin
      .from("koleksiyonlar")
      .select("*")
      .order("created_at", { ascending: false }),
    admin
      .from("stil_kartlari")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <GaleriClient
      initialKoleksiyonlar={(kolRes.data ?? []) as Koleksiyon[]}
      initialStilKartlari={(stilRes.data ?? []) as StilKarti[]}
    />
  );
}
