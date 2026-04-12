/**
 * Anthropic API – ortak yardımcılar (Remaura CAD koçu vb.)
 */

export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  return key;
}
