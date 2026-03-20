export const STYLE_KEYWORDS: Record<string, string[]> = {
  gothic: ["gothic", "gotik"],
  minimal: ["minimalist", "minimal"],
  ottoman: ["ottoman", "osmanli", "osmanlı"],
  baroque: ["baroque", "barok"],
  modern: ["modern"],
  classic: ["classic", "klasik"],
};

export function normalizeStyleTokens(input: string): string[] {
  const lower = input.toLowerCase().trim();
  if (!lower) return [];

  const tokens = lower.split(/\s+/);
  const result: string[] = [];

  for (const token of tokens) {
    for (const [normalized, keywords] of Object.entries(STYLE_KEYWORDS)) {
      if (keywords.includes(token)) {
        result.push(normalized);
        break;
      }
    }
  }

  return [...new Set(result)];
}
