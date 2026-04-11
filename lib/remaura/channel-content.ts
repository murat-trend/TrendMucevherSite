import type { JewelryAnalysisResult } from "@/lib/ai/remaura/jewelry-analyzer";
import type { ChannelTab } from "@/components/remaura/remaura-types";

/** Virgüllü metni #etiket listesine çevirir; eksik alanlarda .map hatası olmaması için güvenli */
function commaSeparatedToHashtags(s: string | undefined | null): string {
  if (s == null || !String(s).trim()) return "";
  return String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (x.startsWith("#") ? x : `#${x}`))
    .join(" ");
}

type TR = {
  remauraWorkspace: {
    channelDescPlaceholder: string;
    channelTagsPlaceholder: string;
    channelHashtagsPlaceholder: string;
    yaaySample: string;
    instaSample: string;
    facebookSample: string;
    youtubeSample: string;
    pinterestSample: string;
    xSample: string;
    etsySample: string;
    amazonHandmadeSample: string;
    instaTags: string[];
    facebookTags: string[];
    youtubeTags: string[];
    pinterestTags: string[];
    xTags: string[];
    etsyTags: string[];
    amazonTags: string[];
    yaayTags: string[];
  };
};

export function getChannelContentForPlatform(
  t: TR,
  jewelryAnalysis: JewelryAnalysisResult | null,
  copyId: string,
  tab: ChannelTab
): string {
  const r = t.remauraWorkspace;
  const j = jewelryAnalysis;

  if (j) {
    const descFromJ: Record<string, string> = {
      instagram: j.instagram?.caption ?? "",
      tiktok: j.tiktok?.caption ?? "",
      threads: j.threads?.caption ?? "",
      facebook: j.facebook?.caption ?? "",
      linkedin: j.linkedin?.caption ?? "",
      pinterest: j.pinterest?.description ?? "",
      x: j.x?.caption ?? "",
      youtube: j.youtube?.description ?? "",
      etsy: `${j.etsy?.baslik ?? ""}\n\n${j.etsy?.tagler ?? ""}`.trim(),
      amazon: j.amazon?.description ?? "",
      shopier: j.shopier?.description ?? "",
      gumroad: j.gumroad?.description ?? "",
      adobeStock: j.adobeStock?.title ?? "",
      shutterstock: j.shutterstock?.title ?? "",
      creativeMarket: j.creativeMarket?.description ?? "",
      trendyol: j.trendyol?.hikaye ?? "",
      ciceksepeti: j.ciceksepeti?.hikaye ?? "",
      next: j.next?.caption ?? r.yaaySample,
    };
    const tagsFromJ: Record<string, string> = {
      instagram: j.instagram?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      tiktok: j.tiktok?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      threads: j.threads?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      facebook: j.facebook?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      linkedin: j.linkedin?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      pinterest: j.pinterest?.tags ?? "",
      x: j.x?.hashtags?.replace(/#/g, "").replace(/\s+/g, " ") ?? "",
      youtube: j.youtube?.tags ?? "",
      etsy: j.etsy?.tagler ?? "",
      amazon: j.amazon?.keywords ?? "",
      shopier: r.etsyTags.join(" "),
      gumroad: r.etsyTags.join(" "),
      adobeStock: j.adobeStock?.keywords ?? "",
      shutterstock: j.shutterstock?.keywords ?? "",
      creativeMarket: r.etsyTags.join(" "),
      trendyol: j.trendyol?.etiketler ?? "",
      ciceksepeti: j.ciceksepeti?.etiketler ?? "",
      next: j.next?.tags ?? r.yaayTags.join(" "),
    };
    const hashFromJ: Record<string, string> = {
      instagram: j.instagram?.hashtags ?? "",
      tiktok: j.tiktok?.hashtags ?? "",
      threads: j.threads?.hashtags ?? "",
      facebook: j.facebook?.hashtags ?? "",
      linkedin: j.linkedin?.hashtags ?? "",
      pinterest: commaSeparatedToHashtags(j.pinterest?.tags),
      x: j.x?.hashtags ?? "",
      youtube: commaSeparatedToHashtags(j.youtube?.tags),
      etsy: commaSeparatedToHashtags(j.etsy?.tagler),
      amazon: commaSeparatedToHashtags(j.amazon?.keywords),
      shopier: "#mücevher #elişçiliği",
      gumroad: "#handmade #jewelry",
      adobeStock: commaSeparatedToHashtags(j.adobeStock?.keywords),
      shutterstock: commaSeparatedToHashtags(j.shutterstock?.keywords),
      creativeMarket: "#jewelry #handmade",
      trendyol: commaSeparatedToHashtags(j.trendyol?.etiketler),
      ciceksepeti: commaSeparatedToHashtags(j.ciceksepeti?.etiketler),
      next: j.next?.hashtags ?? "#mücevher #elişçiliği",
    };
    if (tab === "desc") return descFromJ[copyId] ?? r.channelDescPlaceholder;
    if (tab === "tags") return tagsFromJ[copyId] ?? r.channelTagsPlaceholder;
    return hashFromJ[copyId] ?? r.channelHashtagsPlaceholder;
  }

  const descMap: Record<string, string> = {
    instagram: r.instaSample,
    tiktok: r.instaSample,
    threads: r.instaSample,
    facebook: r.facebookSample,
    linkedin: r.youtubeSample,
    pinterest: r.pinterestSample,
    x: r.xSample,
    youtube: r.youtubeSample,
    etsy: r.etsySample,
    amazon: r.amazonHandmadeSample,
    shopier: r.etsySample,
    gumroad: r.etsySample,
    adobeStock: r.pinterestSample,
    shutterstock: r.pinterestSample,
    creativeMarket: r.etsySample,
    trendyol: r.etsySample,
    ciceksepeti: r.etsySample,
    next: r.yaaySample,
  };
  const tagsMap: Record<string, string> = {
    instagram: r.instaTags.join(" "),
    tiktok: r.instaTags.join(" "),
    threads: r.instaTags.join(" "),
    facebook: r.instaTags.join(" "),
    linkedin: r.youtubeTags.join(" "),
    pinterest: r.pinterestTags.join(" "),
    x: r.xTags.join(" "),
    youtube: r.youtubeTags.join(" "),
    etsy: r.etsyTags.join(" "),
    amazon: r.amazonTags.join(" "),
    shopier: r.etsyTags.join(" "),
    gumroad: r.etsyTags.join(" "),
    adobeStock: r.pinterestTags.join(" "),
    shutterstock: r.pinterestTags.join(" "),
    creativeMarket: r.etsyTags.join(" "),
    trendyol: r.etsyTags.join(" "),
    ciceksepeti: r.etsyTags.join(" "),
    next: r.yaayTags.join(" "),
  };
  const hashMap: Record<string, string> = {
    instagram: "#mücevher #elişçiliği #özel tasarım #altın",
    tiktok: "#mücevher #elişçiliği #özel tasarım",
    threads: "#mücevher #elişçiliği",
    facebook: "#mücevher #elişçiliği #özel tasarım",
    linkedin: "#jewelry #handmade #custom",
    pinterest: "#goldjewelry #handmade #customdesign",
    x: "#mücevher #elişçiliği",
    youtube: "#jewelry #craftsmanship #14kgold",
    etsy: "#14kgold #handmade #custom",
    amazon: "#handmade #14kgold #artisan",
    shopier: "#mücevher #elişçiliği",
    gumroad: "#handmade #jewelry",
    adobeStock: "#jewelry #gold #pendant",
    shutterstock: "#jewelry #gold #pendant",
    creativeMarket: "#jewelry #handmade",
    trendyol: "#mücevher #elişçiliği #özel tasarım",
    ciceksepeti: "#mücevher #hediye #elişçiliği",
    next: "#mücevher #elişçiliği",
  };
  if (tab === "desc") return descMap[copyId] ?? r.channelDescPlaceholder;
  if (tab === "tags") return tagsMap[copyId] ?? r.channelTagsPlaceholder;
  return hashMap[copyId] ?? r.channelHashtagsPlaceholder;
}
