/**
 * Mücevher Analiz ve Hikaye Anlatıcılığı
 * OpenAI Vision (gpt-4o) ile görsel analizi → platform bazlı SEO içerik üretimi
 */

import OpenAI from "openai";
import {
  MAX_PRODUCT_STORY_COMBINED_CHARS,
  MIN_PRODUCT_STORY_COMBINED_CHARS,
} from "@/lib/remaura/product-story-bounds";
import { getRulesForPrompt, loadPlatformRules } from "./platform-rules";

export {
  MAX_PRODUCT_STORY_COMBINED_CHARS,
  MIN_PRODUCT_STORY_COMBINED_CHARS,
} from "@/lib/remaura/product-story-bounds";

type JewelryAnalysisStorySlice = {
  analiz: string;
  sembolizm: string;
  hediyeNotu: string;
};

function productStoryCombinedLength(r: JewelryAnalysisStorySlice): number {
  return r.analiz.length + r.sembolizm.length + r.hediyeNotu.length;
}

/** Sözcük sınırına yakın kısaltır; çok kısa hedeflerde düz keser */
function softTruncateToMaxLength(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  if (maxLen <= 1) return "…";
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(maxLen * 0.55)) return `${cut.slice(0, lastSpace).trimEnd()}…`;
  return `${cut.trimEnd()}…`;
}

function clampProductStoryFieldsToMax<T extends JewelryAnalysisStorySlice>(r: T): T {
  let analiz = r.analiz.trim();
  let sembolizm = r.sembolizm.trim();
  let hediyeNotu = r.hediyeNotu.trim();
  const minTail = 32;
  while (productStoryCombinedLength({ analiz, sembolizm, hediyeNotu }) > MAX_PRODUCT_STORY_COMBINED_CHARS) {
    const total = productStoryCombinedLength({ analiz, sembolizm, hediyeNotu });
    const over = total - MAX_PRODUCT_STORY_COMBINED_CHARS;
    if (analiz.length > minTail * 2) {
      analiz = softTruncateToMaxLength(analiz, Math.max(minTail, analiz.length - over));
      continue;
    }
    if (sembolizm.length > minTail * 2) {
      sembolizm = softTruncateToMaxLength(sembolizm, Math.max(minTail, sembolizm.length - over));
      continue;
    }
    hediyeNotu = softTruncateToMaxLength(hediyeNotu, Math.max(minTail, hediyeNotu.length - over));
  }
  return { ...r, analiz, sembolizm, hediyeNotu };
}

