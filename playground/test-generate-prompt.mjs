/**
 * Generate API – sadece prompt'u test eder (görsel üretmez, maliyet yok)
 * Dev server çalışıyor olmalı (npm run dev)
 * Kullanım: node playground/test-generate-prompt.mjs
 *
 * Not: Bu script aslında görsel üretir – maliyet oluşur!
 * Sadece prompt yapısını görmek için optimize kullan, generate'den kaçın.
 */

const BASE = "http://localhost:3000";

async function testOptimizeOnly(prompt) {
  const res = await fetch(`${BASE}/api/remaura/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, locale: "tr", mode3DExport: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Hata");
  return data;
}

async function main() {
  console.log("--- Optimize Sonucu (OpenAI'ye gidecek prompt yapısı) ---\n");

  const prompt = process.argv[2] || "gümüş madalyon, yüksek detay";
  console.log("Girdi:", prompt, "\n");

  try {
    const result = await testOptimizeOnly(prompt);
    console.log("optimizedPrompt (tam):");
    console.log(result.optimizedPrompt);
    console.log("\n---");
    console.log("optimizedPromptTr:", result.optimizedPromptTr);
  } catch (e) {
    console.error("Hata:", e.message);
    console.log("\nDev server çalışıyor mu? npm run dev");
  }
}

main().catch(console.error);
