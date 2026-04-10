import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  if (!isRemauraSuperAdminUserId(user.id)) {
    redirect("/");
  }

  return children;
}
