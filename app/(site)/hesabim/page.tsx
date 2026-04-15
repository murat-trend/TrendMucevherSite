"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function HesabimPage() {
  const { t } = useLanguage();
  const b = t.site.buyerAccount;
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/giris?tip=uye");
        return;
      }
      setUser({
        email: user.email ?? "",
        full_name: user.user_metadata?.full_name ?? "",
      });
      setLoading(false);
    };
    void load();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading)
    return (
      <main className="flex min-h-[80vh] items-center justify-center">
        <p className="text-sm text-muted">{t.site.loading}</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-8 font-display text-2xl font-medium text-foreground">{b.title}</h1>
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6">
        <div>
          <p className="mb-1 text-xs text-muted">{b.fullName}</p>
          <p className="text-sm text-foreground">{user?.full_name || "-"}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted">{b.email}</p>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="border-t border-border/40 pt-2">
          <p className="mb-3 text-xs text-muted">{b.ordersSection}</p>
          <Link href="/hesabim/siparislerim" className="text-sm text-[#c9a84c] hover:underline">
            {b.viewOrders}
          </Link>
        </div>
        <div className="border-t border-border/40 pt-4">
          <p className="mb-1 text-xs font-medium text-foreground">{b.becomeSeller}</p>
          <p className="mb-3 text-xs text-muted">{b.becomeSellerHint}</p>
          <Link
            href="/satici-ol"
            className="inline-block rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-2.5 text-sm font-medium text-[#c9a84c] transition-colors hover:bg-[#c9a84c]/20"
          >
            {b.becomeSeller} →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          {b.logout}
        </button>
      </div>
    </main>
  );
}
