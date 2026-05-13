import { NextResponse } from "next/server";
import { requireBlogAdminJson } from "@/lib/admin/blog-admin-auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type NotificationKind = "order" | "member" | "message";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle: string | null;
  created_at: string;
  href: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: Request) {
  const gate = await requireBlogAdminJson();
  if (!gate.ok) return gate.response;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Yapılandırma eksik" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);

  const [ordersRes, membersRes, messagesRes] = await Promise.all([
    sb
      .from("orders")
      .select("id, created_at, customer_name, customer_email, amount, payment_status")
      .order("created_at", { ascending: false })
      .limit(limitParam),
    sb
      .from("profiles")
      .select("id, created_at, full_name, email")
      .order("created_at", { ascending: false })
      .limit(limitParam),
    sb
      .from("contact_messages")
      .select("id, created_at, name, email, subject, message")
      .order("created_at", { ascending: false })
      .limit(limitParam),
  ]);

  const items: NotificationItem[] = [];

  for (const o of ordersRes.data ?? []) {
    const order = o as {
      id: string;
      created_at: string;
      customer_name: string | null;
      customer_email: string | null;
      amount: number | null;
      payment_status: string | null;
    };
    items.push({
      id: `order:${order.id}`,
      kind: "order",
      title: order.customer_name
        ? `${order.customer_name} sipariş verdi`
        : "Yeni sipariş",
      subtitle: [
        order.customer_email,
        order.amount != null
          ? `${order.amount.toLocaleString("tr-TR")} ₺`
          : null,
        order.payment_status,
      ]
        .filter(Boolean)
        .join(" · "),
      created_at: order.created_at,
      href: `/admin/orders`,
    });
  }

  for (const m of membersRes.data ?? []) {
    const member = m as {
      id: string;
      created_at: string;
      full_name: string | null;
      email: string | null;
    };
    items.push({
      id: `member:${member.id}`,
      kind: "member",
      title: member.full_name
        ? `${member.full_name} kayıt oldu`
        : "Yeni üye kaydı",
      subtitle: member.email,
      created_at: member.created_at,
      href: `/admin/customers`,
    });
  }

  for (const msg of messagesRes.data ?? []) {
    const m = msg as {
      id: string;
      created_at: string;
      name: string;
      email: string;
      subject: string | null;
      message: string;
    };
    items.push({
      id: `message:${m.id}`,
      kind: "message",
      title: `${m.name} mesaj gönderdi`,
      subtitle: m.subject ?? m.message.slice(0, 80),
      created_at: m.created_at,
      href: null,
    });
  }

  items.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return NextResponse.json({ notifications: items.slice(0, limitParam) });
}
