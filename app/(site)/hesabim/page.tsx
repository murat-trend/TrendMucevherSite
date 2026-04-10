"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function HesabimPage() {
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
        <p className="text-sm text-muted">Yükleniyor...</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-8 font-display text-2xl font-medium text-foreground">Hesabım</h1>
      <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-6">
        <div>
          <p className="mb-1 text-xs text-muted">Ad Soyad</p>
          <p className="text-sm text-foreground">{user?.full_name || "-"}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted">E-posta</p>
          <p className="text-sm text-foreground">{user?.email}</p>
        </div>
        <div className="border-t border-border/40 pt-2">
          <p className="mb-3 text-xs text-muted">Siparişlerim</p>
          <a href="/siparislerim" className="text-sm text-[#c9a84c] hover:underline">
            Siparişlerimi Görüntüle →
          </a>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          Çıkış Yap
        </button>
      </div>
    </main>
  );
}
