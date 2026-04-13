/**
 * Anthropic API – ortak yardımcılar (blog AI, çeviri vb.)
 */

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}
