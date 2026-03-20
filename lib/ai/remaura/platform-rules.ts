/**
 * Platform algoritma kuralları
 * Haftalık güncelleme ile sosyal medya algoritmalarına uyum sağlar.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type PlatformRule = {
  maxCaptionLength?: number;
  optimalCaptionLength?: number;
  recommendedHashtagCount?: string;
  maxHashtags?: number;
  maxDescriptionLength?: number;
  optimalDescriptionLength?: number;
  recommendedKeywordCount?: string;
  recommendedTagCount?: string;
  maxBaslikLength?: number;
  maxTagCount?: number;
  metaTitleMaxLength?: number;
  metaDescMaxLength?: number;
  formatHints?: string;
  algorithmNotes?: string;
  /** Etiket/hashtag formatı ve kutu eşlemesi: Açıklama / Etiketler / Hashtagler */
  tagHashtagLogic?: string;
};

export type PlatformRulesData = {
  lastUpdated: string;
  version: number;
  platforms: Record<string, PlatformRule>;
};

const RULES_PATH = join(process.cwd(), "data", "platform-algorithm-rules.json");

let cachedRules: PlatformRulesData | null = null;

export function loadPlatformRules(): PlatformRulesData {
  if (cachedRules) return cachedRules;
  if (!existsSync(RULES_PATH)) {
    cachedRules = {
      lastUpdated: new Date().toISOString().slice(0, 10),
      version: 1,
      platforms: {},
    };
    return cachedRules;
  }
  const raw = readFileSync(RULES_PATH, "utf-8");
  cachedRules = JSON.parse(raw) as PlatformRulesData;
  return cachedRules;
}

export function getRulesForPrompt(): string {
  const data = loadPlatformRules();
  const lines: string[] = [
    "PLATFORM ALGORİTMA KURALLARI (araştırılmış gerçek veri - son güncelleme: " + data.lastUpdated + "):",
    "Bu kurallar haftalık script ile güncellenir. SADECE bu değerleri kullan.",
  ];
  for (const [platform, rule] of Object.entries(data.platforms)) {
    if (!rule) continue;
    const parts: string[] = [`- ${platform}:`];
    if (rule.optimalCaptionLength) parts.push(`  Caption optimal: ${rule.optimalCaptionLength} karakter`);
    if (rule.maxCaptionLength) parts.push(`  Caption max: ${rule.maxCaptionLength}`);
    if (rule.recommendedHashtagCount) parts.push(`  Hashtag sayısı: ${rule.recommendedHashtagCount}`);
    if (rule.maxHashtags) parts.push(`  Hashtag max: ${rule.maxHashtags}`);
    if (rule.recommendedKeywordCount) parts.push(`  Anahtar kelime: ${rule.recommendedKeywordCount}`);
    if (rule.recommendedTagCount) parts.push(`  Tag sayısı: ${rule.recommendedTagCount}`);
    if (rule.maxTagCount) parts.push(`  Tag max: ${rule.maxTagCount}`);
    if (rule.formatHints) parts.push(`  Format: ${rule.formatHints}`);
    if (rule.algorithmNotes) parts.push(`  Algoritma: ${rule.algorithmNotes}`);
    if (rule.maxBaslikLength) parts.push(`  Başlık max: ${rule.maxBaslikLength} karakter`);
    if (rule.metaTitleMaxLength) parts.push(`  Meta title max: ${rule.metaTitleMaxLength}`);
    if (rule.metaDescMaxLength) parts.push(`  Meta desc max: ${rule.metaDescMaxLength}`);
    if (rule.tagHashtagLogic) parts.push(`  Etiket/Hashtag: ${rule.tagHashtagLogic}`);
    lines.push(parts.join("\n"));
  }
  return lines.join("\n");
}
