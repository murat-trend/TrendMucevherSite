/**
 * Sağlayıcı kayıt defteri — hangi sağlayıcı hangi env anahtarını kullanır ve
 * onu kullanan araçlar/butonlar hangileri.
 *
 * Amaç: bir sağlayıcı düştüğünde (ör. fal.ai kredisi bitti), onu kullanan TÜM
 * butonları tek bakışta göstermek — 30 route'u tek tek izlemeye gerek kalmadan.
 */

import type { ProviderId } from "./types";

export type ProviderMeta = {
  id: ProviderId;
  /** Süper-admin panelinde görünen gerçek ad (yalnız süper-admin görür). */
  label: string;
  /** Ana env anahtarı adı. */
  envKey: string;
  /** Alternatif env adları (geriye dönük). */
  envKeyAlt?: string[];
  /** Bu sağlayıcıya kredi/ödeme yaptığın panel URL'i. */
  billingUrl: string;
  /** Bu sağlayıcının beslediği araç → buton listesi. */
  usedBy: { tool: string; buttons: string[] }[];
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  fal: {
    id: "fal",
    label: "fal.ai (Flux)",
    envKey: "FAL_KEY",
    billingUrl: "https://fal.ai/dashboard/billing",
    usedBy: [
      { tool: "koleksiyon-edit", buttons: ["Üret", "Harf / ControlNet"] },
      { tool: "isim-kolye", buttons: ["Üret"] },
      { tool: "try-on", buttons: ["Üzerimde Gör"] },
      { tool: "sosyal-post", buttons: ["Üret"] },
      { tool: "nesne-kaldir", buttons: ["Nesne Kaldır"] },
      { tool: "gorseli-netlestir", buttons: ["Netleştir"] },
      { tool: "montur", buttons: ["Düzenle"] },
    ],
  },
  stability: {
    id: "stability",
    label: "Stability AI",
    envKey: "STABILITY_API_KEY",
    billingUrl: "https://platform.stability.ai/account/credits",
    usedBy: [
      { tool: "koleksiyon-edit", buttons: ["Remove BG", "Upscale", "Arka Plan"] },
      { tool: "aci-lab", buttons: ["Netleştir / Repoz"] },
    ],
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GOOGLE_API_KEY",
    billingUrl: "https://aistudio.google.com/app/apikey",
    usedBy: [
      { tool: "koleksiyon-edit", buttons: ["Koleksiyon Üret", "Recolor", "Değiştir", "Taş Kaldır"] },
      { tool: "koleksiyon-lab", buttons: ["Üret"] },
      { tool: "nakkas", buttons: ["Tasarla", "Desen", "Bezele"] },
      { tool: "montur", buttons: ["Düzenle"] },
      { tool: "aci", buttons: ["Üret"] },
      { tool: "iscilik", buttons: ["Üret"] },
      { tool: "creative-studio", buttons: ["Generate"] },
      { tool: "sosyal-post", buttons: ["Üret"] },
      { tool: "uretim-3d", buttons: ["Taş Kaldır"] },
    ],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    billingUrl: "https://platform.openai.com/account/billing/overview",
    usedBy: [
      { tool: "koleksiyon-edit", buttons: ["Analiz"] },
      { tool: "analyze-jewelry", buttons: ["Analiz"] },
      { tool: "analyze-style", buttons: ["Analiz"] },
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    billingUrl: "https://console.anthropic.com/settings/billing",
    usedBy: [
      { tool: "koleksiyon-edit", buttons: ["Üret (prompt)", "Harf", "Arka Plan (prompt)"] },
    ],
  },
  tripo: {
    id: "tripo",
    label: "Tripo3D",
    envKey: "TRIPO3D_API_KEY",
    envKeyAlt: ["TRIPO_API_KEY"],
    billingUrl: "https://platform.tripo3d.ai/billing",
    usedBy: [
      { tool: "uretim-3d", buttons: ["3D Üret (V2)"] },
      { tool: "tripo3d", buttons: ["Oluştur"] },
    ],
  },
  meshy: {
    id: "meshy",
    label: "Meshy",
    envKey: "MESHY_API_KEY",
    billingUrl: "https://www.meshy.ai/settings/billing",
    usedBy: [
      { tool: "uretim-3d", buttons: ["3D Üret (V1)"] },
      { tool: "mesh3d", buttons: ["Oluştur", "Remesh"] },
    ],
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Bir sağlayıcının env anahtarını (alt adlar dahil) ortamdan okur. */
export function readProviderKey(id: ProviderId): string | undefined {
  const meta = PROVIDERS[id];
  const names = [meta.envKey, ...(meta.envKeyAlt ?? [])];
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}
