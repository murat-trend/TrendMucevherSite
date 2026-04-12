import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { creditCredits, debitCredits } from "@/lib/billing/store";
import { getSiteSettings } from "@/lib/site/settings-store";
import type { SiteSettings } from "@/lib/site/settings-store";

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase service role yapılandırması eksik.");
  }
  return createServiceClient(url, key);
}

function featuredUnitCredits(settings: SiteSettings, duration: string): number {
  switch (duration) {
    case "week1":
      return settings.campaignFeaturedWeek1PerProduct;
    case "week2":
      return settings.campaignFeaturedWeek2PerProduct;
    case "month1":
      return settings.campaignFeaturedMonth1PerProduct;
    default:
      return 0;
  }
}

function bannerCredits(settings: SiteSettings, duration: string): number {
  switch (duration) {
    case "week1":
      return settings.campaignBannerWeek1;
    case "month1":
      return settings.campaignBannerMonth1;
    default:
      return 0;
  }
}

async function verifyProductOwnership(admin: SupabaseClient, sellerId: string, productIds: string[]): Promise<boolean> {
  if (productIds.length === 0) return true;
  const { data, error } = await admin.from("products_3d").select("id").eq("seller_id", sellerId).in("id", productIds);
  if (error) return false;
  const set = new Set((data ?? []).map((r: { id: string }) => r.id));
  return productIds.every((id) => set.has(id));
}

type PostBody = {
  name?: string;
  campaign_type?: string;
  product_ids?: string[];
  discount_type?: string;
  discount_rate?: number;
  starts_at?: string;
  ends_at?: string;
  featured_duration?: string;
  banner_duration?: string;
  banner_image_url?: string | null;
};

export async function GET() {
  try {
    const cookieStore = await cookies();
    const auth = createClient(cookieStore);
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const admin = getAdmin();
    const settings = await getSiteSettings();
    const { data: campaigns, error } = await admin
      .from("ad_campaigns")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      campaigns: campaigns ?? [],
      creditRates: {
        featuredPerProduct: {
          week1: settings.campaignFeaturedWeek1PerProduct,
          week2: settings.campaignFeaturedWeek2PerProduct,
          month1: settings.campaignFeaturedMonth1PerProduct,
        },
        banner: {
          week1: settings.campaignBannerWeek1,
          month1: settings.campaignBannerMonth1,
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const auth = createClient(cookieStore);
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    }

    const body = (await req.json()) as PostBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const campaignType = body.campaign_type;
    const productIds = Array.isArray(body.product_ids) ? body.product_ids.filter((x): x is string => typeof x === "string") : [];
    const startsAt = typeof body.starts_at === "string" ? body.starts_at : "";
    const endsAt = typeof body.ends_at === "string" ? body.ends_at : "";

    if (!name || !campaignType || !startsAt || !endsAt) {
      return NextResponse.json({ error: "name, campaign_type, starts_at ve ends_at zorunlu." }, { status: 400 });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Geçersiz tarih aralığı." }, { status: 400 });
    }

    const settings = await getSiteSettings();
    const admin = getAdmin();

    let creditCost = 0;
    let discountRate: number | null = null;
    let discountType: string | null = null;
    let bannerImageUrl: string | null = null;

    if (campaignType === "discount") {
      const dt = body.discount_type === "try" ? "try" : body.discount_type === "percent" ? "percent" : null;
      const dr = typeof body.discount_rate === "number" ? body.discount_rate : Number(body.discount_rate);
      if (!dt || !Number.isFinite(dr) || dr <= 0) {
        return NextResponse.json({ error: "İndirim için discount_type (percent|try) ve discount_rate > 0 gerekli." }, { status: 400 });
      }
      if (productIds.length === 0) {
        return NextResponse.json({ error: "En az bir ürün seçin." }, { status: 400 });
      }
      if (!(await verifyProductOwnership(admin, user.id, productIds))) {
        return NextResponse.json({ error: "Seçilen ürünler size ait değil." }, { status: 403 });
      }
      discountType = dt;
      discountRate = dr;
      creditCost = 0;
    } else if (campaignType === "featured") {
      const fd = body.featured_duration;
      if (fd !== "week1" && fd !== "week2" && fd !== "month1") {
        return NextResponse.json({ error: "featured_duration: week1 | week2 | month1" }, { status: 400 });
      }
      if (productIds.length === 0) {
        return NextResponse.json({ error: "En az bir ürün seçin." }, { status: 400 });
      }
      if (!(await verifyProductOwnership(admin, user.id, productIds))) {
        return NextResponse.json({ error: "Seçilen ürünler size ait değil." }, { status: 403 });
      }
      const unit = featuredUnitCredits(settings, fd);
      creditCost = Math.max(0, Math.round(unit * productIds.length));
    } else if (campaignType === "banner") {
      const bd = body.banner_duration;
      if (bd !== "week1" && bd !== "month1") {
        return NextResponse.json({ error: "banner_duration: week1 | month1" }, { status: 400 });
      }
      const url = typeof body.banner_image_url === "string" ? body.banner_image_url.trim() : "";
      if (!url) {
        return NextResponse.json({ error: "Banner görseli (banner_image_url) gerekli." }, { status: 400 });
      }
      bannerImageUrl = url;
      creditCost = Math.max(0, Math.round(bannerCredits(settings, bd)));
    } else {
      return NextResponse.json({ error: "campaign_type: discount | featured | banner" }, { status: 400 });
    }

    let debited = 0;
    if (creditCost > 0) {
      const debit = await debitCredits(user.id, creditCost, `Kampanya: ${campaignType}`);
      if (!debit.ok) {
        return NextResponse.json(
          { error: "Yetersiz kredi.", code: "INSUFFICIENT_CREDITS", wallet: debit.wallet },
          { status: 402 },
        );
      }
      debited = creditCost;
    }

    const insertRow = {
      seller_id: user.id,
      name,
      campaign_type: campaignType,
      status: "pending",
      budget: 0,
      spent: 0,
      clicks: 0,
      impressions: 0,
      revenue: 0,
      product_ids: productIds,
      discount_rate: discountRate,
      discount_type: discountType,
      credit_cost: creditCost,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      banner_image_url: bannerImageUrl,
    };

    const { data: inserted, error: insErr } = await admin.from("ad_campaigns").insert(insertRow).select("id").single();

    if (insErr || !inserted) {
      if (debited > 0) {
        try {
          await creditCredits(user.id, debited, "Kampanya kaydı başarısız — kredi iadesi");
        } catch (reErr) {
          console.error("[kampanya] refund failed:", reErr);
        }
      }
      return NextResponse.json({ error: insErr?.message ?? "Kayıt oluşturulamadı." }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaignId: inserted.id as string });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sunucu hatası.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
