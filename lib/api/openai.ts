/**
 * OpenAI API – ortak yardımcılar
 */

export function getOpenAIApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}
