import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = rawId?.trim();
  if (!id) return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  if (!isRemauraSuperAdminUserId(user.id)) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 }); }

  const ALLOWED_TYPES = ["Yüzük", "Kolye", "Bilezik", "Küpe", "Broş"];
  const patch: Record<string, unknown> = {};
  const b = body as Record<string, unknown>;

  if (typeof b.jewelry_type === "string") {
    if (!ALLOWED_TYPES.includes(b.jewelry_type)) {
      return NextResponse.json({ error: "Geçersiz kategori" }, { status: 422 });
    }
    patch.jewelry_type = b.jewelry_type;
  }

  if (typeof b.glb_url === "string") patch.glb_url = b.glb_url;
  if (typeof b.stl_url === "string") patch.stl_url = b.stl_url;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 422 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });

  const admin = createServiceClient(url, serviceKey);
  const { error } = await admin.from("products_3d").update(patch).eq("id", id);
  if (error) {
    console.error("[admin/products-3d PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const admin = createServiceClient(url, serviceKey);
  const { data: row, error: fetchErr } = await admin
    .from("products_3d")
    .select("seller_id, glb_url, stl_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[admin/products-3d DELETE] fetch", fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const uid = user.id.trim().toLowerCase();
  const isSuper = isRemauraSuperAdminUserId(user.id);
  const sellerId = typeof row.seller_id === "string" ? row.seller_id.trim().toLowerCase() : "";
  const isUploader = sellerId !== "" && sellerId === uid;

  if (!isSuper && !isUploader) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const glb =
    typeof row.glb_url === "string" && row.glb_url.trim() !== "" ? row.glb_url.trim() : null;
  const stl =
    typeof row.stl_url === "string" && row.stl_url.trim() !== "" ? row.stl_url.trim() : null;

  const detachOrders: Record<string, unknown> = { product_id: null };
  if (glb) detachOrders.download_glb_url = glb;
  if (stl) detachOrders.download_stl_url = stl;

  let ordersUp = await admin.from("orders").update(detachOrders).eq("product_id", id);
  if (ordersUp.error) {
    const msg = ordersUp.error.message ?? "";
    const missingCol =
      /download_glb_url|download_stl_url|schema cache/i.test(msg) ||
      ordersUp.error.code === "PGRST204";
    if (missingCol) {
      ordersUp = await admin.from("orders").update({ product_id: null }).eq("product_id", id);
    }
  }
  if (ordersUp.error) {
    console.error("[admin/products-3d DELETE] orders detach", ordersUp.error);
    return NextResponse.json({ error: ordersUp.error.message ?? "Siparişler güncellenemedi." }, { status: 500 });
  }

  const msgUp = await admin.from("messages").update({ product_id: null }).eq("product_id", id);
  if (msgUp.error) {
    console.warn("[admin/products-3d DELETE] messages detach", msgUp.error);
  }

  const { error } = await admin.from("products_3d").delete().eq("id", id);

  if (error) {
    console.error("[admin/products-3d DELETE]", error);
    const hint = /foreign key|violates foreign key/i.test(error.message ?? "")
      ? " Bu ürün başka tablolarda (FK) hâlâ kullanılıyor olabilir."
      : "";
    return NextResponse.json({ error: `${error.message ?? "Silinemedi."}${hint}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
