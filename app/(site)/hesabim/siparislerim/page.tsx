"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Order = {
  id: string;
  created_at: string;
  amount: number;
  payment_status: string;
  product_name: string | null;
};

export default function SiparislerimPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/giris?tip=uye"); return; }

      const { data } = await supabase
        .from("orders")
        .select("id, created_at, amount, payment_status, product_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setOrders((data ?? []) as Order[]);
      setLoading(false);
    })();
  }, [router]);

  const statusLabel: Record<string, { label: string; cls: string }> = {
    paid:     { label: "Ödendi",    cls: "text-green-600 bg-green-50 border-green-200" },
    pending:  { label: "Bekliyor",  cls: "text-amber-600 bg-amber-50 border-amber-200" },
    refunded: { label: "İade",      cls: "text-blue-600  bg-blue-50  border-blue-200"  },
    failed:   { label: "Başarısız", cls: "text-red-600   bg-red-50   border-red-200"   },
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="h-5 w-32 animate-pulse rounded bg-foreground/10" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/hesabim" className="text-xs text-muted hover:text-foreground transition-colors">
          ← Hesabım
        </Link>
        <span className="text-muted/40">/</span>
        <h1 className="font-display text-xl font-medium text-foreground">Siparişlerim</h1>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-10 text-center">
          <p className="text-sm text-foreground font-medium">Henüz sipariş yok</p>
          <p className="mt-2 text-xs text-muted">Satın aldığınız ürünler burada görünecek.</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-80"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const s = statusLabel[o.payment_status] ?? { label: o.payment_status, cls: "text-muted bg-muted/10 border-border" };
            return (
              <li key={o.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-card px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {o.product_name ?? "Ürün"}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(o.created_at).toLocaleDateString("tr-TR")} · ₺{Number(o.amount).toLocaleString("tr-TR")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.cls}`}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
