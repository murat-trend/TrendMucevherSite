/**
 * Platform algoritma kurallarını haftalık günceller.
 * OpenAI ile güncel sosyal medya algoritma bilgilerini araştırır.
 *
 * Kullanım: node scripts/update-platform-rules.mjs
 * Cron: Her Pazartesi 09:00 (GitHub Actions veya sistem cron)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);
const RULES_PATH = join(projectRoot, "data", "platform-algorithm-rules.json");

// .env.local'dan OPENAI_API_KEY yükle (yerel çalıştırma için)
function loadEnvLocal() {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnvLocal();

const RESEARCH_PROMPT = `Sen bir sosyal medya algoritma uzmanısın. Bugünün tarihi: ${new Date().toISOString().slice(0, 10)}.

Aşağıdaki platformlar için GÜNCEL algoritma kurallarını ve en iyi uygulamaları araştır. Bilgini 2024-2025 güncellemelerine dayandır.

Platformlar: Instagram, TikTok, Threads, Facebook, Pinterest, YouTube, LinkedIn, X (Twitter), Trendyol, Çiçek Sepeti (ciceksepeti.com), Etsy, Amazon, Shopier, Gumroad, Adobe Stock, Shutterstock, Creative Market, NEXT (Trend Mücevher platformu - görsel paylaşımda açıklama/etiket/hashtag kullanır), Google SEO.

Her platform için JSON formatında döndür. Yapı:
{
  "platforms": {
    "instagram": {
      "maxCaptionLength": 2200,
      "optimalCaptionLength": 125,
      "recommendedHashtagCount": "3-5",
      "maxHashtags": 30,
      "formatHints": "Kısa açıklama - algoritmaya uygun format ipuçları",
      "algorithmNotes": "Güncel algoritma notları - ne önemli, ne değişti",
      "tagHashtagLogic": "Hashtagler kutusu: # ile format. Nicelik+ürün+duygu karışımı. 3-5 adet."
    },
    "tiktok": { ... },
    "threads": { ... },
    "facebook": { ... },
    "pinterest": {
      "maxCaptionLength": 500,
      "optimalDescriptionLength": 100,
      "recommendedKeywordCount": "5-8",
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış 5-8 anahtar kelime. # yok."
    },
    "youtube": {
      "maxDescriptionLength": 5000,
      "optimalTitleLength": 60,
      "recommendedTagCount": "10-15",
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış 10-15 tag. SEO odaklı."
    },
    "linkedin": { ... },
    "x": {
      "maxCaptionLength": 280,
      "optimalCaptionLength": 100,
      "recommendedHashtagCount": "1-2",
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Hashtagler kutusu: # ile format. 1-2 adet (karakter sınırı)."
    },
    "trendyol": {
      "maxBaslikLength": 100,
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış arama etiketleri."
    },
    "ciceksepeti": {
      "maxBaslikLength": 100,
      "formatHints": "Hediye odaklı, ciceksepeti.com için uygun.",
      "algorithmNotes": "Hediye ve mücevher kategorilerinde arama sıralaması.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış arama etiketleri."
    },
    "etsy": {
      "maxBaslikLength": 140,
      "maxTagCount": 13,
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Etiketler kutusu: 13 tag, virgülle ayrılmış. Long-tail keyword."
    },
    "amazon": {
      "maxBaslikLength": 200,
      "formatHints": "...",
      "algorithmNotes": "...",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış anahtar kelimeler (keywords)."
    },
    "shopier": {
      "maxBaslikLength": 100,
      "formatHints": "Türkiye e-ticaret, ürün odaklı.",
      "algorithmNotes": "Shopier satıcı paneli kuralları.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış anahtar kelimeler."
    },
    "gumroad": {
      "maxBaslikLength": 100,
      "formatHints": "Dijital ürün / fiziksel ürün başlığı.",
      "algorithmNotes": "Gumroad arama ve keşif algoritması.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış tag."
    },
    "adobeStock": {
      "maxTitleLength": 100,
      "maxKeywordsCount": 50,
      "formatHints": "Görsel stok, İngilizce anahtar kelimeler.",
      "algorithmNotes": "Adobe Stock arama sıralaması.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış İngilizce keywords."
    },
    "shutterstock": {
      "maxTitleLength": 100,
      "maxKeywordsCount": 50,
      "formatHints": "Görsel stok, İngilizce anahtar kelimeler.",
      "algorithmNotes": "Shutterstock arama sıralaması.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış İngilizce keywords."
    },
    "creativeMarket": {
      "maxBaslikLength": 100,
      "formatHints": "Tasarım ürünü başlığı ve açıklama.",
      "algorithmNotes": "Creative Market keşif algoritması.",
      "tagHashtagLogic": "Etiketler kutusu: virgülle ayrılmış tag."
    },
    "next": {
      "maxCaptionLength": 500,
      "optimalCaptionLength": 150,
      "recommendedHashtagCount": "3-5",
      "formatHints": "Trend Mücevher / NEXT platformu. Görsel paylaşımda açıklama, etiket ve hashtag.",
      "algorithmNotes": "Platform içi keşif için açıklama ve etiketler önemli.",
      "tagHashtagLogic": "Açıklama: caption. Etiketler: virgülle ayrılmış. Hashtagler: # ile 3-5 adet."
    },
    "google": {
      "metaTitleMaxLength": 60,
      "metaDescMaxLength": 160,
      "formatHints": "...",
      "algorithmNotes": "..."
    }
  }
}

Her platforma tagHashtagLogic ekle: Hangi kutuya (Açıklama/Etiketler/Hashtagler) ne formatında yazılacağını belirt.
Örn: "Hashtagler kutusu: # ile format. 3-5 adet." veya "Etiketler kutusu: virgülle ayrılmış 13 tag."

SADECE JSON döndür, başka metin ekleme.`;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY ortam değişkeni gerekli.");
    process.exit(1);
  }

  console.log("Platform algoritma kuralları araştırılıyor...");

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Sen sosyal medya algoritma uzmanısın. Sadece geçerli JSON döndür.",
      },
      { role: "user", content: RESEARCH_PROMPT },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("JSON parse hatası:", e);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = existsSync(RULES_PATH)
    ? JSON.parse(readFileSync(RULES_PATH, "utf-8"))
    : { lastUpdated: "", version: 1, platforms: {} };

  const newPlatforms = parsed?.platforms && typeof parsed.platforms === "object" ? parsed.platforms : {};
  const updated = {
    lastUpdated: today,
    version: (existing.version || 1) + 1,
    platforms: { ...existing.platforms, ...newPlatforms },
  };

  writeFileSync(RULES_PATH, JSON.stringify(updated, null, 2), "utf-8");
  console.log("✓ platform-algorithm-rules.json güncellendi.");
  console.log("  Tarih:", today);
  console.log("  Versiyon:", updated.version);
  console.log("  Platform sayısı:", Object.keys(updated.platforms).length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
