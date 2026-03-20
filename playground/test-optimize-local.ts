/**
 * Optimizer'ı doğrudan çalıştırır – dev server gerekmez
 * .env.local'da OPENAI_API_KEY tanımlı olmalı
 * Kullanım: npx tsx playground/test-optimize-local.ts
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("OPENAI_API_KEY .env.local'da tanımlı değil.");
  process.exit(1);
}

async function main() {
  const { optimizePrompt } = await import("../lib/ai/remaura/prompt-optimizer");

  const prompt: string = process.argv[2] ?? "gümüş madalyon, yüksek detay";
  console.log("Girdi:", prompt, "\n");

  const result = await optimizePrompt(apiKey as string, prompt, undefined, "tr", false);
  console.log("optimizedPrompt:", result.optimizedPrompt);
  console.log("\noptimizedPromptTr:", result.optimizedPromptTr);
}

main().catch(console.error);
