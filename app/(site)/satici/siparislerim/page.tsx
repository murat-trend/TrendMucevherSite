"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SaticiNav } from "@/app/(site)/satici/dashboard/page";

type Order = {
  id: string;
  product_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  license_type: string | null;
  amount: number;
  payment_status: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  cancelled: "İptal",
  refunded: "İade",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-red-500/15 text-red-300",
  refunded: "bg-blue-500/15 text-blue-300",
};

export default function SiparislerimPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("id, product_name, customer_name, customer_email, license_type, amount, payment_status, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <SaticiNav active="Siparişlerim" />
      <h1 className="font-display text-2xl text-foreground mb-6">Siparişlerim</h1>
      {loading ? (
        <p className="text-sm text-muted">Yükleniyor...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted">Henüz sipariş yok</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Sipariş</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Ürün</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Müşteri</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Lisans</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Tutar</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Durum</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{order.product_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{order.customer_name ?? "-"}</p>
                    <p className="text-[11px] text-muted">{order.customer_email ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{order.license_type === "commercial" ? "Ticari" : "Kişisel"}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">₺{order.amount.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[order.payment_status ?? "pending"] ?? "bg-gray-500/15 text-gray-300"}`}
                    >
                      {STATUS_LABEL[order.payment_status ?? "pending"] ?? order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(order.created_at).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-[#0f1117] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Sipariş Detayı</h3>
              <button type="button" onClick={() => setSelectedOrder(null)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Sipariş No</span>
                <span className="font-mono text-foreground">{selectedOrder.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Ürün</span>
                <span className="text-foreground">{selectedOrder.product_name ?? "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Müşteri Adı</span>
                <span className="text-foreground">{selectedOrder.customer_name ?? "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">E-posta</span>
                <span className="text-foreground">{selectedOrder.customer_email ?? "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Lisans</span>
                <span className="text-foreground">{selectedOrder.license_type === "commercial" ? "Ticari" : "Kişisel"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tutar</span>
                <span className="font-semibold text-foreground">₺{selectedOrder.amount.toLocaleString("tr-TR")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Durum</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[selectedOrder.payment_status ?? "pending"] ?? "bg-gray-500/15 text-gray-300"}`}
                >
                  {STATUS_LABEL[selectedOrder.payment_status ?? "pending"] ?? selectedOrder.payment_status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tarih</span>
                <span className="text-foreground">{new Date(selectedOrder.created_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full rounded-lg border border-border/40 px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
