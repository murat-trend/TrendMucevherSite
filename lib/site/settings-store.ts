import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

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

const SITE_DIR = path.join(process.cwd(), "data", "site");
const SETTINGS_PATH = path.join(SITE_DIR, "settings.json");
const LEGACY_SETTINGS_PATH = path.join(process.cwd(), "data", "admin", "settings.json");

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

async function ensureFile(): Promise<void> {
  await mkdir(SITE_DIR, { recursive: true });
  try {
    await readFile(SETTINGS_PATH, "utf8");
  } catch {
    try {
      await copyFile(LEGACY_SETTINGS_PATH, SETTINGS_PATH);
    } catch {
      await writeFile(SETTINGS_PATH, JSON.stringify(defaults(), null, 2), "utf8");
    }
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  await ensureFile();
  const raw = await readFile(SETTINGS_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as SiteSettings;
    return {
      ...defaults(),
      ...parsed,
      features: {
        ...defaults().features,
        ...(parsed.features ?? {}),
      },
    };
  } catch {
    return defaults();
  }
}

export async function getAdminSettings(): Promise<SiteSettings> {
  return getSiteSettings();
}

export async function updateSiteSettings(
  patch: Partial<Omit<SiteSettings, "updatedAt">>
): Promise<SiteSettings> {
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
  await writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function updateAdminSettings(
  patch: Partial<Omit<SiteSettings, "updatedAt">>
): Promise<SiteSettings> {
  return updateSiteSettings(patch);
}
