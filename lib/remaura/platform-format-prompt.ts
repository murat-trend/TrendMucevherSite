/**
 * Seçilen platform formatına göre OpenAI görsel promptuna eklenen çıktı oranı / kadraj talimatı.
 * `body.format` ile gelen anahtarlar `remaura-types` PlatformFormat ile uyumludur.
 * Arka plan / zemin: route sonunda eklenen REMAURA VISUAL SET ile aynı kalır (koyu stüdyo + dokulu yüzey).
 */
export function buildPlatformFormatPromptClause(formatKey: string): string {
  const k = formatKey.toLowerCase().trim();
  switch (k) {
    case "insta-post":
    case "instagram":
    case "insta":
      return (
        "PLATFORM OUTPUT — Instagram square post (1:1). Match a 1080×1080-class square canvas: " +
        "center the jewelry as the hero, even breathing room on all sides, keep the same dark Remaura macro set and textured dark surface — only the crop aspect is square, not a bright ecommerce reset; " +
        "no fake letterboxing; the image must read as a full square frame."
      );
    case "story-reels":
    case "tiktok":
    case "reels":
      return (
        "PLATFORM OUTPUT — TikTok / Instagram Reels or Stories (9:16). Match a 1080×1920-class vertical canvas: " +
        "tall portrait composition, place the jewelry in the central safe band (not cramped at the very top or bottom), " +
        "preserve dark Remaura studio backdrop and dark textured surface with caustics; the image must read as a full vertical frame."
      );
    case "youtube-web":
    case "youtube":
      return (
        "PLATFORM OUTPUT — YouTube / web landscape (16:9). Match a 1920×1080-class wide canvas: " +
        "horizontal cinematic framing, jewelry as clear focal subject with deliberate rule-of-thirds or lateral balance, " +
        "wide negative space still in deep charcoal/black studio tone with textured dark surface visible; the image must read as a full landscape frame."
      );
    case "portrait":
      return (
        "PLATFORM OUTPUT — Instagram portrait feed (4:5). Match a 1080×1350-class vertical-taller canvas: " +
        "between square and full story height, emphasize vertical elegance, centered or slightly upper-weighted hero, " +
        "same dark Remaura macro set and surface treatment; the image must read as a full 4:5-style portrait frame."
      );
    case "3d-export":
      return (
        "PLATFORM OUTPUT — Square 1:1 technical product frame, centered, maximum geometric clarity for downstream 3D use."
      );
    default:
      return "";
  }
}
