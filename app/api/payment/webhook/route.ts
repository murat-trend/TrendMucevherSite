// ÖDEME SİSTEMİ NOTU:
// PayTR veya Halkbank entegrasyonunda bu route'u güncelle.
// Webhook URL: https://trendmucevher.com/api/payment/webhook
// Gerekli alanlar: order_id, payment_status: 'paid'
// Email: Resend ile no-reply@no-reply.trendmucevher.com'dan gönderiliyor

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const LOG_PREFIX = "[payment/webhook]";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, payment_status } = body as { order_id: string; payment_status: string };

    if (!order_id || payment_status !== "paid") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const downloadToken = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 gün

    const { data: order, error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        download_token: downloadToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq("id", order_id)
      .select("customer_email, customer_name, product_name, amount, license_type, product_id")
      .single();

    if (error || !order) {
      console.error(LOG_PREFIX, "Sipariş güncellenemedi:", error);
      return NextResponse.json({ error: "Sipariş güncellenemedi" }, { status: 500 });
    }

    if (order.product_id) {
      const { data: product } = await supabase
        .from("products_3d")
        .select("glb_url, stl_url")
        .eq("id", order.product_id)
        .maybeSingle();
      const patch: { download_glb_url?: string | null; download_stl_url?: string | null } = {};
      if (product?.glb_url && String(product.glb_url).trim() !== "") {
        patch.download_glb_url = String(product.glb_url).trim();
      }
      if (product?.stl_url && String(product.stl_url).trim() !== "") {
        patch.download_stl_url = String(product.stl_url).trim();
      }
      if (Object.keys(patch).length > 0) {
        const snapErr = await supabase.from("orders").update(patch).eq("id", order_id);
        if (snapErr.error) {
          console.warn(LOG_PREFIX, "İndirme URL anlık kopyası yazılamadı (sütun yok olabilir):", snapErr.error.message);
        }
      }
    }

    const downloadUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/indir/${downloadToken}`;

    await resend.emails.send({
      from: "Trend Mücevher <no-reply@no-reply.trendmucevher.com>",
      to: order.customer_email,
      subject: `${order.product_name} — İndirme Linkiniz Hazır`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #0a0a0a; color: #e8e0d0;">
          <h1 style="color: #c9a84c; font-weight: 300; letter-spacing: 0.08em;">Trend Mücevher</h1>
          <p>Merhaba ${order.customer_name},</p>
          <p>Siparişiniz onaylandı. Aşağıdaki linkten modelinizi indirebilirsiniz:</p>
          <a href="${downloadUrl}" style="display: inline-block; margin: 1rem 0; padding: 12px 24px; background: #c9a84c; color: #000; text-decoration: none; border-radius: 4px;">
            Modeli İndir
          </a>
          <p style="color: #8a8278; font-size: 12px;">Bu link 7 gün geçerlidir. En fazla 3 kez indirilebilir.</p>
          <p style="color: #8a8278; font-size: 12px;">Ürün: ${order.product_name} | Lisans: ${order.license_type === "commercial" ? "Ticari" : "Kişisel"} | Tutar: ₺${order.amount}</p>
        </div>
      `,
    });

    console.log(LOG_PREFIX, `Sipariş ${order_id} ödendi, email gönderildi: ${order.customer_email}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(LOG_PREFIX, err);
    return NextResponse.json({ error: "Webhook hatası" }, { status: 500 });
  }
}