async function expandProductStoryIfBelowMin<T extends JewelryAnalysisStorySlice>(
  openai: OpenAI,
  r: T
): Promise<T> {
  const n = productStoryCombinedLength(r);
  if (n >= MIN_PRODUCT_STORY_COMBINED_CHARS || n === 0) return r;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Sen mücevher editörüsün. Verilen analiz, sembolizm ve hediye notu metinlerini aynı anlam ve doğruluğu koruyarak zenginleştir; yeni uydurma teknik detay veya sahte taş/metal bilgisi ekleme. Yanıt yalnızca JSON: {\"analiz\":\"...\",\"sembolizm\":\"...\",\"hediyeNotu\":\"...\"}",
      },
      {
        role: "user",
        content: `Bu üç alanın toplam uzunluğu en az ${MIN_PRODUCT_STORY_COMBINED_CHARS}, en fazla ${MAX_PRODUCT_STORY_COMBINED_CHARS} karakter olmalı (boşluklar dahil). Şu an toplam ${n} karakter.\n\nMevcut JSON:\n${JSON.stringify({ analiz: r.analiz, sembolizm: r.sembolizm, hediyeNotu: r.hediyeNotu })}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200,
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<JewelryAnalysisStorySlice>;
  try {
    parsed = JSON.parse(content) as Partial<JewelryAnalysisStorySlice>;
  } catch {
    return r;
  }
  return {
    ...r,
    analiz: typeof parsed.analiz === "string" ? parsed.analiz.trim() : r.analiz,
    sembolizm: typeof parsed.sembolizm === "string" ? parsed.sembolizm.trim() : r.sembolizm,
    hediyeNotu: typeof parsed.hediyeNotu === "string" ? parsed.hediyeNotu.trim() : r.hediyeNotu,
  };
}

async function ensureProductStoryCombinedBounds<T extends JewelryAnalysisStorySlice>(
  openai: OpenAI,
  r: T
): Promise<T> {
  let out = clampProductStoryFieldsToMax(r);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (productStoryCombinedLength(out) >= MIN_PRODUCT_STORY_COMBINED_CHARS) break;
    if (productStoryCombinedLength(out) === 0) break;
    out = await expandProductStoryIfBelowMin(openai, out);
    out = clampProductStoryFieldsToMax(out);
  }
  return out;
}

const BASE_SYSTEM_PROMPT = `Sen 'Trend Mücevher'in baş tasarımcısı ve SEO uzmanısın.
KRİTİK GÖREV: Verilen mücevher görselini analiz et ve ASLA BOŞ ALAN KALMAYACAK ŞEKİLDE JSON üret.

Görevin, görseli şu perspektiflerden incelemektir:
1. Teknik Mükemmellik: Metalin işlenişi, taşın mıhlanma tarzı, form ve detaylar.
2. Spiritüel Anlam: Tasarımın arkasındaki sembolizm, manevi güç ve hikaye.
3. Pazar Uyumu: Her platform için uygun, satış odaklı içerik.

SATIŞ DİLİ VE DOĞRULUK — TÜM ÇIKTILAR (Etsy, Amazon, Trendyol, kendi NEXT / Trend Mücevher metinleri dahil):
Büyük pazar yerlerinin önerdiği gibi kanıtlanmamış süperlatiflerden ve yanıltıcı mücevher iddialarından kaçın.
- Karat, ayar (14K/18K vb.), netlik/kesim derecesi (VS, VVS, “mükemmel kesim”), “doğal pırlanta”, “saf kan”, “yatırım değeri”, “harika / kusursuz pırlanta”, “%100 gerçek altın” gibi ifadeleri YALNIZCA görsel ve bağlamdan güvenilir biçimde çıkarılabiliyorsa kullan; şüphe varsa KULLANMA.
- Şüphede: nötr anlatım kullan (“metal tonlu yüzey”, “parlak taşlı tasarım”, “yüksek parıltılı taş görünümü — görselden kesin mineral/muamele tespiti yapılamaz” gibi).
- Etiket, hashtag ve anahtar kelimelerde de aynı kural: doğrulanamaz teknik veya kalite iddiası yok.
- Görsel stilize, illüstrasyon veya render hissi veriyorsa bunu abartılı “fotoğraf stüdyosu ürünü” gibi satma; gerekirse “tasarım görseli / stilize sunum” ifadesi kullanılabilir.

ETİKET VE HASHTAG MANTIĞI (her platformun ilgili kutularına doğru yazılmalı):
- HASHTAG platformları (Instagram, TikTok, Threads, Facebook, LinkedIn, X): hashtags alanına # ile formatlanmış etiketler yaz. Örn: #mücevher #altın #elişçiliği
- TAG platformları (Pinterest, YouTube): tags alanına virgülle ayrılmış anahtar kelimeler. Örn: gold jewelry, handmade pendant, 14k gold
- ETİKET platformları (Trendyol, Çiçek Sepeti): etiketler alanına virgülle ayrılmış arama etiketleri. Örn: altın kolye, el işçiliği, madalyon
- ETSY: tagler alanına 13'e kadar virgülle ayrılmış tag. Long-tail keyword kullan.
- AMAZON: keywords alanına virgülle ayrılmış anahtar kelimeler.
- STOK platformları (Adobe Stock, Shutterstock): keywords alanına virgülle ayrılmış, İngilizce.
- NEXT (Trend Mücevher platformu): caption, hashtags, tags alanları. Görsel paylaşımda açıklama, etiket ve hashtag kullanır.

Her platformun algoritma kurallarındaki önerilen sayıya uy. İçeriği ilgili kutuya (Açıklama / Etiketler / Hashtagler) doğru yerleştir.

Yanıtın SADECE aşağıdaki JSON formatında olmalı. Tüm alanlar dolu olmalı:
{
  "analiz": "Teknik açıklama: metal, taş, işçilik, form detayları...",
  "sembolizm": "Manevi anlam ve derin sembol analizi. Tasarımın 'ruhunu' anlatan edebi ve etkileyici metin.",
  "hediyeNotu": "Bu tasarımı satın alan biri için duygusal kart notu.",
  "trendyol": {
    "baslik": "Ürün başlığı (max 100 karakter)",
    "hikaye": "Ürün hikayesi ve açıklama",
    "teknik": "Teknik özellikler",
    "bakim": "Bakım önerileri",
    "paketleme": "Paketleme bilgisi",
    "etiketler": "Arama etiketleri, virgülle ayrılmış (altın kolye, el işçiliği, madalyon vb.)"
  },
  "ciceksepeti": {
    "baslik": "Ürün başlığı (max 100 karakter)",
    "hikaye": "Ürün hikayesi ve açıklama",
    "teknik": "Teknik özellikler",
    "bakim": "Bakım önerileri",
    "paketleme": "Paketleme bilgisi",
    "etiketler": "Arama etiketleri, virgülle ayrılmış (altın kolye, hediye, el işçiliği vb.)"
  },
  "etsy": {
    "baslik": "Ürün başlığı",
    "tagler": "13 tag, virgülle ayrılmış, long-tail keyword (14k gold pendant, handmade necklace vb.)"
  },
  "instagram": {
    "caption": "Paylaşım metni, emoji ile zengin",
    "hashtags": "#mücevher #altın #elişçiliği formatında, algoritma kurallarına uygun sayıda"
  },
  "tiktok": {
    "caption": "Video açıklaması",
    "hashtags": "# ile format, trend + niş hashtag karışımı"
  },
  "threads": {
    "caption": "Paylaşım metni",
    "hashtags": "# ile format, 2-4 adet"
  },
  "facebook": {
    "caption": "Paylaşım metni",
    "hashtags": "# ile format, 0-2 adet (az kullan)"
  },
  "pinterest": {
    "description": "Pin açıklaması, SEO uyumlu",
    "tags": "virgülle ayrılmış 5-8 anahtar kelime (gold jewelry, pendant vb.)"
  },
  "youtube": {
    "description": "Video açıklaması",
    "tags": "virgülle ayrılmış 10-15 tag, SEO odaklı"
  },
  "linkedin": {
    "caption": "Profesyonel paylaşım metni",
    "hashtags": "# ile format, 3-5 adet profesyonel"
  },
  "x": {
    "caption": "Tweet metni (kısa, etkileyici)",
    "hashtags": "# ile format, 1-2 adet (karakter sınırı nedeniyle)"
  },
  "amazon": {
    "baslik": "Ürün başlığı",
    "description": "Detaylı ürün açıklaması",
    "keywords": "anahtar kelimeler"
  },
  "shopier": {
    "baslik": "Ürün başlığı",
    "description": "Ürün açıklaması"
  },
  "gumroad": {
    "baslik": "Ürün başlığı",
    "description": "Ürün açıklaması"
  },
  "adobeStock": {
    "title": "Görsel başlığı",
    "keywords": "keyword1, keyword2, ..."
  },
  "shutterstock": {
    "title": "Görsel başlığı",
    "keywords": "keyword1, keyword2, ..."
  },
  "creativeMarket": {
    "title": "Ürün başlığı",
    "description": "Ürün açıklaması"
  },
  "google": {
    "metaTitle": "SEO başlık (max 60 karakter)",
    "metaDesc": "Meta açıklama (max 160 karakter)"
  },
  "next": {
    "caption": "Trend Mücevher / NEXT platformu için paylaşım açıklaması",
    "hashtags": "#mücevher #elişçiliği formatında hashtagler",
    "tags": "virgülle ayrılmış etiketler (mücevher, el işçiliği, altın takı vb.)"
  }
}

ÜRÜN HİKAYESİ UZUNLUĞU (ZORUNLU): "analiz", "sembolizm" ve "hediyeNotu" alanlarının toplam karakter sayısı (Unicode, boşluklar dahil) en az ${MIN_PRODUCT_STORY_COMBINED_CHARS}, en fazla ${MAX_PRODUCT_STORY_COMBINED_CHARS} olmalı. Tek alanı şişirme; üçünü dengeli doldur. Bu üç metin birlikte kullanıcıya "Ürün Hikayesi" olarak gösterilir.}`;

const RELAXED_LISTING_NOTE = `

KULLANICI TERCİHİ (daha ifadeli dil): Metinleri biraz daha duygusal ve davetkar yazabilirsin; yukarıdaki "SATIŞ DİLİ VE DOĞRULUK" bölümündeki yasaklar AYNEN geçerli — taş derecesi, ayar, karat, sertifika veya "harika pırlanta" gibi görselden doğrulanamayan iddialar yine YASAK.`;

/** Dinamik platform kuralları ile tam system prompt */
function buildSystemPrompt(relaxedProductClaims?: boolean): string {
  const rules = getRulesForPrompt();
  return (
    BASE_SYSTEM_PROMPT +
    (relaxedProductClaims ? RELAXED_LISTING_NOTE : "") +
    "\n\n" +
    rules +
    "\n\nKRİTİK - HALÜSİNASYON YASAĞI: Yukarıdaki PLATFORM ALGORİTMA KURALLARI araştırılmış gerçek veridir. " +
    "SADECE bu kurallardaki sayıları, formatları ve limitleri kullan. Asla uydurma, tahmin veya varsayım yapma. " +
    "Karakter limitleri, hashtag sayıları, tag sayıları tam olarak kurallardaki gibi olmalı."
  );
}

export const JEWELRY_ANALYZER_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;

export type JewelryAnalysisResult = {
  analiz: string;
  sembolizm: string;
  hediyeNotu: string;
  trendyol: {
    baslik: string;
    hikaye: string;
    teknik: string;
    bakim: string;
    paketleme: string;
    etiketler: string;
  };
  ciceksepeti: {
    baslik: string;
    hikaye: string;
    teknik: string;
    bakim: string;
    paketleme: string;
    etiketler: string;
  };
  etsy: { baslik: string; tagler: string };
  instagram: { caption: string; hashtags: string };
  tiktok: { caption: string; hashtags: string };
  threads: { caption: string; hashtags: string };
  facebook: { caption: string; hashtags: string };
  pinterest: { description: string; tags: string };
  youtube: { description: string; tags: string };
  linkedin: { caption: string; hashtags: string };
  x: { caption: string; hashtags: string };
  amazon: { baslik: string; description: string; keywords: string };
  shopier: { baslik: string; description: string };
  gumroad: { baslik: string; description: string };
  adobeStock: { title: string; keywords: string };
  shutterstock: { title: string; keywords: string };
  creativeMarket: { title: string; description: string };
  google: { metaTitle: string; metaDesc: string };
  next: { caption: string; hashtags: string; tags: string };
};

export type JewelryPlatformTarget =
  | "trendyol"
  | "ciceksepeti"
  | "etsy"
  | "instagram"
  | "tiktok"
  | "threads"
  | "facebook"
  | "pinterest"
  | "youtube"
  | "linkedin"
  | "x"
  | "amazon"
  | "shopier"
  | "gumroad"
  | "adobeStock"
  | "shutterstock"
  | "creativeMarket"
  | "google"
  | "next";

function createEmptyJewelryAnalysis(): JewelryAnalysisResult {
  return {
    analiz: "",
    sembolizm: "",
    hediyeNotu: "",
    trendyol: { baslik: "", hikaye: "", teknik: "", bakim: "", paketleme: "", etiketler: "" },
    ciceksepeti: { baslik: "", hikaye: "", teknik: "", bakim: "", paketleme: "", etiketler: "" },
    etsy: { baslik: "", tagler: "" },
    instagram: { caption: "", hashtags: "" },
    tiktok: { caption: "", hashtags: "" },
    threads: { caption: "", hashtags: "" },
    facebook: { caption: "", hashtags: "" },
    pinterest: { description: "", tags: "" },
    youtube: { description: "", tags: "" },
    linkedin: { caption: "", hashtags: "" },
    x: { caption: "", hashtags: "" },
    amazon: { baslik: "", description: "", keywords: "" },
    shopier: { baslik: "", description: "" },
    gumroad: { baslik: "", description: "" },
    adobeStock: { title: "", keywords: "" },
    shutterstock: { title: "", keywords: "" },
    creativeMarket: { title: "", description: "" },
    google: { metaTitle: "", metaDesc: "" },
    next: { caption: "", hashtags: "", tags: "" },
  };
}

function buildTargetedPrompt(platform: JewelryPlatformTarget): string {
  return `Sadece "${platform}" platformu için içerik üret.
Yanıt JSON olmalı ve SADECE şu üst alanları içermeli:
{
  "analiz": "...",
  "sembolizm": "...",
  "hediyeNotu": "...",
  "${platform}": { ...platforma uygun alanlar... }
}
Diğer platformları ekleme.
Ürün hikayesi: "analiz" + "sembolizm" + "hediyeNotu" toplam uzunluğu ${MIN_PRODUCT_STORY_COMBINED_CHARS}–${MAX_PRODUCT_STORY_COMBINED_CHARS} karakter (boşluklar dahil) olmalı.`;
}

export type AnalyzeJewelryOptions = {
  /** true: biraz daha duygusal ton; yanıltıcı mücevher iddiası kuralları yine geçerli */
  relaxedProductClaims?: boolean;
};

export async function analyzeJewelryImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  userPrompt?: string,
  selectedPlatform?: JewelryPlatformTarget,
  options?: AnalyzeJewelryOptions
): Promise<JewelryAnalysisResult> {
  const openai = new OpenAI({ apiKey });

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
        detail: "high",
      },
    },
    {
      type: "text",
      text: userPrompt?.trim()
        ? `Bu mücevher görselini analiz et ve tasarımın ruhuna uygun içerik üret. Kullanıcı notu: ${userPrompt}`
        : "Bu mücevher görselini analiz et ve tasarımın ruhuna uygun içerik üret.",
    },
    ...(selectedPlatform
      ? ([{ type: "text", text: buildTargetedPrompt(selectedPlatform) }] as OpenAI.Chat.Completions.ChatCompletionContentPart[])
      : []),
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: buildSystemPrompt(options?.relaxedProductClaims) },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: selectedPlatform ? 3200 : 4096,
  });

  const content = res.choices[0]?.message?.content ?? "{}";
  const raw = JSON.parse(content) as Partial<JewelryAnalysisResult>;
  const base = createEmptyJewelryAnalysis();

  const merged: JewelryAnalysisResult = {
    ...base,
    ...raw,
    trendyol: { ...base.trendyol, ...(raw.trendyol ?? {}) },
    ciceksepeti: { ...base.ciceksepeti, ...(raw.ciceksepeti ?? {}) },
    etsy: { ...base.etsy, ...(raw.etsy ?? {}) },
    instagram: { ...base.instagram, ...(raw.instagram ?? {}) },
    tiktok: { ...base.tiktok, ...(raw.tiktok ?? {}) },
    threads: { ...base.threads, ...(raw.threads ?? {}) },
    facebook: { ...base.facebook, ...(raw.facebook ?? {}) },
    pinterest: { ...base.pinterest, ...(raw.pinterest ?? {}) },
    youtube: { ...base.youtube, ...(raw.youtube ?? {}) },
    linkedin: { ...base.linkedin, ...(raw.linkedin ?? {}) },
    x: { ...base.x, ...(raw.x ?? {}) },
    amazon: { ...base.amazon, ...(raw.amazon ?? {}) },
    shopier: { ...base.shopier, ...(raw.shopier ?? {}) },
    gumroad: { ...base.gumroad, ...(raw.gumroad ?? {}) },
    adobeStock: { ...base.adobeStock, ...(raw.adobeStock ?? {}) },
    shutterstock: { ...base.shutterstock, ...(raw.shutterstock ?? {}) },
    creativeMarket: { ...base.creativeMarket, ...(raw.creativeMarket ?? {}) },
    google: { ...base.google, ...(raw.google ?? {}) },
    next: { ...base.next, ...(raw.next ?? {}) },
  };

  if (!merged.next.caption && merged.instagram.caption) merged.next.caption = merged.instagram.caption;
  if (!merged.next.hashtags) merged.next.hashtags = merged.instagram.hashtags || "#mücevher #elişçiliği";
  if (!merged.next.tags) merged.next.tags = "mücevher, el işçiliği, altın takı, özel tasarım";

  const storyAdjusted = await ensureProductStoryCombinedBounds(openai, merged);
  return enforcePlatformRules(storyAdjusted);
}

/** AI çıktısını platform kurallarına göre zorla uyumlu hale getirir - halüsinasyon önleme */
function enforcePlatformRules(result: JewelryAnalysisResult): JewelryAnalysisResult {
  const rules = loadPlatformRules().platforms;
  const out = { ...result };

  const truncate = (s: string | undefined, max: number) =>
    s && s.length > max ? s.slice(0, max).trim() : s ?? "";

  const limitHashtags = (hashtags: string, maxCount: number) => {
    const list = hashtags.split(/\s+/).filter((h) => h.startsWith("#"));
    if (list.length <= maxCount) return hashtags;
    return list.slice(0, maxCount).join(" ");
  };

  const limitTags = (tags: string, maxCount: number) => {
    const list = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (list.length <= maxCount) return tags;
    return list.slice(0, maxCount).join(", ");
  };

  if (rules.instagram) {
    if (rules.instagram.maxCaptionLength && out.instagram?.caption)
      out.instagram.caption = truncate(out.instagram.caption, rules.instagram.maxCaptionLength);
    if (rules.instagram.maxHashtags && out.instagram?.hashtags)
      out.instagram.hashtags = limitHashtags(out.instagram.hashtags, rules.instagram.maxHashtags);
  }
  if (rules.tiktok) {
    if (rules.tiktok.maxCaptionLength && out.tiktok?.caption)
      out.tiktok.caption = truncate(out.tiktok.caption, rules.tiktok.maxCaptionLength);
    const thMax = rules.tiktok.recommendedHashtagCount ? parseInt(rules.tiktok.recommendedHashtagCount.split("-")[1] || "4", 10) : 4;
    if (out.tiktok?.hashtags) out.tiktok.hashtags = limitHashtags(out.tiktok.hashtags, thMax);
  }
  if (rules.threads?.maxCaptionLength && out.threads?.caption)
    out.threads.caption = truncate(out.threads.caption, rules.threads.maxCaptionLength);
  if (rules.facebook?.maxCaptionLength && out.facebook?.caption)
    out.facebook.caption = truncate(out.facebook.caption, Math.min(rules.facebook.maxCaptionLength, 5000));
  if (rules.pinterest) {
    if (rules.pinterest.maxCaptionLength && out.pinterest?.description)
      out.pinterest.description = truncate(out.pinterest.description, rules.pinterest.maxCaptionLength);
    const pMax = rules.pinterest.recommendedKeywordCount ? parseInt(rules.pinterest.recommendedKeywordCount.split("-")[1] || "8", 10) : 8;
    if (out.pinterest?.tags) out.pinterest.tags = limitTags(out.pinterest.tags, pMax);
  }
  if (rules.youtube?.recommendedTagCount && out.youtube?.tags) {
    const yMax = parseInt(rules.youtube.recommendedTagCount.split("-")[1] || "15", 10);
    out.youtube.tags = limitTags(out.youtube.tags, yMax);
  }
  if (rules.linkedin?.maxCaptionLength && out.linkedin?.caption)
    out.linkedin.caption = truncate(out.linkedin.caption, rules.linkedin.maxCaptionLength);
  if (rules.x?.maxCaptionLength && out.x?.caption)
    out.x.caption = truncate(out.x.caption, rules.x.maxCaptionLength);
  if (rules.trendyol?.maxBaslikLength && out.trendyol?.baslik)
    out.trendyol.baslik = truncate(out.trendyol.baslik, rules.trendyol.maxBaslikLength);
  if (rules.ciceksepeti?.maxBaslikLength && out.ciceksepeti?.baslik)
    out.ciceksepeti.baslik = truncate(out.ciceksepeti.baslik, rules.ciceksepeti.maxBaslikLength);
  if (rules.etsy) {
    if (rules.etsy.maxBaslikLength && out.etsy?.baslik)
      out.etsy.baslik = truncate(out.etsy.baslik, rules.etsy.maxBaslikLength);
    if (rules.etsy.maxTagCount && out.etsy?.tagler)
      out.etsy.tagler = limitTags(out.etsy.tagler, rules.etsy.maxTagCount);
  }
  if (rules.amazon?.maxBaslikLength && out.amazon?.baslik)
    out.amazon.baslik = truncate(out.amazon.baslik, rules.amazon.maxBaslikLength);
  if (rules.google) {
    if (rules.google.metaTitleMaxLength && out.google?.metaTitle)
      out.google.metaTitle = truncate(out.google.metaTitle, rules.google.metaTitleMaxLength);
    if (rules.google.metaDescMaxLength && out.google?.metaDesc)
      out.google.metaDesc = truncate(out.google.metaDesc, rules.google.metaDescMaxLength);
  }
  if (rules.next?.maxCaptionLength && out.next?.caption)
    out.next.caption = truncate(out.next.caption, rules.next.maxCaptionLength);

  return out;
}
