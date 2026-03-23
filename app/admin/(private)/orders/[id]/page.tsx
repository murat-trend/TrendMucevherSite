import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/components/admin/orders/order-detail-data";
import { OrderDetailView } from "@/components/admin/orders/OrderDetailView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const o = getOrderDetail(id);
  if (!o) return { title: "Sipariş | Super Admin" };
  return {
    title: `${o.orderNo} | Sipariş`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = getOrderDetail(id);
  if (!order) notFound();
  return <OrderDetailView order={order} />;
}
