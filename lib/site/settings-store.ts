import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Site geneli fiyat ve özellik bayrakları (admin paneli olmadan dosyadan yönetilir) */
export type SiteSettings = {
  contentCreditCost: number;
  contentPriceTry: number;
  shippingPriceTry: number;
  freeShippingThresholdTry: number;
  taxRate: number;
  features: {
    generateEnabled: boolean;
    analyzeJewelryEnabled: boolean;
    analyzeStyleEnabled: boolean;
  };
  updatedAt: string;
};

export type AdminSettings = SiteSettings;

const SITE_SETTINGS_ID = "main";

function nowIso() {
  return new Date().toISOString();
}

function defaults(): SiteSettings {
  return {
    contentCreditCost: 1,
    contentPriceTry: 30,
    shippingPriceTry: 99,
    freeShippingThresholdTry: 5000,
    taxRate: 20,
    features: {
      generateEnabled: true,
      analyzeJewelryEnabled: true,
      analyzeStyleEnabled: true,
    },
    updatedAt: nowIso(),
  };
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

function mergeSettings(parsed: Partial<SiteSettings> | null | undefined): SiteSettings {
  const d = defaults();
  if (!parsed || typeof parsed !== "object") return d;
  return {
    ...d,
    ...parsed,
    features: {
      ...d.features,
      ...(parsed.features ?? {}),
    },
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[site settings] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return defaults();
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", SITE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error("[site settings] read failed:", error);
    return defaults();
  }

  const raw = data?.data as Partial<SiteSettings> | null | undefined;
  return mergeSettings(raw);
}

export async function getAdminSettings(): Promise<SiteSettings> {
  return getSiteSettings();
}

export async function updateSiteSettings(
  patch: Partial<Omit<SiteSettings, "updatedAt">>
): Promise<SiteSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Site ayarları için NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  }

  const current = await getSiteSettings();
  const next: SiteSettings = {
    ...current,
    ...patch,
    features: {
      ...current.features,
      ...(patch.features ?? {}),
    },
    updatedAt: nowIso(),
  };

  const { error } = await supabase.from("site_settings").upsert(
    { id: SITE_SETTINGS_ID, data: next },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[site settings] upsert failed:", error);
    throw new Error(error.message || "Site ayarları kaydedilemedi.");
  }

  return next;
}

export async function updateAdminSettings(
  patch: Partial<Omit<SiteSettings, "updatedAt">>
): Promise<SiteSettings> {
  return updateSiteSettings(patch);
}
